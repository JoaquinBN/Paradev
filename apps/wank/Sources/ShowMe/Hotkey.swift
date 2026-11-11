import AppKit

/// Double-tap of the right Option key on its own. Typing with Option (é, @, …) never counts.
final class Hotkey {
	static let rightOption: UInt16 = 61
	private var monitors: [Any] = []
	private var pressedAt: TimeInterval?
	private var lastTap: TimeInterval = 0
	private let action: () -> Void
	private let onEscape: () -> Void

	init(action: @escaping () -> Void, onEscape: @escaping () -> Void) {
		self.action = action
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
			lastTap = 0
			return
		}
		let flags = e.modifierFlags.intersection([.command, .control, .shift, .option])
		if flags == .option {
			pressedAt = e.timestamp
		} else if flags.isEmpty, let down = pressedAt, e.timestamp - down < 0.3 {
			pressedAt = nil
			if e.timestamp - lastTap < 0.45 {
				lastTap = 0
				action()
			} else {
				lastTap = e.timestamp
			}
		} else {
			pressedAt = nil
		}
	}
}
