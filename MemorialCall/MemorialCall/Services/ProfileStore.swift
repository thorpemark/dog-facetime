import Foundation

@MainActor
final class ProfileStore: ObservableObject {
    @Published var profile: DogProfile {
        didSet { save() }
    }

    @Published var hasCompletedOnboarding: Bool {
        didSet { UserDefaults.standard.set(hasCompletedOnboarding, forKey: Keys.onboarding) }
    }

    private enum Keys {
        static let profile = "memorial.dogProfile"
        static let onboarding = "memorial.onboardingComplete"
    }

    init() {
        if let data = UserDefaults.standard.data(forKey: Keys.profile),
           let decoded = try? JSONDecoder().decode(DogProfile.self, from: data) {
            profile = decoded
        } else {
            profile = .defaultProfile
        }
        hasCompletedOnboarding = UserDefaults.standard.bool(forKey: Keys.onboarding)
    }

    func completeOnboarding() {
        hasCompletedOnboarding = true
    }

    func resetOnboarding() {
        hasCompletedOnboarding = false
    }

    private func save() {
        guard let data = try? JSONEncoder().encode(profile) else { return }
        UserDefaults.standard.set(data, forKey: Keys.profile)
    }
}
