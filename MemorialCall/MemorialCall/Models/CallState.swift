import Foundation

/// High-level call UI phase.
enum CallPhase: Equatable {
    case onboarding
    case incoming
    case active
    case ended
}

/// Behavior state machine for video playback and listening.
enum BehaviorState: Equatable {
    case idle
    case listen
    case react(clipID: String)
    case cooldown

    var isListening: Bool {
        switch self {
        case .listen: return true
        default: return false
        }
    }
}
