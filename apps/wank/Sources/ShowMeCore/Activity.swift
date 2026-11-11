import Foundation

public struct Activity: Equatable, Sendable {
	public var text: String
	public var count: Int
	public init(text: String, count: Int = 1) {
		self.text = text
		self.count = count
	}
}

/// Repeats of the same step fold into one row ("Eyeing your screenshots ×12").
public func append(_ line: String, to log: inout [Activity]) {
	if log.last?.text == line { log[log.count - 1].count += 1 } else { log.append(Activity(text: line)) }
}

/// Short progress lines from one `claude -p --output-format stream-json` line:
/// the agent's own words, and the steps that matter to the user. Subagent internals are skipped.
public func activityLines(fromStreamJSON line: String) -> [String] {
	guard let object = try? JSONSerialization.jsonObject(with: Data(line.utf8)) as? [String: Any],
	      object["type"] as? String == "assistant",
	      object["parent_tool_use_id"] as? String == nil,
	      let content = (object["message"] as? [String: Any])?["content"] as? [[String: Any]]
	else { return [] }
	return content.compactMap { block in
		switch block["type"] as? String {
		case "text": firstLine(block["text"] as? String ?? "")
		case "tool_use": describeTool(block["name"] as? String ?? "", block["input"] as? [String: Any] ?? [:])
		default: nil
		}
	}
}

/// The agent's closing reply and session id, from the stream's final `result` line.
public func streamResult(_ line: String) -> (text: String, session: String)? {
	guard let object = try? JSONSerialization.jsonObject(with: Data(line.utf8)) as? [String: Any],
	      object["type"] as? String == "result"
	else { return nil }
	return (object["result"] as? String ?? "", object["session_id"] as? String ?? "")
}

func firstLine(_ text: String) -> String? {
	let line = text.split(whereSeparator: \.isNewline).first.map { $0.trimmingCharacters(in: .whitespaces) } ?? ""
	guard !line.isEmpty else { return nil }
	return line.count > 110 ? line.prefix(109) + "…" : line
}

func describeTool(_ name: String, _ input: [String: Any]) -> String? {
	let path = input["file_path"] as? String ?? ""
	let command = input["command"] as? String ?? ""
	switch name {
	case "Read" where path.contains("/frames/"): return "Eyeing your screenshots"
	case "Read" where path.hasSuffix("timeline.md"): return "Replaying your moves"
	case "Write" where path.hasSuffix("prompt.md"), "Edit" where path.hasSuffix("prompt.md"): return "Writing it all down"
	case "Write" where path.hasSuffix("automation.json"), "Edit" where path.hasSuffix("automation.json"): return "Setting the rhythm"
	case "Bash" where command.contains(" ask "): return "Asking you something"
	case "Bash" where command.contains("--dry-run"): return "Dry run, so to speak"
	case "Bash" where command.contains(" install "): return "Booking regular sessions"
	case "Agent", "Task": return "Lending a hand: " + (input["description"] as? String ?? "working")
	case "WebSearch": return "Searching: " + (input["query"] as? String ?? "")
	case "WebFetch": return "Reading " + (URL(string: input["url"] as? String ?? "")?.host ?? "a page")
	default: return nil
	}
}
