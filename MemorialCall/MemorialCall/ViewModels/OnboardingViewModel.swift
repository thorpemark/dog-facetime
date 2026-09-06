import Foundation

@MainActor
final class OnboardingViewModel: ObservableObject {
    @Published var dogName: String
    @Published var ownerName: String
    @Published var memorialNote: String

    init(profile: DogProfile) {
        dogName = profile.dogName
        ownerName = profile.ownerName
        memorialNote = profile.memorialNote
    }

    func buildProfile() -> DogProfile {
        DogProfile(
            dogName: dogName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? "Biscuit" : dogName,
            ownerName: ownerName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? "Friend" : ownerName,
            memorialNote: memorialNote
        )
    }
}
