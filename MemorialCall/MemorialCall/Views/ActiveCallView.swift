import SwiftUI

struct ActiveCallView: View {
    @EnvironmentObject var profileStore: ProfileStore
    @EnvironmentObject var callViewModel: CallViewModel

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            DualVideoView(mixer: callViewModel.videoMixer)
                .ignoresSafeArea()

            VStack {
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(profileStore.profile.dogName)
                            .font(.headline)
                            .foregroundStyle(.white)
                        HStack(spacing: 4) {
                            Circle()
                                .fill(.green)
                                .frame(width: 8, height: 8)
                            Text(statusText)
                                .font(.caption)
                                .foregroundStyle(.white.opacity(0.7))
                        }
                    }
                    Spacer()
                }
                .padding(.horizontal, 20)
                .padding(.top, 16)

                Spacer()

                HStack {
                    Spacer()
                    CameraPreviewPlaceholder()
                        .padding(.trailing, 16)
                        .padding(.bottom, 8)
                }

                CallControlsView()
                    .padding(.bottom, 40)

                if callViewModel.showDebugPanel {
                    DebugPanelView()
                        .padding(.bottom, 16)
                        .transition(.move(edge: .bottom).combined(with: .opacity))
                }
            }
        }
        .onAppear {
            callViewModel.updateListeningProfile(
                dogName: profileStore.profile.dogName,
                ownerName: profileStore.profile.ownerName
            )
        }
        .onChange(of: profileStore.profile.dogName) { _, newValue in
            callViewModel.updateListeningProfile(
                dogName: newValue,
                ownerName: profileStore.profile.ownerName
            )
        }
    }

    private var statusText: String {
        switch callViewModel.behaviorState {
        case .idle: return "Connected"
        case .listen: return callViewModel.isMuted ? "Muted" : "Listening…"
        case .react: return "Responding…"
        case .cooldown: return "Connected"
        }
    }
}
