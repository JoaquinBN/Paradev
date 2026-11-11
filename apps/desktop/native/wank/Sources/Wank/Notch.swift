import AppKit
import WankCore
import SwiftUI

enum Phase: Equatable {
	case hidden
	case recording
	case listening
	case question(String, [String])
	case working(String)
	case done(String, String)
	case attention(String, String)
	case cancelled
}

@MainActor
final class NotchModel: ObservableObject {
	@Published private(set) var phase: Phase = .hidden
	@Published private(set) var since = Date()
	@Published var level: CGFloat = 0
	@Published private(set) var activity: [Activity] = []
	@Published var expanded = false
	@Published private(set) var hint: String?
	private var hintTask: Task<Void, Never>?
	var islandSize: CGSize = .zero
	private(set) var link: URL?
	private var hide: Task<Void, Never>?

	func log(_ line: String) {
		append(line, to: &activity)
		if activity.count > 40 { activity.removeFirst(activity.count - 40) }
		if case .working = phase { show(.working(line)) }
	}

	func clearActivity() { activity = [] }

	func flash(_ text: String, for seconds: Double = 2) {
		hint = text
		hintTask?.cancel()
		hintTask = Task { [weak self] in
			try? await Task.sleep(for: .seconds(seconds))
			if !Task.isCancelled { self?.hint = nil }
		}
	}

	func show(_ next: Phase, link: URL? = nil) {
		if case .working = phase, case .working = next {} else { since = Date() }
		phase = next
		self.link = link
		hide?.cancel()
		let seconds: Double? = switch next {
		case .done: 8
		case .cancelled: 3
		default: nil
		}
		if let seconds {
			hide = Task { [weak self] in
				try? await Task.sleep(for: .seconds(seconds))
				while self?.expanded == true, !Task.isCancelled { try? await Task.sleep(for: .seconds(1)) }
				if !Task.isCancelled { self?.show(.hidden) }
			}
		}
	}
}

/// A borderless panel over the notch. It takes the mouse only while the pointer is on the island.
final class NotchPanel: NSPanel {
	private let model: NotchModel
	private var hover: Timer?

	init(model: NotchModel, onTap: @escaping () -> Void, onAnswer: @escaping (String) -> Void, onCancel: @escaping () -> Void) {
		self.model = model
		let screen = NSScreen.screens.first { $0.safeAreaInsets.top > 0 } ?? NSScreen.main ?? NSScreen.screens[0]
		let notch = Self.notchSize(screen)
		let size = NSSize(width: max(notch.width + 2 * NotchView.wing, NotchView.expandedWidth) + 40, height: notch.height + 330)
		let frame = NSRect(x: screen.frame.midX - size.width / 2, y: screen.frame.maxY - size.height, width: size.width, height: size.height)
		super.init(contentRect: frame, styleMask: [.borderless, .nonactivatingPanel], backing: .buffered, defer: false)
		isOpaque = false
		backgroundColor = .clear
		hasShadow = false
		isMovable = false
		level = NSWindow.Level(rawValue: NSWindow.Level.mainMenu.rawValue + 3)
		collectionBehavior = [.canJoinAllSpaces, .stationary, .fullScreenAuxiliary, .ignoresCycle]
		ignoresMouseEvents = true
		contentView = NSHostingView(rootView: NotchView(model: model, notch: notch, onTap: onTap, onAnswer: onAnswer, onCancel: onCancel))
		orderFrontRegardless()
		hover = Timer.scheduledTimer(withTimeInterval: 0.1, repeats: true) { [weak self] _ in
			MainActor.assumeIsolated { self?.trackMouse() }
		}
	}

	private func trackMouse() {
		let size = model.phase == .hidden ? .zero : model.islandSize
		let island = NSRect(x: frame.midX - size.width / 2, y: frame.maxY - size.height, width: size.width, height: size.height)
		let inside = size != .zero && island.insetBy(dx: -4, dy: -4).contains(NSEvent.mouseLocation)
		ignoresMouseEvents = !inside
		if inside != model.expanded { model.expanded = inside }
	}

	override var canBecomeKey: Bool { false }

	static func notchSize(_ screen: NSScreen) -> CGSize {
		let top = screen.safeAreaInsets.top
		guard top > 0 else { return CGSize(width: 0, height: max(28, screen.frame.maxY - screen.visibleFrame.maxY)) }
		let width = screen.frame.width - (screen.auxiliaryTopLeftArea?.width ?? 0) - (screen.auxiliaryTopRightArea?.width ?? 0)
		return CGSize(width: width, height: top)
	}
}

struct NotchView: View {
	static let wing: CGFloat = 64
	static let expandedWidth: CGFloat = 400
	@ObservedObject var model: NotchModel
	let notch: CGSize
	let onTap: () -> Void
	var onAnswer: (String) -> Void = { _ in }
	var onCancel: () -> Void = {}

	var body: some View {
		VStack(spacing: 0) {
			if model.phase != .hidden {
				island.transition(.scale(scale: 0.4, anchor: .top).combined(with: .opacity))
			}
			Spacer(minLength: 0)
		}
		.frame(maxWidth: .infinity, maxHeight: .infinity)
		.animation(.spring(response: 0.35, dampingFraction: 0.8), value: model.phase)
		.animation(.spring(response: 0.35, dampingFraction: 0.85), value: model.expanded)
	}

	private var showsActivity: Bool { model.expanded && !model.activity.isEmpty }
	private var contentWidth: CGFloat { showsActivity ? Self.expandedWidth - 28 : notch.width + 2 * Self.wing - 28 }

