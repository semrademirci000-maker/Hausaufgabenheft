#!/usr/bin/env python3
"""Baut aus ios/Schulplaner die iPad-Fassung ipad/Schulplaner.swiftpm.

Damit laesst sich dieselbe App ohne Mac direkt auf dem iPad in
"Swift Playgrounds" oeffnen, starten und bearbeiten.

Aufruf: python3 ios/Tools/make_swiftpm.py
"""
import os
import shutil

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
SOURCE = os.path.join(ROOT, "ios", "Schulplaner")
TARGET = os.path.join(ROOT, "ipad", "Schulplaner.swiftpm")

PACKAGE_SWIFT = '''// swift-tools-version: 5.7

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
'''

if os.path.isdir(TARGET):
    shutil.rmtree(TARGET)
os.makedirs(TARGET)

copied = 0
for folder, _dirs, files in os.walk(SOURCE):
    relative = os.path.relpath(folder, SOURCE)
    if relative.startswith("Assets.xcassets"):
        continue
    for name in sorted(files):
        if not name.endswith(".swift"):
            continue
        destination_dir = TARGET if relative == "." else os.path.join(TARGET, relative)
        os.makedirs(destination_dir, exist_ok=True)
        shutil.copy2(os.path.join(folder, name), os.path.join(destination_dir, name))
        copied += 1

shutil.copytree(os.path.join(SOURCE, "Assets.xcassets"), os.path.join(TARGET, "Assets.xcassets"))

with open(os.path.join(TARGET, "Package.swift"), "w", encoding="utf-8") as handle:
    handle.write(PACKAGE_SWIFT)

print(f"{copied} Swift-Dateien kopiert nach {TARGET}")
