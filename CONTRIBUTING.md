# Contributing to PRobe

Thanks for your interest in contributing to PRobe! This document describes the contribution workflow we follow. PRobe uses a **proposal-first** process — please read through it before writing any code.

## Philosophy

PRobe is built primarily with AI coding agents, but every change starts with deliberate human thinking. We value well-documented proposals over quick pull requests. This keeps the codebase coherent and ensures every contribution aligns with the product vision.

## Contribution Workflow

```
Idea → Proposal (GitHub Issue) → Approval → Fork & Implement → Self-Review → Pull Request → Maintainer Review
```

### Step 1: Submit a Proposal

Open a GitHub Issue using the **Proposal** template. Your proposal should include:

- **Problem statement** — What pain point or gap does this address?
- **Proposed solution** — How would you solve it? Include technical approach, affected files/areas, and any trade-offs.
- **Alternatives considered** — What other approaches did you evaluate?
- **Scope** — Is this a small fix, a new feature, or a larger refactor?

AI-assisted proposals are welcome, but they must be reviewed and understood by the person submitting them. We want you to own what you propose.

> **Do not write code before your proposal is approved.** This saves everyone's time.

### Step 2: Wait for Approval

A maintainer will review your proposal and respond with one of:

- **Approved** — You're clear to start implementing. The issue will be labeled `approved`.
- **Needs discussion** — The maintainer has questions or suggestions. Continue the conversation on the issue.
- **Declined** — The proposal doesn't fit the current direction. The maintainer will explain why.

### Step 3: Fork and Implement

Once approved:

1. Fork the repository and create a feature branch from `main`.
2. Implement the approved proposal. Stay within the agreed scope — if you discover the scope needs to change, comment on the issue first.
3. Follow the existing code style (ESLint and Prettier configs are in the repo — run `npm run lint` and `npm run format`).

### Step 4: Self-Review with PRobe

Before requesting a review, use the PRobe extension on your own pull request:

1. Open your PR on GitHub and launch PRobe.
2. Chat with PRobe about your changes — ask it to review for correctness, style, and potential issues.
3. Include a summary of PRobe's feedback in your PR description under a **Self-Review** section. This helps the maintainer see what you've already considered.

### Step 5: Submit a Pull Request

Open a PR against `main` with:

- A clear title describing the change.
- A reference to the approved proposal issue (e.g., "Closes #42").
- A **Self-Review** section summarizing PRobe's feedback and how you addressed it.
- A description of how you verified the change works (since we don't have automated tests yet).

### Step 6: Maintainer Review

The maintainer will review your PR using PRobe alongside your self-review notes. Expect feedback and iteration — this is collaborative, not adversarial.

## Tech Stack

If you're new to the codebase, here's what you'll be working with:

| Layer | Technology |
|-------|------------|
| UI | React 19, TypeScript, Tailwind CSS 4, shadcn/ui |
| Build | Vite 7, vite-plugin-web-extension |
| Extension | Chrome Manifest V3 |
| AI | Anthropic Claude Sonnet (streaming) |
| Proxy | Cloudflare Workers |

## Code Style

- Run `npm run lint` before committing. The project uses ESLint with TypeScript support.
- Run `npm run format` to auto-format with Prettier.
- Follow existing patterns in the codebase. When in doubt, look at how similar things are done.

## What We're Not Ready For (Yet)

PRobe is early — this is day zero. A few things to be aware of:

- **No automated tests.** We don't have a test suite yet. Please manually verify your changes work as expected and describe what you tested in the PR.
- **No CI pipeline.** Linting and formatting checks are manual for now.

These will come. For now, thoroughness in your proposal and self-review compensates.

## Questions?

If you're unsure about anything, open a GitHub Issue or reach out to the maintainer. We'd rather answer a question upfront than review a PR that went in the wrong direction.

---

## Related documents

- [docs/VERSIONING.md](docs/VERSIONING.md) — How version numbers work and what constitutes a release.
- [docs/MAINTAINERS.md](docs/MAINTAINERS.md) — How maintainers contribute and manage the project.
- [docs/DESIGN.md](docs/DESIGN.md) — Visual language, color tokens, and component patterns for UI contributions.
