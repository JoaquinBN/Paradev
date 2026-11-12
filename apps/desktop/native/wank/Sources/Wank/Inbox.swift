import AppKit

/// Wanker talks to Wank over stdin, one JSON object per line: `{"type":"record"}`, `{"type":"organization","id":…}`.
enum Inbox {
	static func listen(_ handle: @escaping @MainActor ([String: String]) -> Void) {
		Thread.detachNewThread {
			while let line = readLine() {
				guard let message = (try? JSONSerialization.jsonObject(with: Data(line.utf8))) as? [String: String] else { continue }
				DispatchQueue.main.async { MainActor.assumeIsolated { handle(message) } }
			}
			// The pipe closes when Wanker quits or restarts Wank, so this copy goes too.
			DispatchQueue.main.async { NSApp.terminate(nil) }
		}
	}
}
