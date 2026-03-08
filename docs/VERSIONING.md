# Versioning

PRobe follows [Semantic Versioning](https://semver.org/) (`MAJOR.MINOR.PATCH`). Each version bump corresponds to a new Chrome Web Store submission — the version number in `manifest.json` is what Chrome sees.

## Version bump rules

| Change type | Version component | Example |
|---|---|---|
| Bug fix | PATCH | `1.0.0 → 1.0.1` |
| New feature (backward-compatible) | MINOR | `1.0.0 → 1.1.0` |
| Breaking change or major rework | MAJOR | `1.0.0 → 2.0.0` |
| Docs, README, tooling, CI | **None** | `1.0.0 → 1.0.0` |

Documentation changes — README edits, new files in `docs/`, CONTRIBUTING updates — never trigger a version bump. The version only moves when you are preparing a new build to submit to the Chrome Web Store.

## What constitutes a "release"

A release is a new ZIP submitted to the Chrome Web Store. Every release must:

1. Have its version bumped in **both** `manifest.json` and `package.json`.
2. Be tagged in git (e.g., `v1.0.1`) and have a corresponding [GitHub Release](https://github.com/getprobe-dev/probe-extension/releases).
3. Include release notes that summarize what changed since the previous version.

The git tag is the permanent, canonical record of what was submitted. If Chrome ever asks about a specific version, point to the tag.

## Release checklist

Before creating a release:

- [ ] All code changes for this version are merged into `main`.
- [ ] Version is bumped in `manifest.json` and `package.json` (same commit, same value).
- [ ] The extension builds cleanly: `npm run build`.
- [ ] The extension has been manually tested on a GitHub PR.
- [ ] Lint passes: `npm run lint`.

Creating the release:

```bash
# Tag the release commit
git tag v1.0.1
git push origin v1.0.1

# Create the GitHub Release (or use the GitHub UI)
gh release create v1.0.1 --title "v1.0.1 — <short description>" --notes "<release notes>"
```

After the release is created, build the submission ZIP and upload it to the Chrome Web Store:

```bash
npm run build
cd dist && zip -r ../probe-extension.zip . -x "*.DS_Store" -x "__MACOSX/*"
```

## Version history

| Version | Date | Submitted to Chrome | Notes |
|---|---|---|---|
| `v1.0.0` | 2026-03-08 | Yes | Initial release |
