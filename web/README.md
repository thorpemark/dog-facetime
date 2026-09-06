# Memorial Call — Web App

A browser-based memorial video call experience. Open it in **Safari** (iPhone/iPad) or **Chrome** (PC) — no Mac or Xcode required.

Simulates FaceTiming a beloved dog who has passed away: incoming call ring, full-screen looping video, self-preview placeholder, and reactions when you speak familiar words.

## Quick Start (Local)

```bash
cd web
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

### Try on Your Phone Tonight

1. Run `npm run dev` on your computer.
2. Find your computer's local IP (e.g. `192.168.1.42`).
3. On iPhone/iPad (same Wi‑Fi), open Safari → `http://YOUR_IP:5173`
4. Complete onboarding, tap **Start Memorial Call**, **Accept**, then allow microphone when prompted.

> **Tip:** For HTTPS on mobile (some browsers require it for mic), use a tunnel like [ngrok](https://ngrok.com/) or deploy to GitHub Pages (below).

## Production Build

```bash
cd web
npm run build    # outputs to web/dist
npm run preview  # serve dist locally
```

## Deploy to GitHub Pages

A workflow at [`.github/workflows/deploy-web.yml`](../.github/workflows/deploy-web.yml) builds and deploys `web/` on every push to `main`.

**One-time repo settings (2 clicks):**

1. GitHub → **Settings** → **Pages**
2. Under **Build and deployment**, set **Source** to **GitHub Actions**

After the next push to `main`, the site will be live at:

**https://thorpemark.github.io/dog-facetime/**

(Replace `thorpemark/dog-facetime` with your fork if different.)

## Using the App

| Screen | What it does |
|--------|--------------|
| **Onboarding** | Dog name, your name, optional memorial note (saved in `localStorage`) |
| **Home** | Start a memorial call or edit settings |
| **Incoming Call** | FaceTime-style ring — Accept or Decline |
| **Active Call** | Full-screen dog video, PiP self-preview, mute/end controls |
| **Debug Panel** | Tap 🐞 during a call to trigger reactions manually or type phrases |

### Behavior Flow

```
idle → listen → react → cooldown → idle
```

- **idle** — loops the idle clip
- **listen** — microphone + Web Speech API transcribes speech
- **react** — crossfades to a matching reaction clip
- **cooldown** — brief pause before returning to idle

## Speech Recognition

Uses the **Web Speech API** (`SpeechRecognition` / `webkitSpeechRecognition`):

| Browser | Support |
|---------|---------|
| Chrome (desktop/Android) | ✅ Full |
| Safari (iOS/macOS) | ✅ With mic permission |
| Firefox | ❌ Use debug panel + typed phrases |

When speech isn't available, use the **Debug Panel** (🐞 button):

- Tap reaction buttons to fire clips manually
- Type a phrase and press **Send** (e.g. "good boy", "walk")

## Keyword → Clip Mapping

Rules live in [`public/keyword_rules.json`](public/keyword_rules.json):

```json
{
  "id": "walk",
  "phrases": ["walk", "go for a walk", "wanna walk"],
  "clipFileName": "react_walk.mp4",
  "priority": 8,
  "description": "Walk"
}
```

- `{dogName}` and `{ownerName}` are replaced from onboarding.
- Higher **priority** wins when multiple phrases match.

## Replacing Placeholder Clips

Placeholder colored videos ship in [`public/clips/`](public/clips/). Replace with real footage of your dog:

| File | Purpose |
|------|---------|
| `idle.mp4` | Always-looping clip (~3–6 s, seamless loop) |
| `react_biscuit.mp4` | Dog's name spoken |
| `react_walk.mp4` | "walk" phrases |
| `react_treat.mp4` | "treat" / "cookie" |
| `react_good.mp4` | "good boy/girl" |
| `react_no.mp4` | "no" |
| `react_come.mp4` | "come here" |
| `react_owner.mp4` | Owner's name spoken |

**Format:** H.264 MP4, 720×1280 portrait recommended.

## Alternative: Deploy to Vercel

1. Import this repo at [vercel.com/new](https://vercel.com/new)
2. Set **Root Directory** to `web`
3. Deploy — Vercel auto-detects Vite

No `GITHUB_PAGES` env var needed; Vercel serves from `/`.

## Project Structure

```
web/
├── public/
│   ├── clips/              # Video assets
│   └── keyword_rules.json  # Phrase → clip mapping
├── src/
│   ├── components/         # UI screens
│   ├── context/            # App state
│   ├── hooks/              # Video mixer, speech, profile
│   └── utils/              # Keyword matching
├── index.html
├── vite.config.ts
└── package.json
```

## Related

The native iOS app lives in [`MemorialCall/`](../MemorialCall/) — requires a Mac with Xcode. Use **`web/`** to run the experience today in any browser.
