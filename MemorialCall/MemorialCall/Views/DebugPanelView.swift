import SwiftUI

struct DebugPanelView: View {
    @EnvironmentObject var callViewModel: CallViewModel
    @EnvironmentObject var profileStore: ProfileStore

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Debug Panel")
                    .font(.headline)
                Spacer()
                Button {
                    callViewModel.showDebugPanel = false
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundStyle(.secondary)
                }
            }

            Text("State: \(stateLabel)")
                .font(.caption)
                .foregroundStyle(.secondary)

            if !callViewModel.keywordSpotter.lastTranscript.isEmpty {
                Text("Heard: \"\(callViewModel.keywordSpotter.lastTranscript)\"")
                    .font(.caption)
                    .lineLimit(2)
            }

            Divider()

            Text("Trigger Reactions")
                .font(.subheadline.bold())

            ScrollView {
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 8) {
                    ForEach(callViewModel.rulesConfig?.rules ?? []) { rule in
                        Button {
                            callViewModel.triggerReaction(clipID: rule.id)
                        } label: {
                            Text(rule.description ?? rule.id)
                                .font(.caption)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 8)
                                .background(.ultraThinMaterial)
                                .clipShape(RoundedRectangle(cornerRadius: 8))
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
            .frame(maxHeight: 160)
        }
        .padding()
        .background(.regularMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .padding(.horizontal)
    }

    private var stateLabel: String {
        switch callViewModel.behaviorState {
        case .idle: return "idle"
        case .listen: return "listen"
        case .react(let id): return "react(\(id))"
        case .cooldown: return "cooldown"
        }
    }
}
