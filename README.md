# Memorial Call

A gentle iOS app that simulates FaceTiming a beloved dog who has passed away. The experience feels like a real FaceTime call: an incoming ring, full-screen video of your companion, a small self-preview, and familiar reactions when you speak their name or favorite phrases.

Built with **SwiftUI** and **AVFoundation**. Targets **iOS 17+**.

## Quick Start

1. Clone this repository.
2. Open `MemorialCall/MemorialCall.xcodeproj` in Xcode 15 or later.
3. Select an iPhone simulator (e.g. iPhone 15).
4. Press **⌘R** to build and run.

On first launch you'll complete a short onboarding (dog name, your name, optional memorial note), then tap **Start Memorial Call** to begin.

## Using the App

| Screen | What it does |
|--------|--------------|
| **Onboarding** | Set dog name (default: Biscuit), owner name, memorial note |
| **Home** | Start a memorial call or edit settings |
| **Incoming Call** | FaceTime-style ring screen — Accept or Decline |
| **Active Call** | Full-screen looping dog video, PiP self-preview, mute/end controls |
| **Debug Panel** | Tap the ladybug icon during a call to manually trigger any reaction (essential for Simulator) |

### Behavior State Machine

```
idle → listen → react → cooldown → idle
```

- **idle** — loops the idle clip (dog looking at camera)
- **listen** — microphone active, Speech framework transcribes speech
- **react** — crossfades to a matching reaction clip
- **cooldown** — brief pause before returning to idle

## Replacing Placeholder Clips

Placeholder colored videos ship in `MemorialCall/Resources/Clips/`. Replace them with real footage of your dog.

### Naming Convention

| File | Purpose |
|------|---------|
| `idle.mp4` | Always-looping clip: dog calmly looking at camera (~3–6 s, seamless loop) |
| `react_biscuit.mp4` | Reaction when dog's name is spoken |
| `react_walk.mp4` | Reaction to "walk" phrases |
| `react_treat.mp4` | Reaction to "treat" / "cookie" |
| `react_good.mp4` | Reaction to "good boy/girl" |
| `react_no.mp4` | Reaction to "no" |
| `react_come.mp4` | Reaction to "come here" |
| `react_owner.mp4` | Reaction when owner's name is spoken |

### Clip Guidelines

- **Format:** H.264 MP4, 720×1280 (portrait) recommended
- **Idle:** 3–6 seconds, designed to loop seamlessly
- **Reactions:** 1–3 seconds, natural start/end (crossfade handles transitions)
- After adding files in Finder, they appear automatically in Xcode (folder reference is synced)

## Keyword → Clip Mapping

Rules live in `MemorialCall/Resources/keyword_rules.json`:

```json
{
  "id": "walk",
  "phrases": ["walk", "go for a walk", "wanna walk"],
  "clipFileName": "react_walk.mp4",
  "priority": 8,
  "description": "Walk"
}
```

- **`{dogName}`** and **`{ownerName}`** are replaced at runtime from onboarding.
- Higher **priority** wins when multiple phrases match.
- Add new rules + matching `react_*.mp4` files to extend behavior.

## Microphone & Speech Recognition

The app uses Apple's **Speech** framework with on-device recognition when available. Privacy strings are in `Info.plist`:

- `NSMicrophoneUsageDescription`
- `NSSpeechRecognitionUsageDescription`

### Picovoice Porcupine (Future)

For lower-latency wake-word detection, see `KeywordSpotter.swift` — it documents where to plug in [Picovoice Porcupine](https://picovoice.ai/platform/porcupine/) as an alternative or supplement to full STT.

## Project Structure

```
MemorialCall/
├── MemorialCall.xcodeproj
└── MemorialCall/
    ├── MemorialCallApp.swift       # App entry point
    ├── Models/                     # CallState, DogProfile, KeywordRule
    ├── Services/                   # VideoMixer, KeywordSpotter, ProfileStore
    ├── ViewModels/                 # CallViewModel, OnboardingViewModel
    ├── Views/                      # SwiftUI screens
    ├── Resources/
    │   ├── keyword_rules.json      # Phrase → clip mapping
    │   └── Clips/                  # Video assets
    ├── Assets.xcassets
    └── Info.plist
```

## Simulator Tips

- The Simulator has limited microphone support. Use the **Debug Panel** (ladybug button) to trigger reactions manually.
- On a physical device, grant microphone and speech permissions, then speak naturally during a call.

## TODO / Next Steps

- [ ] Photo upload for personalized clip generation pipeline
- [ ] Porcupine wake-word integration for faster keyword detection
- [ ] Custom ringtone / memorial sound
- [ ] True front-camera PiP preview (currently a placeholder)
- [ ] Clip crossfade duration settings
- [ ] Export/share memorial moment snapshots

## License

Private memorial use prototype. Replace placeholder clips with your own footage.
