import SwiftUI

struct OnboardingView: View {
    @EnvironmentObject var profileStore: ProfileStore
    @StateObject private var viewModel: OnboardingViewModel

    init() {
        _viewModel = StateObject(wrappedValue: OnboardingViewModel(profile: .defaultProfile))
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    Text("Create a gentle space to remember your companion. Their video will loop quietly, responding when you speak familiar words.")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }

                Section("Your Companion") {
                    TextField("Dog's name", text: $viewModel.dogName)
                        .textContentType(.name)
                        .autocorrectionDisabled()

                    // TODO: Photo upload stub for clip-generation pipeline.
                    // When implemented, users will upload 3–5 reference photos here.
                    // Those photos feed an offline or cloud pipeline that produces
                    // personalized idle and reaction video clips.
                    HStack {
                        Image(systemName: "photo.on.rectangle.angled")
                            .foregroundStyle(.secondary)
                        Text("Add photos (coming soon)")
                            .foregroundStyle(.secondary)
                        Spacer()
                        Text("TODO")
                            .font(.caption)
                            .foregroundStyle(.tertiary)
                    }
                }

                Section("About You") {
                    TextField("Your name", text: $viewModel.ownerName)
                        .textContentType(.name)
                        .autocorrectionDisabled()
                }

                Section("Memorial Note") {
                    TextField("A short note (optional)", text: $viewModel.memorialNote, axis: .vertical)
                        .lineLimit(3...6)
                }

                Section {
                    Button("Continue") {
                        profileStore.profile = viewModel.buildProfile()
                        profileStore.completeOnboarding()
                    }
                    .frame(maxWidth: .infinity)
                    .font(.headline)
                }
            }
            .navigationTitle("Memorial Call")
            .onAppear {
                viewModel.dogName = profileStore.profile.dogName
                viewModel.ownerName = profileStore.profile.ownerName
                viewModel.memorialNote = profileStore.profile.memorialNote
            }
        }
    }
}
