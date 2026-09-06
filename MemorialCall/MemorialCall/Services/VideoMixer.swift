import AVFoundation
import Combine
import Foundation

/// Manages dual-player crossfade between idle loop and reaction clips.
@MainActor
final class VideoMixer: ObservableObject {
    @Published var primaryPlayer: AVPlayer?
    @Published var secondaryPlayer: AVPlayer?
    @Published var primaryOpacity: Double = 1.0
    @Published var secondaryOpacity: Double = 0.0
    @Published var currentClipID: String = "idle"

    private var config: KeywordRulesConfig?
    private var activeSlot: PlayerSlot = .primary
    private var endObserver: NSObjectProtocol?
    private var onReactionComplete: (() -> Void)?

    private enum PlayerSlot {
        case primary, secondary
    }

    func configure(with config: KeywordRulesConfig) {
        self.config = config
        loadIdle()
    }

    func loadIdle() {
        guard let config else { return }
        currentClipID = "idle"
        let player = makePlayer(for: config.idleClip, loop: true)
        primaryPlayer = player
        secondaryPlayer = nil
        primaryOpacity = 1.0
        secondaryOpacity = 0.0
        activeSlot = .primary
        player?.play()
    }

    func playReaction(clipID: String, crossfadeDuration: TimeInterval = 0.4, onComplete: @escaping () -> Void) {
        guard let config,
              let rule = config.rules.first(where: { $0.id == clipID }) else { return }

        onReactionComplete = onComplete
        currentClipID = clipID

        let reactionPlayer = makePlayer(for: rule.clipFileName, loop: false)
        guard let reactionPlayer else { return }

        let incomingSlot: PlayerSlot = activeSlot == .primary ? .secondary : .primary
        if incomingSlot == .secondary {
            secondaryPlayer = reactionPlayer
        } else {
            primaryPlayer = reactionPlayer
        }

        reactionPlayer.play()
        crossfade(to: incomingSlot, duration: crossfadeDuration)

        if let observer = endObserver {
            NotificationCenter.default.removeObserver(observer)
        }
        endObserver = NotificationCenter.default.addObserver(
            forName: .AVPlayerItemDidPlayToEndTime,
            object: reactionPlayer.currentItem,
            queue: .main
        ) { [weak self] _ in
            Task { @MainActor in
                self?.handleReactionEnded(crossfadeDuration: crossfadeDuration)
            }
        }
    }

    func stop() {
        primaryPlayer?.pause()
        secondaryPlayer?.pause()
        if let observer = endObserver {
            NotificationCenter.default.removeObserver(observer)
            endObserver = nil
        }
    }

    private func handleReactionEnded(crossfadeDuration: TimeInterval) {
        guard let config else { return }
        let idlePlayer = makePlayer(for: config.idleClip, loop: true)
        guard let idlePlayer else { return }

        let incomingSlot: PlayerSlot = activeSlot == .primary ? .secondary : .primary
        if incomingSlot == .secondary {
            secondaryPlayer = idlePlayer
        } else {
            primaryPlayer = idlePlayer
        }

        idlePlayer.play()
        crossfade(to: incomingSlot, duration: crossfadeDuration)
        currentClipID = "idle"
        activeSlot = incomingSlot

        onReactionComplete?()
        onReactionComplete = nil
    }

    private func crossfade(to slot: PlayerSlot, duration: TimeInterval) {
        _ = duration
        if slot == .primary {
            primaryOpacity = 1.0
            secondaryOpacity = 0.0
        } else {
            primaryOpacity = 0.0
            secondaryOpacity = 1.0
        }
        activeSlot = slot
    }

    private func makePlayer(for fileName: String, loop: Bool) -> AVPlayer? {
        let baseName = (fileName as NSString).deletingPathExtension
        let ext = (fileName as NSString).pathExtension.isEmpty ? "mp4" : (fileName as NSString).pathExtension

        guard let url = Bundle.main.url(forResource: baseName, withExtension: ext, subdirectory: "Clips")
            ?? Bundle.main.url(forResource: baseName, withExtension: ext) else {
            print("[VideoMixer] Missing clip: \(fileName)")
            return nil
        }

        let item = AVPlayerItem(url: url)
        let player = AVPlayer(playerItem: item)
        player.actionAtItemEnd = .none

        if loop {
            NotificationCenter.default.addObserver(
                forName: .AVPlayerItemDidPlayToEndTime,
                object: item,
                queue: .main
            ) { [weak player] _ in
                player?.seek(to: .zero)
                player?.play()
            }
        }

        return player
    }
}
