// swift-tools-version: 6.0
import PackageDescription

let package = Package(
	name: "ShowMe",
	platforms: [.macOS("26.0")],
	targets: [
		.target(name: "ShowMeCore"),
		.executableTarget(name: "ShowMe", dependencies: ["ShowMeCore"]),
		.testTarget(name: "ShowMeCoreTests", dependencies: ["ShowMeCore"]),
	],
	swiftLanguageModes: [.v5]
)
