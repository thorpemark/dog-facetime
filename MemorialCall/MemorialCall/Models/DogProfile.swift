import Foundation

struct DogProfile: Codable, Equatable {
    var dogName: String
    var ownerName: String
    var memorialNote: String

    // TODO: Add photo asset identifiers for the clip-generation pipeline.
    // When photos are uploaded, a backend or on-device pipeline will produce
    // personalized idle and reaction clips from reference images.

    static let defaultProfile = DogProfile(
        dogName: "Biscuit",
        ownerName: "Alex",
        memorialNote: ""
    )
}
