import AppKit

/// Names what the user clicked, so the agent reads "AXButton “Archive” in Mail" instead of guessing from pixels.
enum Accessibility {
	static func attr(_ el: AXUIElement, _ name: String) -> AnyObject? {
		var value: AnyObject?
		return AXUIElementCopyAttributeValue(el, name as CFString, &value) == .success ? value : nil
	}

	static func element(_ el: AXUIElement, _ name: String) -> AXUIElement? {
		guard let value = attr(el, name), CFGetTypeID(value) == AXUIElementGetTypeID() else { return nil }
		return (value as! AXUIElement)
	}

	static func string(_ el: AXUIElement, _ name: String) -> String? {
		guard let s = attr(el, name) as? String, !s.isEmpty else { return nil }
		return String(s.prefix(120))
	}

	static func describe(app: NSRunningApplication) -> String {
		let name = app.localizedName ?? app.bundleIdentifier ?? "an app"
		let window = element(AXUIElementCreateApplication(app.processIdentifier), kAXFocusedWindowAttribute)
			.flatMap { string($0, kAXTitleAttribute) }
		return window.map { "\(name) — “\($0)”" } ?? name
	}

	static func describeElement(at point: CGPoint) -> String {
		var found: AXUIElement?
		guard AXUIElementCopyElementAtPosition(AXUIElementCreateSystemWide(), Float(point.x), Float(point.y), &found) == .success,
		      let el = found
		else { return "at \(Int(point.x)),\(Int(point.y))" }
		let role = string(el, kAXRoleAttribute) ?? "element"
		let secure = role == "AXSecureTextField" || string(el, kAXSubroleAttribute) == "AXSecureTextField"
		let names = secure ? [kAXTitleAttribute, kAXDescriptionAttribute] : [kAXTitleAttribute, kAXDescriptionAttribute, kAXValueAttribute, kAXHelpAttribute]
		var parts = [role + (names.lazy.compactMap { string(el, $0) }.first.map { " “\($0)”" } ?? "")]
		var pid: pid_t = 0
		if AXUIElementGetPid(el, &pid) == .success, let app = NSRunningApplication(processIdentifier: pid) {
			parts.append("in \(describe(app: app))")
		}
		if let url = pageURL(el) { parts.append(url) }
		return parts.joined(separator: " ")
	}

	private static func pageURL(_ start: AXUIElement) -> String? {
		var current: AXUIElement? = start
		for _ in 0..<40 {
			guard let el = current else { return nil }
			if string(el, kAXRoleAttribute) == "AXWebArea" { return (attr(el, "AXURL") as? URL)?.absoluteString }
			current = element(el, kAXParentAttribute)
		}
		return nil
	}
}