	private var activityList: some View {
		let rows = Array(model.activity.suffix(9))
		let working = if case .working = model.phase { true } else { false }
		return VStack(alignment: .leading, spacing: 4) {
			ForEach(Array(rows.enumerated()), id: \.offset) { index, item in
				let last = index == rows.count - 1
				HStack(alignment: .top, spacing: 7) {
					Circle().fill(last && working ? Color.purple : .white.opacity(0.35)).frame(width: 5, height: 5).padding(.top, 5)
					Text(item.count > 1 ? "\(item.text) ×\(item.count)" : item.text)
						.font(.system(size: 11))
						.foregroundStyle(.white.opacity(last ? 0.95 : 0.6))
						.lineLimit(2)
					Spacer(minLength: 0)
				}
			}
		}
		.frame(width: contentWidth)
		.padding(.top, 6)
		.padding(.bottom, 10)
		.transition(.opacity)
	}

	private var island: some View {
		VStack(spacing: 2) {
			HStack(spacing: 0) {
				leading.frame(width: Self.wing - 14, alignment: .leading)
				Spacer(minLength: notch.width)
				trailing.frame(width: Self.wing - 14, alignment: .trailing)
			}
			.frame(height: notch.height)
			if case .question(let question, let options) = model.phase {
				VStack(spacing: 5) {
					Text(question).font(.system(size: 12, weight: .semibold)).lineLimit(3)
					ForEach(options, id: \.self) { option in
						Button { onAnswer(option) } label: {
							Text(option).font(.system(size: 11, weight: .medium)).lineLimit(1)
								.frame(maxWidth: .infinity).padding(.vertical, 5)
								.background(Capsule().fill(.white.opacity(0.15)))
						}
						.buttonStyle(.plain)
					}
					Button(action: onCancel) {
						Text("Not in the mood (skip it)").font(.system(size: 11)).foregroundStyle(.white.opacity(0.6))
							.frame(maxWidth: .infinity).padding(.vertical, 4)
					}
					.buttonStyle(.plain)
					Text("or tap right ⌥ and say it").font(.system(size: 10)).foregroundStyle(.white.opacity(0.5))
				}
				.multilineTextAlignment(.center)
				.frame(maxWidth: contentWidth)
				.padding(.bottom, 10)
			} else if let (title, detail) = message, !(showsActivity && isWorking) {
				VStack(spacing: 1) {
					Text(title).font(.system(size: 12, weight: .semibold))
					if !detail.isEmpty {
						Text(detail).font(.system(size: 11)).foregroundStyle(.white.opacity(0.7)).lineLimit(3)
					}
				}
				.multilineTextAlignment(.center)
				.frame(maxWidth: contentWidth)
				.padding(.bottom, 10)
			}
			if let hint = model.hint {
				Text(hint).font(.system(size: 11, weight: .medium)).foregroundStyle(.orange).padding(.bottom, 8)
			}
			if showsActivity { activityList }
			if model.expanded, isWorking {
				Button(action: onCancel) {
					Text("Stop the wank · nothing gets set up").font(.system(size: 11, weight: .medium))
						.frame(maxWidth: .infinity).padding(.vertical, 5)
						.background(Capsule().fill(.white.opacity(0.12)))
				}
				.buttonStyle(.plain)
				.padding(.bottom, 10)
			}
		}
		.frame(width: contentWidth)
		.foregroundStyle(.white)
		.padding(.horizontal, 14)
		.background(UnevenRoundedRectangle(bottomLeadingRadius: 18, bottomTrailingRadius: 18).fill(.black))
		.contentShape(Rectangle())
		.onTapGesture(perform: onTap)
		.background(GeometryReader { geometry in
			Color.clear
				.onAppear { model.islandSize = geometry.size }
				.onChange(of: geometry.size) { _, size in model.islandSize = size }
		})
	}

	private var isWorking: Bool {
		if case .working = model.phase { true } else { false }
	}

	@ViewBuilder private var leading: some View {
		switch model.phase {
		case .recording, .listening:
			HStack(spacing: 6) {
				Circle().fill(.red).frame(width: 8, height: 8)
				HStack(spacing: 2) {
					ForEach([0.6, 1, 0.75], id: \.self) { k in
						Capsule().fill(.white.opacity(0.9)).frame(width: 3, height: 3 + model.level * 13 * k)
					}
				}
				.animation(.easeOut(duration: 0.1), value: model.level)
			}
		case .working:
			Image(systemName: "sparkles").symbolEffect(.pulse).foregroundStyle(.purple)
		case .done:
			Image(systemName: "checkmark.circle.fill").foregroundStyle(.green)
		case .attention:
			Image(systemName: "exclamationmark.circle.fill").foregroundStyle(.orange)
		case .question:
			Image(systemName: "questionmark.circle.fill").foregroundStyle(.blue)
		case .cancelled:
			Image(systemName: "xmark.circle.fill").foregroundStyle(.gray)
		case .hidden:
			EmptyView()
		}
	}

	@ViewBuilder private var trailing: some View {
		switch model.phase {
		case .recording, .listening, .working:
			Text(model.since, style: .timer).font(.system(size: 12, weight: .medium).monospacedDigit())
		default:
			EmptyView()
		}
	}

	private var message: (String, String)? {
		switch model.phase {
		case .working(let stage): (stage, "")
		case .listening: ("All ears…", "Tap right ⌥ when you're done")
		case .done(let title, let detail), .attention(let title, let detail): (title, detail)
		case .cancelled: ("Wank abandoned", "")
		default: nil
		}
	}
}
