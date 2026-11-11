import AppKit
import AVFoundation
import ServiceManagement

@MainActor
final class AppDelegate: NSObject, NSApplicationDelegate {
	private let model = NotchModel()
	private var panel: NotchPanel?
	private var hotkey: Hotkey?
	private var statusItem: NSStatusItem?
	private var recorder: Recorder?
	private var meter: Timer?
	private var answerMic: AVAudioRecorder?
	private var askID: String?
	private var compiling = 0
	private var job: Job?
	private var escapeArmed = Date.distantPast

	func applicationDidFinishLaunching(_ notification: Notification) {
		Paths.prepare()
		panel = NotchPanel(model: model, onTap: { [weak self] in self?.tapped() }, onAnswer: { [weak self] in self?.answer($0) }, onCancel: { [weak self] in self?.cancel() })
		hotkey = makeHotkey()
		setUpMenu()
		askPermissions()
		try? SMAppService.mainApp.register()
		greet()

		let center = DistributedNotificationCenter.default()
		center.addObserver(forName: Notify.ask, object: nil, queue: .main) { [weak self] note in
			let info = note.userInfo as? [String: String] ?? [:]
			MainActor.assumeIsolated { self?.asked(info) }
		}
		NSAppleEventManager.shared().setEventHandler(self, andSelector: #selector(handleURL(_:reply:)), forEventClass: AEEventClass(kInternetEventClass), andEventID: AEEventID(kAEGetURL))
	}

	func applicationShouldHandleReopen(_ sender: NSApplication, hasVisibleWindows flag: Bool) -> Bool {
		openWanks()
		return false
	}

	/// `wank://record` starts or finishes a recording; Wanker's "Have a wank" button sends it.
	@objc private func handleURL(_ event: NSAppleEventDescriptor, reply: NSAppleEventDescriptor) {
		guard let url = event.paramDescriptor(forKeyword: keyDirectObject)?.stringValue.flatMap(URL.init(string:)),
		      url.scheme == "wank", url.host == "record"
		else { return }
		toggle()
	}

	private func openWanks() {
		if let url = Wanker.automationsURL { NSWorkspace.shared.open(url) }
	}

	private func makeHotkey() -> Hotkey {
		Hotkey(action: { [weak self] in self?.toggle() }, onEscape: { [weak self] in self?.escape() })
	}

	/// Esc once answers a question with "no". Recording and building need Esc twice, so an Esc
	/// pressed for some other app (often part of the demo itself) never throws work away.
	private func escape() {
		switch model.phase {
		case .question, .listening:
			cancel()
		case .recording, .working:
			if Date() < escapeArmed {
				cancel()
			} else {
				escapeArmed = Date().addingTimeInterval(2)
				model.flash("Press esc again to stop the wank")
			}
		default:
			break
		}
	}

	private func cancel() {
		escapeArmed = .distantPast
		if recorder != nil {
			finish(discard: true)
			model.show(.cancelled)
			return
		}
		guard let job else { return }
		self.job = nil
		askID = nil
		answerMic?.stop()
		answerMic = nil
		stopMeter()
		model.show(.cancelled)
		Task.detached {
			job.cancel()
			Pipeline.undo(job.capture)
		}
	}

	private func toggle() {
		if answerMic != nil { return finishAnswer() }
		if case .question = model.phase { return startAnswer() }
		recorder == nil ? start() : finish()
	}

	private func asked(_ info: [String: String]) {
		guard let id = info["id"] else { return }
		if info["closed"] != nil {
			guard askID == id else { return }
			askID = nil
			answerMic?.stop()
			answerMic = nil
			stopMeter()
			model.show(compiling > 0 ? .working("No answer. Finishing it myself…") : .hidden)
			return
		}
		guard recorder == nil, answerMic == nil else { return }
		askID = id
		model.log("Asked: \(info["question"] ?? "")")
		model.show(.question(info["question"] ?? "", (info["options"] ?? "").split(separator: "\n").map(String.init)))
	}

	private func answer(_ text: String) {
		guard let id = askID else { return }
		askID = nil
		try? text.write(to: Paths.answers.appendingPathComponent(id), atomically: true, encoding: .utf8)
		model.show(.working("Got it, carrying on…"))
		model.log("You: \(text)")
	}

	private func startAnswer() {
		let url = FileManager.default.temporaryDirectory.appendingPathComponent("showme-answer.wav")
		guard let mic = try? AVAudioRecorder(url: url, settings: Recorder.audioSettings) else { return }
		mic.isMeteringEnabled = true
		guard mic.record() else { return }
		answerMic = mic
		model.show(.listening)
		startMeter { Recorder.level(of: mic) }
	}

	private func finishAnswer() {
		guard let mic = answerMic else { return }
		answerMic = nil
		stopMeter()
		mic.stop()
		model.show(.working("Getting a grip on what you said…"))
		Task {
			let said = ((try? await transcribe(mic.url, locale: Settings.locale)) ?? []).map(\.text).joined(separator: " ")
			answer(said.isEmpty ? "The user answered out loud, but nothing was heard. Go with your best guess." : said)
		}
	}

	private func start() {
		let stamp = ISO8601DateFormatter().string(from: Date()).replacingOccurrences(of: ":", with: "-")
		let r = Recorder(dir: Paths.captures.appendingPathComponent(stamp))
		recorder = r
		model.show(.recording)
		startMeter { r.level }
		Task {
			do {
				try await r.start()
			} catch {
				guard recorder === r else { return }
				stopMeter()
				recorder = nil
				await r.stop()
				try? FileManager.default.removeItem(at: r.dir)
				model.show(.attention("Can't record", error.localizedDescription), link: URL(string: "x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture"))
			}
		}
	}

	private func finish(discard: Bool = false) {
		guard let r = recorder else { return }
		recorder = nil
		stopMeter()
		let tooShort = r.elapsed < 2
		model.clearActivity()
		model.show(discard || tooShort ? .hidden : .working("Getting a grip on what you said…"))
		Task {
			await r.stop()
			if discard || tooShort {
				try? FileManager.default.removeItem(at: r.dir)
				return
			}
			compiling += 1
			defer { compiling -= 1 }
			let job = Job(capture: r.dir)
			self.job = job
			do {
				let result = try await Pipeline.process(r.dir, job: job) { line in
					Task { @MainActor in if !job.isCancelled { self.model.log(line) } }
				}
				if self.job === job { self.job = nil }
				guard recorder == nil else { return }
				if result.status == "cancelled" {
					model.show(.cancelled)
					return
				}
				let link = result.id.flatMap(Wanker.automationURL) ?? r.dir.appendingPathComponent("report.html")
				result.status == "ready" ? model.show(.done(result.title, result.detail), link: link) : keep(result.title, result.detail, link: link)
			} catch is Cancelled {
				try? FileManager.default.removeItem(at: r.dir)
			} catch {
				if self.job === job { self.job = nil }
				guard recorder == nil, !job.isCancelled else { return }
				let report = r.dir.appendingPathComponent("report.html")
				keep("Couldn't finish", error.localizedDescription, link: FileManager.default.fileExists(atPath: report.path) ? report : r.dir)
			}
		}
	}

	private func startMeter(_ level: @escaping () -> Float) {
		meter = Timer.scheduledTimer(withTimeInterval: 0.1, repeats: true) { [weak self] _ in
			MainActor.assumeIsolated { self?.model.level = CGFloat(level()) }
		}
	}

	private func stopMeter() {
		meter?.invalidate()
		meter = nil
		model.level = 0
	}

	private func tapped() {
		switch model.phase {
		case .recording:
			finish()
		case .listening:
			finishAnswer()
		case .done, .attention:
			if let link = model.link { NSWorkspace.shared.open(link) }
			try? FileManager.default.removeItem(at: Paths.pending)
			model.show(.hidden)
		default:
			break
		}
	}

	private func askPermissions() {
		let prompt = [kAXTrustedCheckOptionPrompt.takeUnretainedValue() as String: true] as CFDictionary
		_ = AXIsProcessTrustedWithOptions(prompt)
		AVCaptureDevice.requestAccess(for: .audio) { _ in }
		if !CGPreflightScreenCaptureAccess() { CGRequestScreenCaptureAccess() }
	}

	/// A result that needs the user stays in the notch until clicked, even across restarts.
	private func keep(_ title: String, _ detail: String, link: URL?) {
		model.show(.attention(title, detail), link: link)
		let kept = ["title": title, "detail": detail, "link": link?.absoluteString ?? ""]
		try? JSONEncoder().encode(kept).write(to: Paths.pending)
	}

	/// The app is invisible when idle, so say once that it is running, or what it still needs.
	private func greet() {
		var missing: [String] = []
		if !AXIsProcessTrusted() { missing.append("Accessibility") }
		if !CGPreflightScreenCaptureAccess() { missing.append("Screen Recording") }
		if AVCaptureDevice.authorizationStatus(for: .audio) == .denied { missing.append("Microphone") }
		if missing.isEmpty, let data = try? Data(contentsOf: Paths.pending), let kept = try? JSONDecoder().decode([String: String].self, from: data) {
			model.show(.attention(kept["title"] ?? "", kept["detail"] ?? ""), link: kept["link"].flatMap(URL.init(string:)))
		} else if missing.isEmpty {
			model.show(.done("Wank is ready", "Double-tap right ⌥ for a wank"))
		} else {
			if !AXIsProcessTrusted() { waitForAccessibility() }
			model.show(
				.attention("Allow \(missing.joined(separator: ", "))", "In System Settings → Privacy & Security"),
				link: URL(string: "x-apple.systempreferences:com.apple.preference.security?Privacy")
			)
		}
	}

	/// Key monitors made before the grant never fire, so remake them once it lands.
	private func waitForAccessibility() {
		Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { [weak self] timer in
			MainActor.assumeIsolated {
				guard AXIsProcessTrusted() else { return }
				timer.invalidate()
				self?.hotkey = self?.makeHotkey()
				self?.greet()
			}
		}
	}

	private func setUpMenu() {
		let item = NSStatusBar.system.statusItem(withLength: NSStatusItem.squareLength)
		item.button?.image = NSImage(systemSymbolName: "wand.and.rays", accessibilityDescription: "Wank")
		let menu = NSMenu()
		menu.addItem(NSMenuItem(title: "Start or finish a wank (double-tap right ⌥)", action: #selector(menuToggle), keyEquivalent: ""))
		menu.addItem(NSMenuItem(title: "Abandon this wank", action: #selector(menuDiscard), keyEquivalent: ""))
		menu.addItem(NSMenuItem(title: "Show last result", action: #selector(menuLastReport), keyEquivalent: ""))
		menu.addItem(NSMenuItem(title: "Open Wanks in Wanker", action: #selector(menuOpen), keyEquivalent: ""))
		menu.addItem(.separator())
		menu.addItem(NSMenuItem(title: "Quit Wank", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q"))
		for entry in menu.items where entry.action != #selector(NSApplication.terminate(_:)) { entry.target = self }
		item.menu = menu
		statusItem = item
	}

	@objc private func menuToggle() { toggle() }
	@objc private func menuDiscard() { finish(discard: true) }
	@objc private func menuLastReport() {
		let captures = (try? FileManager.default.contentsOfDirectory(at: Paths.captures, includingPropertiesForKeys: nil)) ?? []
		let reports = captures.map { $0.appendingPathComponent("report.html") }.filter { FileManager.default.fileExists(atPath: $0.path) }
		if let last = reports.max(by: { $0.path < $1.path }) { NSWorkspace.shared.open(last) }
	}

	@objc private func menuOpen() { openWanks() }
}
