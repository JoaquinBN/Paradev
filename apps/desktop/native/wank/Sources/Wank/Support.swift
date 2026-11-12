import Foundation

struct WankError: LocalizedError {
	let message: String
	init(_ message: String) { self.message = message }
	var errorDescription: String? { message }
}

/// Everything lives under Wanker's home (`SUPERSET_HOME_DIR`, which Wanker passes in).
enum Paths {
	static let home = URL(fileURLWithPath: ProcessInfo.processInfo.environment["SUPERSET_HOME_DIR"] ?? NSHomeDirectory() + "/.paradev")
	static let root = home.appendingPathComponent("wank")
	static let captures = root.appendingPathComponent("captures")
	static let answers = root.appendingPathComponent("answers")
	static let pending = root.appendingPathComponent("notch.json")
	static let askedAccessibility = root.appendingPathComponent("asked-accessibility")
	/// On the PATH of Wanker's agents, so the build agent can call `wank create`.
	static let cli = home.appendingPathComponent("bin/wank")
	static var executable: String { Bundle.main.executablePath ?? CommandLine.arguments[0] }

	static func prepare() {
		let fm = FileManager.default
		try? fm.removeItem(at: answers)
		for dir in [captures, answers, cli.deletingLastPathComponent()] {
			try? fm.createDirectory(at: dir, withIntermediateDirectories: true)
		}
		let shim = "#!/bin/sh\nexec \"\(executable)\" cli \"$@\"\n"
		if (try? String(contentsOf: cli, encoding: .utf8)) != shim {
			try? shim.write(to: cli, atomically: true, encoding: .utf8)
			try? fm.setAttributes([.posixPermissions: 0o755], ofItemAtPath: cli.path)
		}
		// Captures hold screenshots of whatever was on screen; keep them two weeks.
		let cutoff = Date().addingTimeInterval(-14 * 86_400)
		for dir in (try? fm.contentsOfDirectory(at: captures, includingPropertiesForKeys: [.creationDateKey])) ?? [] {
			if let created = try? dir.resourceValues(forKeys: [.creationDateKey]).creationDate, created < cutoff {
				try? fm.removeItem(at: dir)
			}
		}
	}
}

/// `wank ask` (run by the build agent) reaches the notch without a socket.
enum Notify {
	static let ask = Notification.Name("dev.wanker.wank.ask")

	static func post(_ name: Notification.Name, _ info: [String: String]) {
		DistributedNotificationCenter.default().postNotificationName(name, object: nil, userInfo: info, deliverImmediately: true)
	}
}

struct Output {
	var status: Int32
	var out: String
	var err: String
}

@discardableResult
func sh(_ exe: String, _ args: [String], stdin: String? = nil, cwd: URL? = nil, env: [String: String]? = nil, timeout: TimeInterval? = nil, onStart: ((Process) -> Void)? = nil, onLine: ((String) -> Void)? = nil) throws -> Output {
	let p = Process()
	p.executableURL = URL(fileURLWithPath: exe)
	p.arguments = args
	if let cwd { p.currentDirectoryURL = cwd }
	if let env { p.environment = env }
	let out = Pipe(), err = Pipe(), input = Pipe()
	p.standardOutput = out
	p.standardError = err
	p.standardInput = stdin == nil ? FileHandle.nullDevice : input
	try p.run()
	onStart?(p)
	if let stdin {
		DispatchQueue.global().async {
			input.fileHandleForWriting.write(Data(stdin.utf8))
			try? input.fileHandleForWriting.close()
		}
	}
	if let timeout {
		DispatchQueue.global().asyncAfter(deadline: .now() + timeout) { if p.isRunning { killTree(p.processIdentifier) } }
	}
	var errData = Data()
	let done = DispatchGroup()
	done.enter()
	DispatchQueue.global().async {
		errData = err.fileHandleForReading.readDataToEndOfFile()
		done.leave()
	}
	var outData = Data()
	var pending = Data()
	while case let chunk = out.fileHandleForReading.availableData, !chunk.isEmpty {
		outData.append(chunk)
		guard let onLine else { continue }
		pending.append(chunk)
		while let newline = pending.firstIndex(of: 10) {
			onLine(String(decoding: pending[..<newline], as: UTF8.self))
			pending.removeSubrange(...newline)
		}
	}
	done.wait()
	p.waitUntilExit()
	return Output(status: p.terminationStatus, out: String(decoding: outData, as: UTF8.self), err: String(decoding: errData, as: UTF8.self))
}

/// Stops a process and everything it started: an agent's test runs and questions run as its grandchildren.
func killTree(_ pid: pid_t) {
	let children = (try? sh("/usr/bin/pgrep", ["-P", "\(pid)"]))?.out.split(separator: "\n").compactMap { pid_t($0) } ?? []
	children.forEach(killTree)
	kill(pid, SIGTERM)
}

func which(_ name: String, env: [String: String]) -> String? {
	(env["PATH"] ?? "").split(separator: ":").map { "\($0)/\(name)" }.first { FileManager.default.isExecutableFile(atPath: $0) }
}
