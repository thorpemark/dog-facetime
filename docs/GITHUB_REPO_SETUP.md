# Create `thorpemark/dog-facetime-clips` on GitHub

The Cloud Agent token cannot create new repositories under `thorpemark`. After you create the empty repo once, publish this branch:

## 1. Create the repo (one time, ~30 seconds)

1. Open [github.com/new](https://github.com/new)
2. Owner: **thorpemark**
3. Name: **dog-facetime-clips**
4. Visibility: **Public** (matches `dog-facetime`)
5. Description: `Interactive clip-library FaceTime memorial — voice-triggered prerendered reactions`
6. **Do not** add README, .gitignore, or license (empty repo)
7. Click **Create repository**

## 2. Publish from this branch

From a machine with push access to both repos:

```bash
git clone --branch cursor/clip-library-scaffold-b343 \
  https://github.com/thorpemark/dog-facetime.git dog-facetime-clips
cd dog-facetime-clips
git remote set-url origin https://github.com/thorpemark/dog-facetime-clips.git
git push -u origin cursor/clip-library-scaffold-b343
git push origin cursor/clip-library-scaffold-b343:main
```

Or run `./scripts/publish-to-github.sh` from this tree after step 1.

## 3. GitHub Pages

In the **new** repo: Settings → Pages → Source → **GitHub Actions**.

Site URL: **https://thorpemark.github.io/dog-facetime-clips/**

## 4. Open the initial PR (optional)

On `dog-facetime-clips`, open a PR from `cursor/clip-library-scaffold-b343` → `main` if you pushed main separately, or continue on `main` directly.

---

**Important:** `dog-facetime` **main** stays the still-image Ken Burns product. Do not merge this branch into `dog-facetime` main.
