# Memorial Call — Web App

A browser-based memorial video call experience. Create personal dog memorials, upload photos, share a link with family, and call one dog or two together — no account needed.

## Quick Start (Local)

```bash
cd web
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

Without Supabase env vars, the app runs in **demo mode** (memorials saved in `localStorage`). A banner reminds you to connect Supabase for real sharing.

### Try on Your Phone Tonight

1. Run `npm run dev` on your computer.
2. Find your computer's local IP (e.g. `192.168.1.42`).
3. On iPhone/iPad (same Wi‑Fi), open Safari → `http://YOUR_IP:5173`
4. Tap **Create a Memorial**, add photos, copy the share link, open it on your phone.

> **Tip:** For HTTPS on mobile (some browsers require it for mic), use a tunnel like [ngrok](https://ngrok.com/) or deploy to GitHub Pages (below).

## Supabase Setup (Sharing)

1. Create a project at [supabase.com](https://supabase.com).
2. In the SQL Editor, paste and run [`supabase/migration.sql`](supabase/migration.sql).
3. Copy `web/.env.example` → `web/.env` and set:
   - `VITE_SUPABASE_URL` — Project Settings → API → Project URL
   - `VITE_SUPABASE_ANON_KEY` — Project Settings → API → `anon` `public` key
4. Rebuild and redeploy (`npm run build` locally, or push to `main` for GitHub Pages).

After setup, memorials are stored in Supabase with public share links (`/m/:shareId`) and secret edit links (`/edit/:editToken`). Photos upload to the `memorial-photos` storage bucket.

## Routes

| Path | Purpose |
|------|---------|
| `/` | Home — create a memorial or open a link |
| `/create` | Step-by-step memorial creation |
| `/m/:shareId` | Public share — pick who to call, start FaceTime UI |
| `/edit/:editToken` | Owner edit — photos, names, regenerate share link |

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
| **Home** | Create a memorial or paste a share link |
| **Create flow** | Memorial name → Dog 1 photos → optional Dog 2 → optional Together → copy links |
| **Share page** | Pick who to call (when multiple dogs), optional your name |
| **Incoming Call** | FaceTime-style ring — Accept or Decline |
| **Active Call** | Crossfading photos with Ken Burns motion, keyword reactions, debug panel |
| **Edit page** | Upload photos, rename dogs, regenerate share link |

### Photo Playback (v1)

Uploaded photos are shown with a respectful “alive” presentation:

- Idle: crossfading stills with subtle Ken Burns / breathing motion
- Reactions: alternate photos + stronger motion presets (perk / excited / calm)
- Structure supports swapping in real MP4 clips per reaction later

Without uploaded photos, placeholder MP4 clips from `public/clips/` are used.

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
│   ├── clips/              # Fallback video assets (no photos)
│   └── keyword_rules.json  # Phrase → reaction mapping
├── supabase/
│   └── migration.sql       # One-paste Supabase setup
├── src/
│   ├── components/         # UI screens
│   ├── context/            # Call state machine
│   ├── hooks/              # Photo playback, speech
│   ├── services/           # Memorial CRUD (Supabase + demo)
│   └── utils/              # Keyword matching, motion presets
├── .env.example
├── index.html
├── vite.config.ts
└── package.json
```

## Related

The native iOS app lives in [`MemorialCall/`](../MemorialCall/) — requires a Mac with Xcode. Use **`web/`** to run the experience today in any browser.
