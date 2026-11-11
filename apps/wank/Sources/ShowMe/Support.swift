import Foundation

struct ShowMeError: LocalizedError {
	let message: String
	init(_ message: String) { self.message = message }
	var errorDescription: String? { message }
}

enum Paths {
	static let root = FileManager.default.homeDirectoryForCurrentUser.appendingPathComponent(".showme")
	static let captures = root.appendingPathComponent("captures")
	static let answers = root.appendingPathComponent("answers")
	static let pending = root.appendingPathComponent("notch.json")
	static let cli = root.appendingPathComponent("bin/wank")
	static var executable: String { Bundle.main.executablePath ?? CommandLine.arguments[0] }

	static func prepare() {
		let fm = FileManager.default
		try? fm.removeItem(at: answers)
		try? fm.removeItem(at: root.appendingPathComponent("bin/showme"))
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

/// Lets `wank run` (started by launchd) and the app talk without a socket.
enum Notify {
	static let ask = Notification.Name("dev.showme.ask")

	static func post(_ name: Notification.Name, _ info: [String: String]) {
		DistributedNotificationCenter.default().postNotificationName(name, object: nil, userInfo: info, deliverImmediately: true)
	}
}

/// A killed `wank` must take its `claude` child with it, or the run goes on unwatched.
enum Children {
	nonisolated(unsafe) static var current: Process?
	nonisolated(unsafe) private static var sources: [DispatchSourceSignal] = []

	static func dieTogether() {
		for sig in [SIGTERM, SIGINT, SIGHUP] {
			signal(sig, SIG_IGN)
			let source = DispatchSource.makeSignalSource(signal: sig, queue: .main)
			source.setEventHandler {
				current?.terminate()
				exit(128 + sig)
			}
			source.resume()
			sources.append(source)
		}
	}
}

/// Stops a process and everything it started: an agent's dry runs and questions run as its grandchildren.
func killTree(_ pid: pid_t) {
	let children = (try? sh("/usr/bin/pgrep", ["-P", "\(pid)"]))?.out.split(separator: "\n").compactMap { pid_t($0) } ?? []
	children.forEach(killTree)
	kill(pid, SIGTERM)
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
	Children.current = p
	onStart?(p)
	defer { Children.current = nil }
	if let stdin {
		DispatchQueue.global().async {
			input.fileHandleForWriting.write(Data(stdin.utf8))
			try? input.fileHandleForWriting.close()
		}
	}
	if let timeout {
		DispatchQueue.global().asyncAfter(deadline: .now() + timeout) { if p.isRunning { p.terminate() } }
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

/// The user's login-shell environment. Apps and launchd jobs start with a bare PATH that has no `claude`.
func userEnvironment() -> [String: String] {
	var env = ProcessInfo.processInfo.environment
	let marker = "__SHOWME_PATH__"
	if let o = try? sh(env["SHELL"] ?? "/bin/zsh", ["-lic", "printf '\\n\(marker)%s\(marker)' \"$PATH\""], timeout: 10),
	   let a = o.out.range(of: marker),
	   let b = o.out.range(of: marker, range: a.upperBound..<o.out.endIndex) {
		env["PATH"] = String(o.out[a.upperBound..<b.lowerBound])
	}
	return env
}

func which(_ name: String, env: [String: String]) -> String? {
	(env["PATH"] ?? "").split(separator: ":").map { "\($0)/\(name)" }.first { FileManager.default.isExecutableFile(atPath: $0) }
}
