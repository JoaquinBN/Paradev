import Foundation
import WankCore

struct CompileResult: Codable {
	var status: String
	var title: String
	var detail: String
	var id: String?
}

/// One build in flight. Cancelling stops the agent and everything it started.
final class Job: @unchecked Sendable {
	let capture: URL
	init(capture: URL) { self.capture = capture }
	private let lock = NSLock()
	private var process: Process?
	private var cancelled = false

	var isCancelled: Bool { lock.withLock { cancelled } }

	func attach(_ p: Process) {
		lock.withLock { process = p }
	}

	func cancel() {
		let p: Process? = lock.withLock {
			cancelled = true
			return process
		}
		if let p, p.isRunning { killTree(p.processIdentifier) }
	}
}

struct Cancelled: Error {}

/// Capture folder → transcript → timeline → the compiler agent → an installed automation.
enum Pipeline {
	static let frameBudget = 40

	static func process(_ capture: URL, job: Job, progress: @escaping (String) -> Void) async throws -> CompileResult {
		let transcriptURL = capture.appendingPathComponent("transcript.json")
		let segments: [Segment]
		if let data = try? Data(contentsOf: transcriptURL) {
			segments = try JSONDecoder().decode([Segment].self, from: data)
		} else {
			progress("Getting a grip on what you said…")
			// No mic, no speech model, or silence: the screens still say what they did.
			segments = (try? await transcribe(capture.appendingPathComponent("audio.wav"), locale: Settings.locale)) ?? []
			try JSONEncoder().encode(segments).write(to: transcriptURL)
		}
		let frames = (try? JSONDecoder().decode([Frame].self, from: Data(contentsOf: capture.appendingPathComponent("frames.json")))) ?? []
		let events = (try? JSONDecoder().decode([Event].self, from: Data(contentsOf: capture.appendingPathComponent("events.json")))) ?? []
		guard !segments.isEmpty || !events.isEmpty || !frames.isEmpty else {
			throw WankError("I didn't catch anything. Talk while you show me, or tap once and just say it.")
		}
		let heard = segments.map(\.text).joined(separator: " ")
		progress(heard.isEmpty ? "Silent wank: reading your screens" : "Heard: “\(heard.count > 90 ? heard.prefix(89) + "…" : heard)”")
		let picked = selectFrames(frames, events: events, segments: segments, budget: frameBudget)
		progress("\(picked.count) screenshots, \(events.count) clicks and app switches")
		try renderTimeline(title: "Wank capture \(capture.lastPathComponent)", segments: segments, events: events, frames: picked)
			.write(to: capture.appendingPathComponent("timeline.md"), atomically: true, encoding: .utf8)
		progress("Getting a feel for what you want…")
		if job.isCancelled { throw Cancelled() }
		let voiceOnly = frames.isEmpty && events.isEmpty
		return try await Task.detached { try compile(capture, heard: heard, voiceOnly: voiceOnly, job: job, progress: progress) }.value
	}

	private static func compile(_ capture: URL, heard: String, voiceOnly: Bool, job: Job, progress: @escaping (String) -> Void) throws -> CompileResult {
		var env = Wanker.environment()
		env["WANK_CAPTURE"] = capture.path
		guard let claude = which("claude", env: env) else { throw WankError("Claude Code is not installed: `claude` is not on your PATH.") }
		guard let superset = Wanker.cli(env: env) else { throw WankError("The Wanker CLI (`superset`) is not installed.") }
		guard let url = Bundle.main.url(forResource: "compiler", withExtension: "md") else { throw WankError("compiler.md is missing from the app.") }
		let wank = Paths.cli.path
		let instructions = try String(contentsOf: url, encoding: .utf8)
			.replacingOccurrences(of: "{{WANK}}", with: wank)
			.replacingOccurrences(of: "{{SUPERSET}}", with: superset)
		var prompt = "New capture: \(capture.path)\nRead its timeline.md and context.json, then build the automation."
		if voiceOnly { prompt += "\nThis one is voice only: no screens or clicks. Work from what they said." }
		if heard.isEmpty { prompt += "\nNobody spoke in this one. Work out the intent from the screens and clicks." }
		let cliTools = ["create", "set-prompt", "ask"].map { "Bash(\(wank) \($0):*)" }
			+ ["automations run", "automations logs", "automations get", "automations list", "automations update", "automations trigger-options", "projects list", "hosts list"]
			.map { "Bash(\(superset) \($0):*)" }
		let tools = ["Read", "Write", "Edit", "Glob", "Grep", "Agent", "TodoWrite", "ToolSearch", "WebSearch", "WebFetch", "Bash(sleep:*)"] + cliTools
		var steps: [Activity] = []
		var summary = "", session = ""
		let o = try sh(claude, [
			"-p", "--model", "opus", "--output-format", "stream-json", "--verbose",
			"--permission-mode", "acceptEdits",
			"--append-system-prompt", instructions,
			"--allowedTools",
		] + tools, stdin: prompt, cwd: capture, env: env, timeout: 20 * 60, onStart: job.attach) { line in
			for step in activityLines(fromStreamJSON: line) {
				append(step, to: &steps)
				progress(step)
			}
			if let end = streamResult(line) { (summary, session) = end }
		}
		if job.isCancelled { throw Cancelled() }
		try? (o.out + "\n" + o.err).write(to: capture.appendingPathComponent("compiler.log"), atomically: true, encoding: .utf8)
		let result = (try? Data(contentsOf: capture.appendingPathComponent("result.json"))).flatMap { try? JSONDecoder().decode(CompileResult.self, from: $0) }
		writeReport(capture, result: result, heard: heard, steps: steps, summary: summary.isEmpty ? o.err : summary, session: session)
		if let result { return result }
		throw WankError(o.status == 0 ? "The agent finished without building anything." : "The agent stopped (exit \(o.status)). See compiler.log.")
	}

