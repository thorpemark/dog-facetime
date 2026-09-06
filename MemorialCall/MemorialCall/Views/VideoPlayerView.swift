import AVKit
import SwiftUI

struct VideoPlayerLayerView: UIViewRepresentable {
    let player: AVPlayer

    func makeUIView(context: Context) -> PlayerUIView {
        let view = PlayerUIView()
        view.playerLayer.player = player
        view.playerLayer.videoGravity = .resizeAspectFill
        return view
    }

    func updateUIView(_ uiView: PlayerUIView, context: Context) {
        uiView.playerLayer.player = player
    }
}

final class PlayerUIView: UIView {
    override class var layerClass: AnyClass { AVPlayerLayer.self }
    var playerLayer: AVPlayerLayer { layer as! AVPlayerLayer }
}

struct DualVideoView: View {
    @ObservedObject var mixer: VideoMixer

    var body: some View {
        ZStack {
            if let primary = mixer.primaryPlayer {
                VideoPlayerLayerView(player: primary)
                    .opacity(mixer.primaryOpacity)
            }
            if let secondary = mixer.secondaryPlayer {
                VideoPlayerLayerView(player: secondary)
                    .opacity(mixer.secondaryOpacity)
            }
        }
        .animation(.easeInOut(duration: 0.4), value: mixer.primaryOpacity)
        .animation(.easeInOut(duration: 0.4), value: mixer.secondaryOpacity)
    }
}
