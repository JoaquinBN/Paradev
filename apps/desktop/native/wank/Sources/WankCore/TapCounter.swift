import Foundation

/// Tells one tap from two. A tap stays pending until the window closes; a second tap inside it makes a double.
public struct TapCounter {
	public enum Tap: Equatable { case single, double }
	public static let window: TimeInterval = 0.4

	private var pendingSince: TimeInterval?

	public init() {}

	/// Returns `.double` for a second tap inside the window; otherwise the tap is pending.
	public mutating func tap(at time: TimeInterval) -> Tap? {
		if let since = pendingSince, time - since < Self.window {
			pendingSince = nil
			return .double
		}
		pendingSince = time
		return nil
	}

	/// Once the window has closed, a pending tap is a single.
	public mutating func expire(at time: TimeInterval) -> Tap? {
		guard let since = pendingSince, time - since >= Self.window else { return nil }
		pendingSince = nil
		return .single
	}

	public mutating func reset() { pendingSince = nil }
}
