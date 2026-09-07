# Memorial Call

A gentle memorial experience that simulates FaceTiming a beloved dog who has passed away — full-screen video, familiar reactions when you speak their name, and a warm call-like UI.

## Run Today (No Mac Required)

Use the **web app** in any modern browser:

```bash
cd web
npm install
npm run dev
```

Open the local URL on your PC, or on iPhone/iPad Safari at `http://YOUR_COMPUTER_IP:5173` (same Wi‑Fi).

See **[`web/README.md`](web/README.md)** for phone setup, speech recognition tips, and deployment.

### Deployed URL (GitHub Pages)

After enabling **Pages → Source: GitHub Actions** in repo settings, pushes to `main` publish:

**https://thorpemark.github.io/dog-facetime/**

## Native iOS App (Future / With Mac)

The SwiftUI app in [`MemorialCall/`](MemorialCall/) targets iOS 17+ and requires Xcode on a Mac.

```bash
# Open in Xcode 15+
open MemorialCall/MemorialCall.xcodeproj
```

See the sections below for iOS-specific details (clips, keywords, CI).

---

## Repository Layout

| Path | Purpose |
|------|---------|
| **`web/`** | **Run now** — Vite + React web app for Safari/Chrome (PC, iPhone, iPad) |
| **`MemorialCall/`** | Native iOS app — requires Mac + Xcode |
| **`.github/workflows/deploy-web.yml`** | Builds & deploys `web/` to GitHub Pages |
| **`.github/workflows/ios-simulator-build.yml`** | CI build for iOS Simulator (no Mac needed to verify) |

## Web App Features

- Create personal memorials with 1–3 call targets (Dog A, Dog B, Together)
- Upload photos; crossfading Ken Burns playback during calls
- **Call-screen photo controls** — Side-drawer Ken Burns speed (saved in browser), swipe or tap prev/next between photos
- **Portrait focal points** — Tap photos on create/edit to choose what stays centered in portrait calls
- Share links for family (`/m/:shareId`) — no account needed
- Secret edit links (`/edit/:editToken`) for owners
- Optional creator sign-in (magic link + Google) with **My memorials** dashboard
- Incoming call → Accept → full-screen memorial call UI
- Web Speech API keyword listening (debug panel fallback)
- Supabase backend with localStorage demo mode when env vars are missing
- Configurable `keyword_rules.json` → reaction mapping
- GitHub Pages deploy at `/dog-facetime/` base path

## iOS App — Quick Start

1. Clone this repository.
2. Open `MemorialCall/MemorialCall.xcodeproj` in Xcode 15 or later.
3. Select an iPhone simulator (e.g. iPhone 15).
4. Press **⌘R** to build and run.

On first launch you'll complete a short onboarding (dog name, your name, optional memorial note), then tap **Start Memorial Call** to begin.

## Using the iOS App

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

Placeholder colored videos ship in both `web/public/clips/` and `MemorialCall/MemorialCall/Resources/Clips/`. Replace them with real footage of your dog.

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

## Keyword → Clip Mapping

Rules live in `web/public/keyword_rules.json` (web) and `MemorialCall/MemorialCall/Resources/keyword_rules.json` (iOS):

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

### Web

Uses the **Web Speech API**. Chrome and Safari support it; Firefox does not — use the debug panel instead.

### iOS

The app uses Apple's **Speech** framework with on-device recognition when available. Privacy strings are in `Info.plist`:

- `NSMicrophoneUsageDescription`
- `NSSpeechRecognitionUsageDescription`

## CI / No Mac

### Web (GitHub Pages)

Workflow: [`.github/workflows/deploy-web.yml`](.github/workflows/deploy-web.yml)

**One-time setup:** GitHub → Settings → Pages → Source → **GitHub Actions**

### iOS Simulator Build

You don't need a Mac to verify the iOS project builds. GitHub Actions compiles it on `macos-latest` for the iOS Simulator — no signing secrets required.

| Setting | Value |
|---------|-------|
| **Workflow** | [`.github/workflows/ios-simulator-build.yml`](.github/workflows/ios-simulator-build.yml) |
| **Xcode project** | `MemorialCall/MemorialCall.xcodeproj` |
| **Scheme** | `MemorialCall` |

Download artifacts from GitHub → **Actions** → select run → **Artifacts**.

> Simulator builds run in Xcode Simulator on a Mac; they cannot be installed on a physical iPhone without a device-targeted rebuild.

## Simulator / Browser Tips

- **Web on desktop:** Use the 🐞 debug panel to trigger reactions, or type phrases in the debug input.
- **Web on iPhone:** Allow microphone in Safari; speak naturally during a call.
- **iOS Simulator:** Limited microphone — use the debug panel (ladybug button).

## TODO / Next Steps

- [x] Photo upload for memorial sharing (Supabase + demo mode)
- [x] Share links for family (`/m/:shareId`)
- [ ] Real AI video generation from photos (v2)
- [ ] Porcupine wake-word integration (iOS) for faster keyword detection
- [ ] Custom ringtone / memorial sound
- [ ] True front-camera PiP preview (currently a placeholder)
- [ ] Clip crossfade duration settings
- [ ] Export/share memorial moment snapshots

## Supabase Setup (Web Sharing)

See **[`web/README.md`](web/README.md)** for full details. Summary:

1. Create a Supabase project
2. Run [`web/supabase/migration.sql`](web/supabase/migration.sql) in the SQL editor
3. Run [`web/supabase/migration_auth_owners.sql`](web/supabase/migration_auth_owners.sql) for creator accounts
4. Configure Auth redirect URLs (site root `https://thorpemark.github.io/dog-facetime/`, not `/my` — see [`web/README.md`](web/README.md))
5. Copy `web/.env.example` → `web/.env` with your URL and anon key
6. Rebuild / redeploy

For GitHub Pages, add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as repository secrets and update the deploy workflow, or build locally with `.env` and deploy `dist/`.

## License

Private memorial use prototype. Replace placeholder clips with your own footage.
