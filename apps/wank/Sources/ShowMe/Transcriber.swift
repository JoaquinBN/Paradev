import AVFoundation
import Foundation
import ShowMeCore
import Speech

enum Settings {
	/// Override with `defaults write dev.showme.ShowMe locale es-ES`.
	static var locale: Locale {
		Locale(identifier: UserDefaults.standard.string(forKey: "locale") ?? Locale.preferredLanguages.first ?? "en-US")
	}
}

/// On-device speech to text, one segment per phrase with its time in the recording.
func transcribe(_ url: URL, locale requested: Locale) async throws -> [Segment] {
	guard let locale = await SpeechTranscriber.supportedLocale(equivalentTo: requested) else {
		throw ShowMeError("No on-device speech model for \(requested.identifier).")
	}
	let transcriber = SpeechTranscriber(locale: locale, preset: .transcription)
	if let request = try await AssetInventory.assetInstallationRequest(supporting: [transcriber]) {
		try await request.downloadAndInstall()
	}
	let collector = Task {
		var segments: [Segment] = []
		for try await result in transcriber.results {
			let text = String(result.text.characters).trimmingCharacters(in: .whitespacesAndNewlines)
			if !text.isEmpty {
				segments.append(Segment(start: result.range.start.seconds, end: result.range.end.seconds, text: text))
			}
		}
		return segments
	}
	let analyzer = SpeechAnalyzer(modules: [transcriber])
	if let end = try await analyzer.analyzeSequence(from: AVAudioFile(forReading: url)) {
		try await analyzer.finalizeAndFinish(through: end)
	} else {
		await analyzer.cancelAndFinishNow()
	}
	return try await collector.value
}
