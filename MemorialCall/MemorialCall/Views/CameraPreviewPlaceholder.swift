import SwiftUI

struct CameraPreviewPlaceholder: View {
    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 12)
                .fill(Color(white: 0.15))
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .strokeBorder(.white.opacity(0.3), lineWidth: 1)
                )

            VStack(spacing: 4) {
                Image(systemName: "person.fill")
                    .font(.title3)
                    .foregroundStyle(.white.opacity(0.5))
                Text("You")
                    .font(.caption2)
                    .foregroundStyle(.white.opacity(0.4))
            }
        }
        .frame(width: 100, height: 140)
        .shadow(color: .black.opacity(0.4), radius: 8, y: 4)
    }
}