	/// Deletes the automations a cancelled build already created.
	static func undo(_ capture: URL) {
		let created = (try? String(contentsOf: capture.appendingPathComponent("created"), encoding: .utf8)) ?? ""
		for id in created.split(whereSeparator: \.isNewline) { Wanker.delete(String(id)) }
	}

	/// One page that says what was heard, what the agent did, and how to change it. The notch result opens it.
	static func writeReport(_ capture: URL, result: CompileResult?, heard: String, steps: [Activity], summary: String, session: String) {
		func esc(_ s: String) -> String {
			s.replacingOccurrences(of: "&", with: "&amp;").replacingOccurrences(of: "<", with: "&lt;").replacingOccurrences(of: ">", with: "&gt;")
		}
		let id = result?.id ?? ""
		let stepList = steps.map { "<li>\(esc($0.text))\($0.count > 1 ? " <span>×\($0.count)</span>" : "")</li>" }.joined()
		var files = id.isEmpty ? "" : "<li><a href=\"\(Wanker.automationURL(id)?.absoluteString ?? "")\">Open it in Wanker</a></li>"
		files += "<li><a href=\"\(capture.absoluteString)\">The recording</a></li>"
		let resume = session.isEmpty ? "" : "<p>Talk to the agent that built it:</p><pre>cd \(esc(capture.path)) &amp;&amp; claude --resume \(esc(session))</pre>"
		let html = """
		<!doctype html><meta charset="utf-8"><title>\(esc(result?.title ?? "Wank"))</title>
		<style>body{font:15px/1.55 -apple-system,sans-serif;max-width:720px;margin:40px auto;padding:0 20px;color:#1d1d1f}h1{margin:0}.sub{color:#86868b;margin:4px 0 24px}h2{font-size:13px;text-transform:uppercase;letter-spacing:.05em;color:#86868b;margin-top:28px}li span{color:#86868b}pre,code{background:#f2f2f4;border-radius:6px;padding:2px 6px}pre{padding:10px 12px;white-space:pre-wrap}blockquote{margin:0;padding-left:12px;border-left:3px solid #d2d2d7}.summary{white-space:pre-wrap}@media(prefers-color-scheme:dark){body{background:#1c1c1e;color:#f5f5f7}pre,code{background:#2c2c2e}blockquote{border-color:#48484a}a{color:#64b5ff}}</style>
		<h1>\(esc(result?.title ?? "Nothing built"))</h1><p class="sub">\(esc(result?.detail ?? ""))</p>
		<h2>What you said</h2><blockquote>\(heard.isEmpty ? "Nothing. It read your screens and clicks." : "“\(esc(heard))”")</blockquote>
		<h2>What the agent did</h2><ol>\(stepList)</ol>
		<h2>Its summary</h2><div class="summary">\(esc(summary))</div>
		<h2>Files</h2><ul>\(files)</ul>
		<h2>Change it</h2>\(resume)
		"""
		try? html.write(to: capture.appendingPathComponent("report.html"), atomically: true, encoding: .utf8)
	}
}
