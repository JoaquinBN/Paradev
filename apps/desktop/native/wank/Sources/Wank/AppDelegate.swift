import AppKit
import AVFoundation
import WankCore

@MainActor
final class AppDelegate: NSObject, NSApplicationDelegate {
	private let model = NotchModel()
	private var panel: NotchPanel?
	private var hotkey: Hotkey?
	private var recorder: Recorder?
	private var meter: Timer?
	private var answerMic: AVAudioRecorder?
	private var askID: String?
	private var compiling = 0
	private var job: Job?
	private var escapeArmed = Date.distantPast
	private var waitingForAccessibility = false

	func applicationDidFinishLaunching(_ notification: Notification) {
		Paths.prepare()
		panel = NotchPanel(model: model, onTap: { [weak self] in self?.tapped() }, onAnswer: { [weak self] in self?.answer($0) }, onCancel: { [weak self] in self?.cancel() })
		hotkey = makeHotkey()
		restoreKeptResult()
		Inbox.listen { [weak self] message in self?.received(message) }
		DistributedNotificationCenter.default().addObserver(forName: Notify.ask, object: nil, queue: .main) { [weak self] note in
			let info = note.userInfo as? [String: String] ?? [:]
			MainActor.assumeIsolated { self?.asked(info) }
		}
	}

	private func received(_ message: [String: String]) {
		switch message["type"] {
		case "record":
			recorder == nil ? start(screen: true) : finish()
		case "organization":
			Wanker.organizationId = message["id"]
		default:
			break
		}
	}

	private func makeHotkey() -> Hotkey {
		Hotkey(onTap: { [weak self] in self?.tap($0) }, onEscape: { [weak self] in self?.escape() })
	}

	/// One tap records your voice; two taps record your voice and screen. While recording, either one finishes.
	private func tap(_ tap: TapCounter.Tap) {
		if answerMic != nil { return finishAnswer() }
		if case .question = model.phase { return startAnswer() }
		if recorder != nil { return finish() }
		start(screen: tap == .double)
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
		let url = FileManager.default.temporaryDirectory.appendingPathComponent("wank-answer.wav")
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

	private func start(screen: Bool) {
		let stamp = ISO8601DateFormatter().string(from: Date()).replacingOccurrences(of: ":", with: "-")
		let r = Recorder(dir: Paths.captures.appendingPathComponent(stamp), screen: screen)
		recorder = r
		model.show(.recording)
		startMeter { r.level }
		if screen { promptForAccessibility() }
		Task {
			do {
				try await r.start()
			} catch {
				guard recorder === r else { return }
				stopMeter()
				recorder = nil
				await r.stop()
				try? FileManager.default.removeItem(at: r.dir)
				model.show(.attention("Can't record", error.localizedDescription), link: URL(string: "x-apple.systempreferences:com.apple.preference.security?Privacy"))
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

	/// A result that needs the user stays in the notch until clicked, even across restarts.
	private func keep(_ title: String, _ detail: String, link: URL?) {
		model.show(.attention(title, detail), link: link)
		let kept = ["title": title, "detail": detail, "link": link?.absoluteString ?? ""]
		try? JSONEncoder().encode(kept).write(to: Paths.pending)
	}

	private func restoreKeptResult() {
		guard let data = try? Data(contentsOf: Paths.pending),
		      let kept = try? JSONDecoder().decode([String: String].self, from: data)
		else { return }
		model.show(.attention(kept["title"] ?? "", kept["detail"] ?? ""), link: kept["link"].flatMap(URL.init(string:)))
	}

	/// Click names need Accessibility. Key monitors made before the grant never fire, so they're remade once it lands.
	private func promptForAccessibility() {
		let prompt = [kAXTrustedCheckOptionPrompt.takeUnretainedValue() as String: true] as CFDictionary
		guard !AXIsProcessTrustedWithOptions(prompt), !waitingForAccessibility else { return }
		waitingForAccessibility = true
		Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { [weak self] timer in
			MainActor.assumeIsolated {
				guard AXIsProcessTrusted() else { return }
				timer.invalidate()
				self?.waitingForAccessibility = false
				self?.hotkey = self?.makeHotkey()
			}
		}
	}
}
