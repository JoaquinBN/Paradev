// swift-tools-version: 6.0
import PackageDescription

let package = Package(
	name: "Wank",
	platforms: [.macOS("26.0")],
	targets: [
		.target(name: "WankCore"),
		.executableTarget(name: "Wank", dependencies: ["WankCore"]),
		.testTarget(name: "WankCoreTests", dependencies: ["WankCore"]),
	],
	swiftLanguageModes: [.v5]
)
