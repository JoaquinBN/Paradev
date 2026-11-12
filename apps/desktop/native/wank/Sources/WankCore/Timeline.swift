import Foundation

public struct Segment: Codable, Equatable, Sendable {
	public var start: Double
	public var end: Double
	public var text: String
	public init(start: Double, end: Double, text: String) {
		self.start = start
		self.end = end
		self.text = text
	}
}

public struct Event: Codable, Equatable, Sendable {
	public var t: Double
	public var kind: String
	public var text: String
	public var frame: String?
	public init(t: Double, kind: String, text: String, frame: String? = nil) {
		self.t = t
		self.kind = kind
		self.text = text
		self.frame = frame
	}
}

public struct Frame: Codable, Equatable, Sendable {
	public var t: Double
	public var file: String
	public init(t: Double, file: String) {
		self.t = t
		self.file = file
	}
}

/// Picks at most `budget` frames, by priority: first and last screen, the
/// screen at each click, the screen as each phrase starts, then even fill.
public func selectFrames(_ frames: [Frame], events: [Event], segments: [Segment], budget: Int) -> [Frame] {
	let frames = frames.sorted { $0.t < $1.t }
	guard let first = frames.first, let last = frames.last, budget > 0 else { return [] }
	let tiers: [[String]] = [
		[first.file, last.file],
		events.compactMap(\.frame),
		segments.map { s in (frames.last { $0.t <= s.start } ?? first).file },
		frames.map(\.file),
	]
	var chosen = Set<String>()
	for tier in tiers {
		var seen = Set<String>()
		let fresh = tier.filter { !chosen.contains($0) && seen.insert($0).inserted }
		chosen.formUnion(spread(fresh, budget - chosen.count))
	}
	return frames.filter { chosen.contains($0.file) }
}

func spread<T>(_ items: [T], _ n: Int) -> [T] {
	guard n > 0 else { return [] }
	guard items.count > n else { return items }
	return (0..<n).map { items[$0 * items.count / n] }
}

/// What was said, done and shown, in time order, as the agent reads it.
public func renderTimeline(title: String, segments: [Segment], events: [Event], frames: [Frame]) -> String {
	let shown = Set(frames.map(\.file))
	var rows: [(t: Double, order: Int, line: String)] = []
	for s in segments {
		rows.append((s.start, 0, "SAID: \"\(s.text)\""))
	}
	for e in events {
		let shot = e.frame.flatMap { shown.contains($0) ? " → frames/\($0)" : nil } ?? ""
		rows.append((e.t, 1, "\(e.kind.uppercased()): \(e.text)\(shot)"))
	}
	let onEvents = Set(events.compactMap(\.frame))
	for f in frames where !onEvents.contains(f.file) {
		rows.append((f.t, 2, "SCREEN: frames/\(f.file)"))
	}
	rows.sort { ($0.t, $0.order) < ($1.t, $1.order) }
	return "# \(title)\n\n" + rows.map { "[\(clock($0.t))] \($0.line)" }.joined(separator: "\n") + "\n"
}

public func clock(_ t: Double) -> String {
	String(format: "%d:%04.1f", Int(t) / 60, t.truncatingRemainder(dividingBy: 60))
}
