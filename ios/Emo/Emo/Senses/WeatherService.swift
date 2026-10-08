//
//  WeatherService.swift
//  Holt das aktuelle Wetter für deinen Ort (Open-Meteo, kostenlos, ohne Schlüssel).
//

import CoreLocation
import Foundation

struct WeatherNow {
    var temperature: Int
    var symbol: String
    var description: String
}

@MainActor
final class WeatherService: NSObject, CLLocationManagerDelegate {

    private let manager = CLLocationManager()
    private var waiters: [CheckedContinuation<CLLocation?, Never>] = []

    override init() {
        super.init()
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyKilometer
    }

    /// `nil`, wenn der Ort nicht erlaubt ist oder kein Internet da ist.
    func current() async -> WeatherNow? {
        guard let loc = await location() else { return nil }
        let lat = String(format: "%.3f", loc.coordinate.latitude)
        let lon = String(format: "%.3f", loc.coordinate.longitude)
        guard let url = URL(string: "https://api.open-meteo.com/v1/forecast?latitude=\(lat)&longitude=\(lon)&current=temperature_2m,weather_code,is_day") else { return nil }
        do {
            let (data, _) = try await URLSession.shared.data(from: url)
            guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
                  let cur = json["current"] as? [String: Any],
                  let temp = (cur["temperature_2m"] as? NSNumber)?.doubleValue,
                  let code = (cur["weather_code"] as? NSNumber)?.intValue else { return nil }
            let isDay = ((cur["is_day"] as? NSNumber)?.intValue ?? 1) == 1
            let (symbol, text) = WeatherService.describe(code: code, isDay: isDay)
            return WeatherNow(temperature: Int(temp.rounded()), symbol: symbol, description: text)
        } catch {
            return nil
        }
    }

    /// Wetter-Codes (WMO) → Symbol und Beschreibung.
    static func describe(code: Int, isDay: Bool) -> (String, String) {
        switch code {
        case 0:            return (isDay ? "sun.max.fill" : "moon.stars.fill", "klar und schön")
        case 1, 2:         return (isDay ? "cloud.sun.fill" : "cloud.moon.fill", "ein bisschen bewölkt")
        case 3:            return ("cloud.fill", "bewölkt")
        case 45, 48:       return ("cloud.fog.fill", "neblig")
        case 51...57:      return ("cloud.drizzle.fill", "es nieselt")
        case 61...67, 80...82: return ("cloud.rain.fill", "es regnet")
        case 71...77, 85, 86:  return ("cloud.snow.fill", "es schneit")
        case 95...99:      return ("cloud.bolt.rain.fill", "es gewittert")
        default:           return ("cloud.fill", "bewölkt")
        }
    }

    // MARK: Ort

    private func location() async -> CLLocation? {
        if let l = manager.location, -l.timestamp.timeIntervalSinceNow < 1800 { return l }
        switch manager.authorizationStatus {
        case .denied, .restricted: return nil
        default: break
        }
        return await withCheckedContinuation { (c: CheckedContinuation<CLLocation?, Never>) in
            waiters.append(c)
            if manager.authorizationStatus == .notDetermined {
                manager.requestWhenInUseAuthorization()
            } else {
                manager.requestLocation()
            }
            Task { @MainActor in
                try? await Task.sleep(nanoseconds: 15_000_000_000)
                self.resolve(nil)
            }
        }
    }

    private func resolve(_ location: CLLocation?) {
        let w = waiters
        waiters = []
        w.forEach { $0.resume(returning: location) }
    }

    nonisolated func locationManagerDidChangeAuthorization(_ m: CLLocationManager) {
        let status = m.authorizationStatus
        Task { @MainActor in
            switch status {
            case .authorizedWhenInUse, .authorizedAlways:
                if !self.waiters.isEmpty { self.manager.requestLocation() }
            case .denied, .restricted:
                self.resolve(nil)
            default:
                break
            }
        }
    }

    nonisolated func locationManager(_ m: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        let last = locations.last
        Task { @MainActor in self.resolve(last) }
    }

    nonisolated func locationManager(_ m: CLLocationManager, didFailWithError error: Error) {
        Task { @MainActor in self.resolve(nil) }
    }
}
