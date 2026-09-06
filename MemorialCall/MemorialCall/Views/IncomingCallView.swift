import SwiftUI

struct IncomingCallView: View {
    @EnvironmentObject var profileStore: ProfileStore
    @EnvironmentObject var callViewModel: CallViewModel
    @State private var pulse = false

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [Color(red: 0.05, green: 0.05, blue: 0.08), Color(red: 0.12, green: 0.12, blue: 0.16)],
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea()

            VStack(spacing: 0) {
                Spacer()

                VStack(spacing: 16) {
                    ZStack {
                        Circle()
                            .fill(.white.opacity(0.08))
                            .frame(width: 140, height: 140)
                            .scaleEffect(pulse ? 1.08 : 1.0)
                            .animation(.easeInOut(duration: 1.2).repeatForever(autoreverses: true), value: pulse)

                        Image(systemName: "pawprint.fill")
                            .font(.system(size: 56))
                            .foregroundStyle(.white)
                    }

                    Text("Memorial Call")
                        .font(.subheadline)
                        .foregroundStyle(.white.opacity(0.6))

                    Text(profileStore.profile.dogName)
                        .font(.system(size: 36, weight: .light))
                        .foregroundStyle(.white)

                    Text("FaceTime Video")
                        .font(.subheadline)
                        .foregroundStyle(.white.opacity(0.5))
                }

                Spacer()

                HStack(spacing: 80) {
                    CallActionButton(
                        icon: "phone.down.fill",
                        label: "Decline",
                        color: .red
                    ) {
                        callViewModel.endCall()
                        callViewModel.returnToIdleAfterEnd()
                    }

                    CallActionButton(
                        icon: "video.fill",
                        label: "Accept",
                        color: .green
                    ) {
                        callViewModel.acceptCall()
                    }
                }
                .padding(.bottom, 60)
            }
        }
        .onAppear { pulse = true }
    }
}

struct CallActionButton: View {
    let icon: String
    let label: String
    let color: Color
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 8) {
                Image(systemName: icon)
                    .font(.title2)
                    .foregroundStyle(.white)
                    .frame(width: 68, height: 68)
                    .background(color)
                    .clipShape(Circle())
                Text(label)
                    .font(.caption)
                    .foregroundStyle(.white.opacity(0.8))
            }
        }
    }
}
