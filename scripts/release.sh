#!/usr/bin/env bash
# Usage: scripts/release.sh <version>
# Example: scripts/release.sh 1.1.1
#
# What this script does:
#   1. Validates you are on main with a clean working tree
#   2. Runs lint, format-check, and tests
#   3. Bumps the version in package.json and manifest.json
#   4. Builds the extension
#   5. Creates probe-extension-<version>.zip ready to upload to the Chrome Web Store
#   6. Commits the version bump, creates a git tag, and opens a GitHub Release
#      with the ZIP attached

set -euo pipefail

# ── Colour helpers ──────────────────────────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
info()  { echo -e "${GREEN}→${NC} $*"; }
warn()  { echo -e "${YELLOW}⚠${NC}  $*"; }
die()   { echo -e "${RED}✗${NC}  $*" >&2; exit 1; }

# ── Args ────────────────────────────────────────────────────────────────────
VERSION="${1:-}"
[[ -z "$VERSION" ]] && die "Usage: scripts/release.sh <version>\n  Example: scripts/release.sh 1.1.1"
[[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || die "Version must be MAJOR.MINOR.PATCH (e.g. 1.1.1)"
TAG="v${VERSION}"

# ── Dependency checks ───────────────────────────────────────────────────────
command -v jq  >/dev/null 2>&1 || die "jq is required (brew install jq)"
command -v zip >/dev/null 2>&1 || die "zip is required"
command -v gh  >/dev/null 2>&1 || die "gh CLI is required (brew install gh)"

# ── Git hygiene ─────────────────────────────────────────────────────────────
BRANCH=$(git rev-parse --abbrev-ref HEAD)
[[ "$BRANCH" == "main" ]] || die "Must release from main (currently on $BRANCH)"
[[ -z $(git status --porcelain) ]] || die "Working tree has uncommitted changes — commit or stash first"

info "Pulling latest main..."
git pull --ff-only

# Check the tag does not already exist
git tag | grep -q "^${TAG}$" && die "Tag $TAG already exists"

# ── Quality gates ────────────────────────────────────────────────────────────
info "Linting..."
npm run lint --quiet

info "Checking formatting..."
npm run format:check

info "Running tests..."
npm run test

# ── Version bump ─────────────────────────────────────────────────────────────
PREV_VERSION=$(node -p "require('./package.json').version")
[[ "$VERSION" != "$PREV_VERSION" ]] || warn "Version is already $VERSION — are you sure?"

info "Bumping version to $VERSION..."
npm version "$VERSION" --no-git-tag-version --silent

# manifest.json must stay in sync
jq ".version = \"$VERSION\"" manifest.json > manifest.json.tmp
mv manifest.json.tmp manifest.json

# ── Build ─────────────────────────────────────────────────────────────────────
info "Building..."
npm run build

# ── Zip ───────────────────────────────────────────────────────────────────────
ZIP_NAME="probe-extension-${VERSION}.zip"
[[ -f "$ZIP_NAME" ]] && rm "$ZIP_NAME"

info "Creating $ZIP_NAME..."
(cd dist && zip -qr "../$ZIP_NAME" . -x "*.DS_Store" -x "__MACOSX/*")
echo "   Size: $(du -sh "$ZIP_NAME" | cut -f1)"

# ── Commit + tag ──────────────────────────────────────────────────────────────
info "Committing version bump..."
git add package.json manifest.json
git commit -m "chore: release $TAG"
git push

info "Tagging $TAG..."
git tag "$TAG"
git push origin "$TAG"

# ── GitHub Release ────────────────────────────────────────────────────────────
info "Creating GitHub Release $TAG..."
REPO=$(git remote get-url origin | sed 's|.*github.com[:/]\(.*\)\.git|\1|; s|.*github.com[:/]\(.*\)|\1|')
gh release create "$TAG" \
  --repo "$REPO" \
  --title "$TAG" \
  --generate-notes \
  "$ZIP_NAME"

echo ""
echo -e "${GREEN}✓ Released $TAG${NC}"
echo "  ZIP:    $ZIP_NAME"
echo "  Upload $ZIP_NAME to: https://chrome.google.com/webstore/devconsole"
