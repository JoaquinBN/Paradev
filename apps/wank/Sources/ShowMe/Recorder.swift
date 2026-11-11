import AppKit
import AVFoundation
import CoreImage
import ScreenCaptureKit
import ShowMeCore
import UniformTypeIdentifiers

/// Records voice, every display at up to 2 fps (saving only the one under the
/// mouse, and only when it changes), and each click and app switch.
final class Recorder: NSObject, SCStreamOutput {
	let dir: URL
	private let began = Date()
	private let queue = DispatchQueue(label: "showme.recorder")
	private let ci = CIContext()
	private var streams: [SCStream] = []
	private var displayOf: [ObjectIdentifier: CGDirectDisplayID] = [:]
	private var latest: [CGDirectDisplayID: CGImage] = [:]
	private var lastSaved = -1.0
	private var frames: [Frame] = []
	private var events: [Event] = []
	private var audio: AVAudioRecorder?
	private var monitors: [Any] = []
	private var observers: [NSObjectProtocol] = []
	private var stopped = false

	init(dir: URL) { self.dir = dir }

	var elapsed: Double { Date().timeIntervalSince(began) }

	var level: Float { audio.map(Self.level(of:)) ?? 0 }

	static func level(of audio: AVAudioRecorder) -> Float {
		audio.updateMeters()
		return max(0, min(1, (audio.averagePower(forChannel: 0) + 50) / 50))
	}

	static let audioSettings: [String: Any] = [
		AVFormatIDKey: kAudioFormatLinearPCM, AVSampleRateKey: 16_000, AVNumberOfChannelsKey: 1,
		AVLinearPCMBitDepthKey: 16, AVLinearPCMIsFloatKey: false, AVLinearPCMIsBigEndianKey: false,
	]

	@MainActor func start() async throws {
		try FileManager.default.createDirectory(at: dir.appendingPathComponent("frames"), withIntermediateDirectories: true)
		try writeContext()
		let mic = try AVAudioRecorder(url: dir.appendingPathComponent("audio.wav"), settings: Self.audioSettings)
		mic.isMeteringEnabled = true
		guard mic.record() else { throw ShowMeError("The microphone did not start. Allow it in System Settings → Privacy → Microphone.") }
		audio = mic

		let content = try await SCShareableContent.excludingDesktopWindows(false, onScreenWindowsOnly: true)
		let mine = content.applications.filter { $0.processID == getpid() }
		for display in content.displays {
			let config = SCStreamConfiguration()
			let scale = min(2, 1568 / Double(display.width))
			config.width = Int(Double(display.width) * scale)
			config.height = Int(Double(display.height) * scale)
			config.minimumFrameInterval = CMTime(value: 1, timescale: 2)
			config.showsCursor = true
			config.queueDepth = 3
			let filter = SCContentFilter(display: display, excludingApplications: mine, exceptingWindows: [])
			let stream = SCStream(filter: filter, configuration: config, delegate: nil)
			try stream.addStreamOutput(self, type: .screen, sampleHandlerQueue: queue)
			queue.sync { displayOf[ObjectIdentifier(stream)] = display.displayID }
			try await stream.startCapture()
			streams.append(stream)
		}
		if stopped { return await stopStreams() }

		if let m = NSEvent.addGlobalMonitorForEvents(matching: .leftMouseDown, handler: { [weak self] _ in self?.clicked() }) {
			monitors.append(m)
		}
		observers.append(NSWorkspace.shared.notificationCenter.addObserver(forName: NSWorkspace.didActivateApplicationNotification, object: nil, queue: .main) { [weak self] note in
			guard let self, let app = note.userInfo?[NSWorkspace.applicationUserInfoKey] as? NSRunningApplication else { return }
			let t = self.elapsed
			DispatchQueue.global().async {
				let text = Accessibility.describe(app: app)
				self.queue.async { self.events.append(Event(t: t, kind: "app", text: text)) }
			}
		})
	}

