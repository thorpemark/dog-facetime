import SwiftUI

struct CallControlsView: View {
    @EnvironmentObject var callViewModel: CallViewModel

    var body: some View {
        HStack(spacing: 48) {
            ControlButton(
                icon: callViewModel.isMuted ? "mic.slash.fill" : "mic.fill",
                label: callViewModel.isMuted ? "Unmute" : "Mute",
                isActive: callViewModel.isMuted
            ) {
                callViewModel.toggleMute()
            }

            ControlButton(
                icon: "phone.down.fill",
                label: "End",
                isDestructive: true
            ) {
                callViewModel.endCall()
            }

            ControlButton(
                icon: "ladybug.fill",
                label: "Debug",
                isActive: callViewModel.showDebugPanel
            ) {
                callViewModel.showDebugPanel.toggle()
            }
        }
    }
}

struct ControlButton: View {
    let icon: String
    let label: String
    var isActive: Bool = false
    var isDestructive: Bool = false
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 6) {
                Image(systemName: icon)
                    .font(.title3)
                    .foregroundStyle(.white)
                    .frame(width: 56, height: 56)
                    .background(backgroundColor)
                    .clipShape(Circle())
                Text(label)
                    .font(.caption2)
                    .foregroundStyle(.white.opacity(0.7))
            }
        }
    }

    private var backgroundColor: Color {
        if isDestructive { return .red }
        if isActive { return .white.opacity(0.35) }
        return .white.opacity(0.2)
    }
}
