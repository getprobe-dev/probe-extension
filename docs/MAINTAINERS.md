# Maintainer Guide

This document describes how maintainers contribute to and manage PRobe. It complements [CONTRIBUTING.md](../CONTRIBUTING.md), which covers the contributor workflow.

## Maintainers vs. contributors

| | Contributor | Maintainer |
|---|---|---|
| Opens proposals | Yes | Yes |
| Approves proposals | No | Yes |
| Branches in main repo | No (must fork) | Yes |
| Merges pull requests | No | Yes |
| Creates releases | No | Yes |
| Manages labels and issues | No | Yes |

## How maintainers contribute code

Maintainers follow the same **proposal-first** discipline as external contributors, with one key difference: you work on branches directly in the main repository rather than a fork.

### Step-by-step

**1. Open an issue, even for yourself.**

Use the [Proposal template](../.github/ISSUE_TEMPLATE/proposal.md) for new features. For bugs, open a plain issue with a clear description of the problem, the expected behavior, and the actual behavior. Document your thinking in the issue as though you were explaining it to another maintainer — because one day you will be.

Assign yourself, apply the appropriate label, and set a milestone if relevant. See [WORKFLOW.md](WORKFLOW.md) for the full label reference and issue lifecycle.

**2. Self-approve (or discuss with co-maintainers).**

If you're the sole decision-maker, add the `approved` label to the issue. If there are co-maintainers, get a thumbs-up on the issue thread before starting.

**3. Create a branch directly in the main repo.**

Follow the branch naming conventions in [WORKFLOW.md](WORKFLOW.md). For example:

```bash
git checkout main && git pull
git checkout -b fix/42-chat-panel-flicker
git checkout -b feat/43-model-selector
git checkout -b docs/44-update-readme
```

**4. Implement and push.**

```bash
git push -u origin <branch-name>
```

**5. Open a pull request against `main`.**

- Title should match the issue title.
- Reference the issue in the description: `Closes #42`.
- Add a brief description of what you did and how you verified it.
- If it's a code change, add a **Self-Review** section summarizing what you checked with PRobe.

**6. Merge.**

As the sole maintainer, you can merge your own PR. With co-maintainers, get at least one approval first. Use **Squash and merge** for most changes to keep the history clean. Use **Merge commit** for feature branches where you want to preserve the individual commit history.

## Reviewing and managing external contributions

When a contributor opens a proposal issue:

- Read it carefully and respond within a reasonable time — even a "this looks interesting, let me think on it" keeps momentum.
- Use labels to communicate status: `proposal` → `approved` / `needs-discussion` / `declined`.
- When approving, tell them which files/areas are in scope and flag any constraints upfront.

When a contributor opens a PR:

- Check that it references an approved proposal.
- Review the Self-Review section first — it tells you what the contributor already checked.
- Use PRobe on their PR to review the diff.
- Be specific in feedback. "This doesn't look right" is not actionable. "This effect will re-run on every render because `foo` isn't stable — consider wrapping it in `useCallback`" is.

## Issue and label hygiene

Keep the issue tracker clean. The full label reference and lifecycle rules live in [WORKFLOW.md](WORKFLOW.md). As maintainer, the key responsibilities are:

- Close stale issues with a comment explaining why.
- Add `approved` or `declined` to proposals promptly — silence is demoralising for contributors.
- Add `in progress` when someone (including yourself) starts working on an approved proposal; remove it if the work is abandoned.
- Use `declined` with a short explanation rather than silently closing proposals.

## Related documents

- [WORKFLOW.md](WORKFLOW.md) — Labels, issue lifecycle, branch naming, and PR conventions.
- [VERSIONING.md](VERSIONING.md) — Release checklist and version bump rules.
- [../CONTRIBUTING.md](../CONTRIBUTING.md) — The contributor-facing workflow.

## Releases

See [VERSIONING.md](VERSIONING.md) for the full release checklist and version bump rules.

The short version: bump the version in `manifest.json` and `package.json` together, tag the commit, create a GitHub Release, build the ZIP, submit to Chrome.

## Current maintainers

| Maintainer | GitHub | Role |
|---|---|---|
| Sankalp Gunturi | [@sankalpgunturi](https://github.com/sankalpgunturi) | Lead maintainer |