	@MainActor func stop() async {
		stopped = true
		monitors.forEach(NSEvent.removeMonitor)
		monitors = []
		observers.forEach(NSWorkspace.shared.notificationCenter.removeObserver)
		observers = []
		audio?.stop()
		await stopStreams()
		let (frames, events) = queue.sync { (self.frames, self.events.sorted { $0.t < $1.t }) }
		let encoder = JSONEncoder()
		encoder.outputFormatting = .prettyPrinted
		try? encoder.encode(frames).write(to: dir.appendingPathComponent("frames.json"))
		try? encoder.encode(events).write(to: dir.appendingPathComponent("events.json"))
	}

	@MainActor private func stopStreams() async {
		for stream in streams { try? await stream.stopCapture() }
		streams = []
	}

	func stream(_ stream: SCStream, didOutputSampleBuffer buffer: CMSampleBuffer, of type: SCStreamOutputType) {
		guard type == .screen,
		      let info = (CMSampleBufferGetSampleAttachmentsArray(buffer, createIfNecessary: false) as? [[SCStreamFrameInfo: Any]])?.first,
		      (info[.status] as? Int).flatMap(SCFrameStatus.init(rawValue:)) == .complete,
		      let pixels = buffer.imageBuffer,
		      let display = displayOf[ObjectIdentifier(stream)],
		      let image = ci.createCGImage(CIImage(cvPixelBuffer: pixels), from: CGRect(x: 0, y: 0, width: CVPixelBufferGetWidth(pixels), height: CVPixelBufferGetHeight(pixels)))
		else { return }
		latest[display] = image
		if display == Self.display(at: Self.mouse), elapsed - lastSaved >= 1 { _ = save(display) }
	}

	private func clicked() {
		let t = elapsed
		let point = Self.mouse
		let display = Self.display(at: point)
		queue.async {
			let frame = self.save(display)
			DispatchQueue.global().async {
				let text = Accessibility.describeElement(at: point)
				self.queue.async { self.events.append(Event(t: t, kind: "click", text: text, frame: frame)) }
			}
		}
	}

	/// Runs on `queue`.
	private func save(_ display: CGDirectDisplayID) -> String? {
		guard let image = latest[display] else { return nil }
		let t = elapsed
		let name = String(format: "%07d.jpg", Int(t * 1000))
		guard let dest = CGImageDestinationCreateWithURL(dir.appendingPathComponent("frames/\(name)") as CFURL, UTType.jpeg.identifier as CFString, 1, nil) else { return nil }
		CGImageDestinationAddImage(dest, image, [kCGImageDestinationLossyCompressionQuality: 0.6] as CFDictionary)
		guard CGImageDestinationFinalize(dest) else { return nil }
		if frames.last?.file != name { frames.append(Frame(t: t, file: name)) }
		lastSaved = t
		return name
	}

	private static var mouse: CGPoint { CGEvent(source: nil)?.location ?? .zero }

	private static func display(at point: CGPoint) -> CGDirectDisplayID {
		var id: CGDirectDisplayID = 0
		var count: UInt32 = 0
		CGGetDisplaysWithPoint(point, 1, &id, &count)
		return id
	}

	@MainActor private func writeContext() throws {
		let context: [String: Any] = [
			"startedAt": ISO8601DateFormatter().string(from: began),
			"localTime": DateFormatter.localizedString(from: began, dateStyle: .full, timeStyle: .short),
			"timezone": TimeZone.current.identifier,
			"user": NSFullUserName(),
			"home": NSHomeDirectory(),
			"frontApp": NSWorkspace.shared.frontmostApplication.map(Accessibility.describe(app:)) ?? "",
			"displays": NSScreen.screens.map { "\($0.localizedName) \(Int($0.frame.width))x\(Int($0.frame.height))" },
		]
		try JSONSerialization.data(withJSONObject: context, options: [.prettyPrinted, .sortedKeys])
			.write(to: dir.appendingPathComponent("context.json"))
	}
}
