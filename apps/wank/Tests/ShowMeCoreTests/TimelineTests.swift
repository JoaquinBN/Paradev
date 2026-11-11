import Testing
@testable import ShowMeCore

private let hundredFrames = (0..<100).map { Frame(t: Double($0), file: "\($0).jpg") }

@Test func keepsFirstLastAndClickFramesWithinBudget() {
	let click = Event(t: 50, kind: "click", text: "Archive", frame: "50.jpg")
	let picked = selectFrames(hundredFrames, events: [click], segments: [], budget: 5)
	#expect(picked.count == 5)
	#expect(Set(["0.jpg", "50.jpg", "99.jpg"]).isSubset(of: Set(picked.map(\.file))))
	#expect(picked == picked.sorted { $0.t < $1.t })
}

@Test func spreadsClicksAcrossTheRecordingWhenOverBudget() {
	let clicks = hundredFrames.map { Event(t: $0.t, kind: "click", text: "", frame: $0.file) }
	let times = selectFrames(hundredFrames, events: clicks, segments: [], budget: 10).map(\.t)
	#expect(times.count == 10)
	#expect(zip(times, times.dropFirst()).allSatisfy { $1 - $0 <= 15 })
}

@Test func timelineInterleavesSpeechActionsAndScreens() {
	let md = renderTimeline(
		title: "T",
		segments: [Segment(start: 2, end: 3, text: "archive these")],
		events: [Event(t: 1, kind: "click", text: "Inbox", frame: "a.jpg")],
		frames: [Frame(t: 1, file: "a.jpg"), Frame(t: 65.3, file: "b.jpg")]
	)
	#expect(md == """
	# T

	[0:01.0] CLICK: Inbox → frames/a.jpg
	[0:02.0] SAID: "archive these"
	[1:05.3] SCREEN: frames/b.jpg

	""")
}

@Test func streamJSONBecomesShortActivity() {
	let line = #"{"type":"assistant","parent_tool_use_id":null,"message":{"content":[{"type":"text","text":"Intent: weekday digest of HN agent posts.\nMore detail."},{"type":"tool_use","name":"Read","input":{"file_path":"/c/frames/0001.jpg"}},{"type":"tool_use","name":"Bash","input":{"command":"/x/showme run hn --dry-run"}},{"type":"tool_use","name":"Read","input":{"file_path":"/c/context.json"}}]}}"#
	#expect(activityLines(fromStreamJSON: line) == ["Intent: weekday digest of HN agent posts.", "Eyeing your screenshots", "Dry run, so to speak"])
	let subagent = #"{"type":"assistant","parent_tool_use_id":"toolu_1","message":{"content":[{"type":"text","text":"hi"}]}}"#
	#expect(activityLines(fromStreamJSON: subagent).isEmpty)
	#expect(activityLines(fromStreamJSON: "not json").isEmpty)
}

@Test func repeatedStepsFold() {
	var log: [Activity] = []
	for line in ["Looking at screenshots", "Looking at screenshots", "Testing it"] { append(line, to: &log) }
	#expect(log == [Activity(text: "Looking at screenshots", count: 2), Activity(text: "Testing it")])
}

@Test func streamResultReadsReplyAndSession() {
	let end = streamResult(#"{"type":"result","result":"Built it.","session_id":"abc"}"#)
	#expect(end?.text == "Built it." && end?.session == "abc")
	#expect(streamResult(#"{"type":"assistant"}"#) == nil)
}
