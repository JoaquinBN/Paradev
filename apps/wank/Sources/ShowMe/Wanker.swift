import Foundation

/// Wank builds real Wanker automations through the Wanker CLI (`superset`), so they live in the app's Automations tab.
enum Wanker {
	static let group = "Wank"

	/// Reading one browser's cookie key unlocks every site the user is signed in to, so no automation may do it.
	static let secretGrabs = ["cookie-import", "Safe Storage", "find-generic-password", "find-internet-password", "dump-keychain"]

	/// The user's shell environment, plus a local API and key when set:
	/// `defaults write dev.showme.ShowMe wankerApiUrl http://localhost:3001` and `wankerApiKey sk_live_…`.
	static func environment() -> [String: String] {
		var env = userEnvironment()
		let defaults = UserDefaults.standard
		if let url = defaults.string(forKey: "wankerApiUrl") { env["SUPERSET_API_URL"] = url }
		if let key = defaults.string(forKey: "wankerApiKey") { env["SUPERSET_API_KEY"] = key }
		return env
	}

	/// `defaults write dev.showme.ShowMe wankerCli <path>` picks a dev build's CLI over the one on PATH.
	static func cli(env: [String: String]) -> String? {
		if let path = UserDefaults.standard.string(forKey: "wankerCli"), FileManager.default.isExecutableFile(atPath: path) {
			return path
		}
		return which("superset", env: env)
	}

	/// The app's deep-link base: `superset://` for releases, `superset-<workspace>://` for a dev build (`wankerAppUrl`).
	static var appURL: String { UserDefaults.standard.string(forKey: "wankerAppUrl") ?? "superset://" }
	static var automationsURL: URL? { URL(string: appURL + "automations") }
	static func automationURL(_ id: String) -> URL? { URL(string: appURL + "automations/" + id) }

	/// `wank create …`: refuses secret grabs, files the automation under the Wank group, prints its id,
	/// and records it in `$WANK_CAPTURE/created` so a cancelled build can delete it.
	static func create(_ args: [String]) throws -> String {
		try refuseSecretGrabs(promptFile: value(of: "--prompt-file", in: args))
		let output = try run(["automations", "create"] + args + ["--group", group, "--json"])
		guard let id = automationID(in: output) else { throw ShowMeError("The CLI did not return an automation id: \(output.prefix(300))") }
		if let capture = ProcessInfo.processInfo.environment["WANK_CAPTURE"] {
			let file = URL(fileURLWithPath: capture).appendingPathComponent("created")
			let previous = (try? String(contentsOf: file, encoding: .utf8)) ?? ""
			try? (previous + id + "\n").write(to: file, atomically: true, encoding: .utf8)
		}
		return id
	}

	/// `wank set-prompt <id> <file>`: replaces a Wank automation's prompt, with the same check as create.
	static func setPrompt(id: String, file: String) throws {
		try refuseSecretGrabs(promptFile: file)
		_ = try run(["automations", "prompt", "set", id, "--from-file", file])
	}

	static func delete(_ id: String) {
		_ = try? run(["automations", "delete", id])
	}

	private static func refuseSecretGrabs(promptFile: String?) throws {
		guard let promptFile else { throw ShowMeError("Pass the prompt with --prompt-file.") }
		let prompt = try String(contentsOfFile: promptFile, encoding: .utf8)
		if let grab = secretGrabs.first(where: { prompt.localizedCaseInsensitiveContains($0) }) {
			throw ShowMeError("It reads browser cookies or Keychain secrets (\(grab)). Use a connector, or a browser profile the user signs in to once.")
		}
	}

	private static func run(_ args: [String]) throws -> String {
		let env = environment()
		guard let cli = cli(env: env) else { throw ShowMeError("The Wanker CLI (`superset`) is not installed. Open Wanker once.") }
		let o = try sh(cli, args, env: env, timeout: 120)
		guard o.status == 0 else { throw ShowMeError((o.err.isEmpty ? o.out : o.err).trimmingCharacters(in: .whitespacesAndNewlines)) }
		return o.out
	}

	private static func value(of flag: String, in args: [String]) -> String? {
		guard let i = args.firstIndex(of: flag), args.indices.contains(i + 1) else { return nil }
		return args[i + 1]
	}

	private static func automationID(in output: String) -> String? {
		guard let object = try? JSONSerialization.jsonObject(with: Data(output.utf8)) as? [String: Any] else { return nil }
		return object["id"] as? String ?? (object["automation"] as? [String: Any])?["id"] as? String
	}
}
