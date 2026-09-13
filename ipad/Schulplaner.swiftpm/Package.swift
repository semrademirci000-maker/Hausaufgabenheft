// swift-tools-version: 5.7

// Diese Datei sagt Swift Playgrounds, dass hier eine iPhone-/iPad-App liegt.
// Zum Oeffnen: Ordner "Schulplaner.swiftpm" in der Dateien-App antippen.

import PackageDescription
import AppleProductTypes

let package = Package(
    name: "Schulplaner",
    platforms: [
        .iOS("16.0")
    ],
    products: [
        .iOSApplication(
            name: "Schulplaner",
            targets: ["AppModule"],
            bundleIdentifier: "com.beispiel.schulplaner",
            teamIdentifier: "",
            displayVersion: "1.0",
            bundleVersion: "1",
            appIcon: .asset("AppIcon"),
            accentColor: .asset("AccentColor"),
            supportedDeviceFamilies: [
                .pad,
                .phone
            ],
            supportedInterfaceOrientations: [
                .portrait,
                .landscapeRight,
                .landscapeLeft,
                .portraitUpsideDown(.when(deviceFamilies: [.pad]))
            ]
        )
    ],
    targets: [
        .executableTarget(
            name: "AppModule",
            path: "."
        )
    ]
)
