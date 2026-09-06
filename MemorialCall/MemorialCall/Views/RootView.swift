import SwiftUI

struct RootView: View {
    @EnvironmentObject var profileStore: ProfileStore
    @EnvironmentObject var callViewModel: CallViewModel

    var body: some View {
        Group {
            switch callViewModel.callPhase {
            case .onboarding:
                if profileStore.hasCompletedOnboarding {
                    HomeView()
                } else {
                    OnboardingView()
                }
            case .incoming:
                IncomingCallView()
            case .active:
                ActiveCallView()
            case .ended:
                CallEndedView()
            }
        }
        .animation(.easeInOut(duration: 0.35), value: callViewModel.callPhase)
    }
}

struct HomeView: View {
    @EnvironmentObject var profileStore: ProfileStore
    @EnvironmentObject var callViewModel: CallViewModel

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [Color(red: 0.12, green: 0.14, blue: 0.18), Color(red: 0.08, green: 0.10, blue: 0.12)],
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea()

            VStack(spacing: 32) {
                Spacer()

                VStack(spacing: 12) {
                    Image(systemName: "pawprint.circle.fill")
                        .font(.system(size: 72))
                        .foregroundStyle(.white.opacity(0.9))

                    Text(profileStore.profile.dogName)
                        .font(.largeTitle.bold())
                        .foregroundStyle(.white)

                    if !profileStore.profile.memorialNote.isEmpty {
                        Text(profileStore.profile.memorialNote)
                            .font(.body)
                            .foregroundStyle(.white.opacity(0.7))
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, 32)
                    }
                }

                Spacer()

                Button {
                    callViewModel.beginIncomingCall()
                } label: {
                    Label("Start Memorial Call", systemImage: "video.fill")
                        .font(.headline)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(.white.opacity(0.15))
                        .clipShape(RoundedRectangle(cornerRadius: 16))
                }
                .padding(.horizontal, 32)

                Button("Edit Memorial") {
                    profileStore.resetOnboarding()
                }
                .font(.subheadline)
                .foregroundStyle(.white.opacity(0.6))
                .padding(.bottom, 40)
            }
        }
        .task {
            await callViewModel.requestSpeechAuthorization()
        }
    }
}

struct CallEndedView: View {
    @EnvironmentObject var callViewModel: CallViewModel

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            VStack(spacing: 24) {
                Image(systemName: "phone.down.fill")
                    .font(.system(size: 48))
                    .foregroundStyle(.white.opacity(0.8))
                Text("Call Ended")
                    .font(.title2)
                    .foregroundStyle(.white)
                Button("Done") {
                    callViewModel.returnToIdleAfterEnd()
                }
                .buttonStyle(.borderedProminent)
            }
        }
    }
}
