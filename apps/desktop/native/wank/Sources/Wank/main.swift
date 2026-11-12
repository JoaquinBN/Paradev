import AppKit

let usage = """
usage: wank create --name <n> --prompt-file <f> [superset automations create flags]
       wank set-prompt <id> <prompt-file>     replace a Wank automation's prompt
       wank ask <question> <option>…        ask the user in the notch; prints the answer
"""

func cli(_ args: [String]) -> Int32 {
	do {
		switch (args.first, args.dropFirst().first) {
		case ("create", _):
			print(try Wanker.create(Array(args.dropFirst())))
		case ("set-prompt", let id?) where args.count == 3:
			try Wanker.setPrompt(id: id, file: args[2])
		case ("ask", let question?):
			print(askUser(question, options: Array(args.dropFirst(2))))
		default:
			FileHandle.standardError.write(Data((usage + "\n").utf8))
			return 64
		}
		return 0
	} catch {
		FileHandle.standardError.write(Data("wank: \(error.localizedDescription)\n".utf8))
		return 1
	}
}

/// Shows the question in the notch and waits for the app to write the answer file.
func askUser(_ question: String, options: [String], timeout: TimeInterval = 300) -> String {
	let id = UUID().uuidString
	let file = Paths.answers.appendingPathComponent(id)
	try? FileManager.default.createDirectory(at: Paths.answers, withIntermediateDirectories: true)
	Notify.post(Notify.ask, ["id": id, "question": question, "options": options.joined(separator: "\n")])
	defer { Notify.post(Notify.ask, ["id": id, "closed": "1"]) }
	let deadline = Date().addingTimeInterval(timeout)
	while Date() < deadline {
		if let answer = try? String(contentsOf: file, encoding: .utf8) {
			try? FileManager.default.removeItem(at: file)
			return answer
		}
		Thread.sleep(forTimeInterval: 0.3)
	}
	return "No answer from the user. Go with your best guess and say so in the result."
}

// `wank` (the shim the build agent calls) passes "cli"; Wanker starts the app with no arguments.
let arguments = Array(CommandLine.arguments.dropFirst())
if arguments.first == "cli" {
	exit(cli(Array(arguments.dropFirst())))
}

MainActor.assumeIsolated {
	let app = NSApplication.shared
	let delegate = AppDelegate()
	app.delegate = delegate
	app.setActivationPolicy(.accessory)
	app.run()
}
