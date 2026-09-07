#!/usr/bin/env bash
# One-time publish helper if the GitHub repo was created manually.
# Usage: ./scripts/publish-to-github.sh
set -euo pipefail

REPO="thorpemark/dog-facetime-clips"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

cd "$ROOT"

if ! git remote get-url origin &>/dev/null; then
  git remote add origin "https://github.com/${REPO}.git"
fi

git branch -M main
git push -u origin main

echo "Pushed to https://github.com/${REPO}"
echo "Enable GitHub Pages: Settings → Pages → Source → GitHub Actions"
