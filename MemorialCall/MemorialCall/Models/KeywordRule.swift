import Foundation

struct KeywordRule: Codable, Identifiable, Equatable {
    let id: String
    let phrases: [String]
    let clipFileName: String
    let priority: Int
    let description: String?

    /// Returns true when any configured phrase appears in the transcript.
    func matches(transcript: String, dogName: String, ownerName: String) -> Bool {
        let normalized = transcript.lowercased()
        for phrase in resolvedPhrases(dogName: dogName, ownerName: ownerName) {
            if normalized.contains(phrase.lowercased()) {
                return true
            }
        }
        return false
    }

    private func resolvedPhrases(dogName: String, ownerName: String) -> [String] {
        phrases.map { phrase in
            phrase
                .replacingOccurrences(of: "{dogName}", with: dogName)
                .replacingOccurrences(of: "{ownerName}", with: ownerName)
        }
    }
}

struct KeywordRulesConfig: Codable {
    let version: Int
    let idleClip: String
    let rules: [KeywordRule]
}
