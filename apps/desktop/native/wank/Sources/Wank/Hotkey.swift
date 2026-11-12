import AppKit
import WankCore

/// Taps of the right Option key on its own: one tap or two. Typing with Option (é, @, …) never counts.
final class Hotkey {
	static let rightOption: UInt16 = 61
	private var monitors: [Any] = []
	private var pressedAt: TimeInterval?
	private var taps = TapCounter()
	private let onTap: (TapCounter.Tap) -> Void
	private let onEscape: () -> Void

	init(onTap: @escaping (TapCounter.Tap) -> Void, onEscape: @escaping () -> Void) {
		self.onTap = onTap
		self.onEscape = onEscape
		let mask: NSEvent.EventTypeMask = [.flagsChanged, .keyDown]
		if let m = NSEvent.addGlobalMonitorForEvents(matching: mask, handler: { [weak self] in self?.handle($0) }) { monitors.append(m) }
		if let m = NSEvent.addLocalMonitorForEvents(matching: mask, handler: { [weak self] in self?.handle($0); return $0 }) { monitors.append(m) }
	}

	deinit {
		monitors.forEach(NSEvent.removeMonitor)
	}

	private func handle(_ e: NSEvent) {
		if e.type == .keyDown, e.keyCode == 53 { onEscape() }
		guard e.type == .flagsChanged, e.keyCode == Self.rightOption else {
			pressedAt = nil
			taps.reset()
			return
		}
		let flags = e.modifierFlags.intersection([.command, .control, .shift, .option])
		if flags == .option {
			pressedAt = e.timestamp
		} else if flags.isEmpty, let down = pressedAt, e.timestamp - down < 0.3 {
			pressedAt = nil
			if let tap = taps.tap(at: e.timestamp) { return onTap(tap) }
			DispatchQueue.main.asyncAfter(deadline: .now() + TapCounter.window) { [weak self] in
				guard let self, let tap = self.taps.expire(at: ProcessInfo.processInfo.systemUptime) else { return }
				self.onTap(tap)
			}
		} else {
			pressedAt = nil
		}
	}
}
