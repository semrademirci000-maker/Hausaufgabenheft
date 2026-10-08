//
//  Mood.swift
//  Alle Gefühle von Emo und wie die Augen dabei aussehen.
//

import SwiftUI

/// Die Stimmungen, die Emo zeigen kann.
enum Mood: String, CaseIterable {
    case neutral, happy, laughing, sad, crying, angry, surprised, scared
    case sleepy, sleeping, love, dizzy, dead, thinking, listening
    case suspicious, excited, proud
}

/// Wie ein Auge geformt ist. Alle Werte sind relativ zur Grundgröße,
/// damit SwiftUI weich zwischen zwei Gefühlen überblenden kann.
struct EyeShape: Equatable {
    /// Breite und Höhe als Faktor (1 = normal).
    var width: CGFloat = 1
    var height: CGFloat = 1
    /// Wie weit das obere Lid herunterhängt (0 = offen, 1 = zu).
    var topLid: CGFloat = 0
    /// Schräge des oberen Lids in Grad. Positiv = innen tiefer (böse),
    /// negativ = außen tiefer (traurig).
    var tilt: Double = 0
    /// Wie weit das untere Lid als Bogen hochkommt (0 = gar nicht).
    /// Ergibt die typischen „lachenden“ ^ ^ Augen.
    var bottomLid: CGFloat = 0
    /// Extra-Größe nur für das linke bzw. rechte Auge (z. B. misstrauisch).
    var leftScale: CGFloat = 1
    var rightScale: CGFloat = 1
}

/// Manche Gefühle ersetzen die Augen komplett durch Symbole.
enum EyeStyle: Equatable {
    case normal, hearts, crosses, spirals, chevrons, stars
}

extension Mood {

    var eyes: EyeShape {
        switch self {
        case .neutral:    return EyeShape()
        case .happy:      return EyeShape(width: 1.05, height: 1.0, bottomLid: 0.45)
        case .laughing:   return EyeShape()
        case .sad:        return EyeShape(width: 0.95, height: 0.85, topLid: 0.32, tilt: -20)
        case .crying:     return EyeShape(width: 0.95, height: 0.8, topLid: 0.35, tilt: -24)
        case .angry:      return EyeShape(width: 1.0, height: 0.9, topLid: 0.4, tilt: 24)
        case .surprised:  return EyeShape(width: 1.15, height: 1.22)
        case .scared:     return EyeShape(width: 0.82, height: 1.18, topLid: 0.08, tilt: -10)
        case .sleepy:     return EyeShape(width: 1.0, height: 0.9, topLid: 0.58)
        case .sleeping:   return EyeShape(width: 1.05, height: 0.07)
        case .love:       return EyeShape()
        case .dizzy:      return EyeShape()
        case .dead:       return EyeShape()
        case .thinking:   return EyeShape(width: 0.95, height: 0.9, topLid: 0.22, tilt: 6, rightScale: 1.08)
        case .listening:  return EyeShape(width: 1.06, height: 1.12)
        case .suspicious: return EyeShape(width: 1.0, height: 0.85, topLid: 0.45, bottomLid: 0.18, rightScale: 0.78)
        case .excited:    return EyeShape()
        case .proud:      return EyeShape(width: 1.05, height: 0.95, topLid: 0.3, bottomLid: 0.3)
        }
    }

    var style: EyeStyle {
        switch self {
        case .love:     return .hearts
        case .dead:     return .crosses
        case .dizzy:    return .spirals
        case .laughing: return .chevrons
        case .excited:  return .stars
        default:        return .normal
        }
    }

    /// Manche Gefühle färben die Augen ein bisschen.
    func tint(_ base: Color) -> Color {
        switch self {
        case .angry:  return Color(red: 1.0, green: 0.32, blue: 0.28)
        case .love:   return Color(red: 1.0, green: 0.38, blue: 0.62)
        case .crying: return Color(red: 0.45, green: 0.62, blue: 1.0)
        case .dead:   return base.opacity(0.75)
        case .excited: return Color(red: 1.0, green: 0.85, blue: 0.3)
        default:      return base
        }
    }

    /// Passender Effekt rund um die Augen.
    var defaultEffect: FaceEffect {
        switch self {
        case .crying:     return .tears
        case .love:       return .hearts
        case .angry:      return .anger
        case .surprised:  return .exclamation
        case .scared:     return .sweat
        case .sleeping:   return .zzz
        case .thinking:   return .question
        case .excited:    return .sparkles
        default:          return .none
        }
    }

    /// Passendes Geräusch.
    var sound: SoundFX.Sound? {
        switch self {
        case .happy, .proud: return .happy
        case .laughing:      return .laugh
        case .sad, .crying:  return .sad
        case .angry:         return .angry
        case .surprised:     return .surprised
        case .scared:        return .scared
        case .love:          return .love
        case .dizzy:         return .dizzy
        case .thinking:      return .think
        case .excited:       return .happy
        case .sleepy:        return .yawn
        default:             return nil
        }
    }
}

/// Kleine Effekte rund um das Gesicht.
enum FaceEffect: Equatable {
    case none, zzz, tears, hearts, notes, sweat, question, anger, sparkles, exclamation
}
