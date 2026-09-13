#!/bin/bash
# Startet die gebaute App im Simulator und macht Screenshots
# von Startseite, Stundenplan und Hausaufgabenheft.
set -euo pipefail

BUNDLE_ID="com.beispiel.schulplaner"
APP=$(find build/Build/Products/Debug-iphonesimulator -maxdepth 1 -name "*.app" | head -1)

if [ -z "$APP" ]; then
  echo "Keine gebaute App gefunden."
  exit 1
fi
echo "App: $APP"

mkdir -p screenshots

find_device () {
  xcrun simctl list devices available -j | python3 -c '
import json, sys
wanted = sys.argv[1]
data = json.load(sys.stdin)["devices"]
best = None
for runtime, devices in data.items():
    if "iOS" not in runtime:
        continue
    for device in devices:
        if wanted in device["name"] and device.get("isAvailable"):
            best = device["udid"]
            break
    if best:
        break
print(best or "")
' "$1"
}

shoot_device () {
  local search="$1"
  local prefix="$2"
  local udid
  udid=$(find_device "$search")

  if [ -z "$udid" ]; then
    echo "Kein Simulator gefunden für: $search"
    return 0
  fi
  echo "Simulator $search -> $udid"

  xcrun simctl boot "$udid" || true
  xcrun simctl bootstatus "$udid" -b
  xcrun simctl status_bar "$udid" override \
    --time "9:41" --batteryState charged --batteryLevel 100 --wifiBars 3 || true
  xcrun simctl install "$udid" "$APP"

  for screen in start plan buch; do
    xcrun simctl terminate "$udid" "$BUNDLE_ID" >/dev/null 2>&1 || true
    if [ "$screen" = "start" ]; then
      xcrun simctl launch "$udid" "$BUNDLE_ID"
    else
      xcrun simctl launch "$udid" "$BUNDLE_ID" -startScreen "$screen"
    fi
    sleep 7
    xcrun simctl io "$udid" screenshot "screenshots/${prefix}-${screen}.png"
    sips -Z 1100 "screenshots/${prefix}-${screen}.png" >/dev/null
  done

  xcrun simctl shutdown "$udid" || true
}

shoot_device "iPhone" "iphone"
shoot_device "iPad" "ipad"

ls -la screenshots
