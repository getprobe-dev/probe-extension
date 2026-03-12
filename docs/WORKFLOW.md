# GitHub Workflow

This document describes the mechanics of how issues, labels, branches, and pull requests are managed in this repository. Both contributors and maintainers follow these conventions — see [CONTRIBUTING.md](../CONTRIBUTING.md) and [MAINTAINERS.md](MAINTAINERS.md) for the audience-specific steps around each stage.

## Non-negotiable rules

These rules apply to every contributor, including maintainers, without exception.

### 1. Direct commits to `main` are prohibited

Never commit directly to `main`, and never merge a branch into `main` outside of a pull request. The `main` branch is protected — all changes must arrive through a reviewed, approved PR.

This means:
- No `git push origin main`
- No merging feature branches locally and pushing
- No "quick fixes" pushed directly — every change, however small, goes through a PR

### 2. Issues are the source of truth

Every piece of work begins with a GitHub issue. The issue is the equivalent of a Linear story or a Jira ticket — it defines *what* needs to be done, *why*, and tracks *progress*. Work should never start before an issue exists.

**A single issue can have multiple pull requests.** This is expected and encouraged. For example, an issue titled "CWS v1.1.0 readiness check" may be addressed through several PRs, each tackling a different aspect — permissions hardening, prompt grounding, syntax highlighting polish, and so on. Each PR references the same issue. The issue stays open until all necessary work is done and the goal is fully met.

Think of it this way:
- **Issue** = the goal (what we're trying to achieve)
- **PR** = one attempt or one slice of work toward that goal

### 3. Always branch from an issue

Cut a branch only after an issue exists (and has been labeled `approved` for non-trivial work). Name the branch after the issue number so the relationship is always traceable. See [Branch naming](#branch-naming) for the exact patterns.

---

## Opening an issue

When you open an issue, populate all five fields before saving:

| Field | Rule |
|---|---|
| **Assignee** | Assign yourself immediately if you intend to work on it. If you're filing something for later, leave it unassigned until you pick it up. |
| **Type** | Set the singular type that describes what this issue fundamentally *is* — `Bug`, `Feature`, or `Task` (see [Types](#types)). |
| **Labels** | Apply one or more labels that describe the *status* and *nature* of the work (see [Labels](#labels)). Labels and type serve different purposes and are not redundant. |
| **Milestone** | Assign to a milestone if the work is scoped to a planned release (see [Milestones](#milestones)). Leave blank for proposals not yet approved. |
| **Relationships** | Reference related or prerequisite issues in the body if the ordering or context matters (see [Issue relationships](#issue-relationships)). |

If someone else opens an issue that you pick up, assign yourself at that point and add the `in progress` label.

## Types

Every issue has exactly one type. Type answers the question *"what is this?"* at the coarsest level of classification.

| Type | When to use |
|---|---|
| `Bug` | Something that currently works incorrectly or produces wrong output |
| `Feature` | New functionality, a new capability, or a meaningful new behaviour |
| `Task` | Work that is neither a bug nor a feature — housekeeping, refactoring, tooling, dependency updates |

**Type vs. labels — the distinction:**

Type is **singular and structural** — one per issue, set once, rarely changed. It describes the fundamental nature of the issue and drives how it is counted in release notes and metrics.

Labels are **plural and dynamic** — you can apply many at once, and they change as the issue moves through its lifecycle. They describe workflow state (`proposal`, `approved`, `in progress`), additional classification (`docs`, `enhancement`), and signals to contributors (`good first issue`, `help wanted`).

A `Feature` issue will typically also carry the `proposal` label (while awaiting approval) and later `approved` and `in progress`. The type stays `Feature` throughout; the labels evolve.

## Labels

| Label | Colour | When to use |
|---|---|---|
| `proposal` | grey | New feature or change proposal waiting for maintainer review |
| `bug` | red | Something is broken and needs fixing |
| `enhancement` | blue | Improvement to an existing feature |
| `docs` | light blue | Documentation-only change |
| `good first issue` | purple | A well-scoped entry point for new contributors |
| `help wanted` | green | Maintainer is happy to accept outside help |
| `approved` | green | Proposal approved — implementation can begin |
| `needs-discussion` | teal | More context or debate needed before a decision |
| `declined` | dark red | Not being pursued; kept for historical reference |
| `in progress` | yellow | Someone is actively working on this |
| `dependencies` | blue | Automated dependency update (Dependabot) |
| `duplicate` | grey | Superseded by another issue |
| `wontfix` | white | Valid but intentionally not addressed |

## Issue lifecycle

```
opened (proposal / bug / docs / enhancement)
  └─ maintainer reviews
       ├─ approved      → label: approved  → branch created  → in progress → PR → closed
       ├─ needs-discussion → conversation continues → eventually approved or declined
       └─ declined      → label: declined → closed with explanation
```

Key rules:
- The `in progress` label goes on the **issue** (not the PR) as soon as a branch is cut.
- Remove `in progress` if the work is abandoned; add a comment explaining why.
- Close the issue when the PR merges — reference it with `Closes #<number>` in the PR description so GitHub does this automatically.

## Branch naming

Create a branch only after the issue has been labeled `approved`. Name the branch after the issue type and number:

| Type | Pattern | Example |
|---|---|---|
| Bug fix | `fix/<issue-number>-<slug>` | `fix/42-chat-panel-flicker` |
| Feature | `feat/<issue-number>-<slug>` | `feat/43-model-selector` |
| Task / chore | `task/<issue-number>-<slug>` | `task/45-cws-readiness` |
| Documentation | `docs/<issue-number>-<slug>` | `docs/44-update-readme` |

External contributors branch from their fork. Maintainers branch directly in the main repository.

## Pull request conventions

- **Title** should match (or closely paraphrase) the issue title, with a short qualifier if it is one of multiple PRs (e.g. `[1/3]`).
- **Description** must reference the issue. Use `Closes #<number>` only on the *final* PR that fully resolves the issue. For intermediate PRs, use `Part of #<number>` to keep the issue open.
- For code changes, include a **Self-Review** section summarising what you verified with PRobe.
- PRs should target `main`. Do not open PRs against other feature branches unless explicitly coordinated.
- A single issue may have many PRs. This is normal — see [Non-negotiable rules](#non-negotiable-rules).

When opening a PR, populate the sidebar fields to mirror the linked issue:

| Field | Rule |
|---|---|
| **Assignee** | Assign yourself — the same person assigned to the issue. |
| **Labels** | Apply the same labels as the linked issue (e.g. `bug`, `enhancement`). |
| **Milestone** | Set to the same milestone as the linked issue. |
| **Reviewers** | Assign a reviewer if one is available. Leave empty for solo maintainer work. |
| **Development** | GitHub links the branch automatically when the PR is opened from it — no manual action needed. |

To set these from the CLI after opening the PR:

```bash
gh pr edit <number> \
  --repo getprobe-dev/probe-extension \
  --add-assignee "@me" \
  --add-label "bug" \
  --milestone "v1.1.0"
```

## Milestones

Milestones represent a Chrome Web Store submission. Each milestone maps to a version bump and the release checklist in [VERSIONING.md](VERSIONING.md).

**When to create a milestone:**

Create a new milestone when you decide a set of changes should ship together in the next release. Name it after the target version following semantic versioning rules:

| Change type | Version bump | Example |
|---|---|---|
| Bug fixes only | Patch (`v1.0.x`) | `v1.0.1` |
| New features, backward-compatible | Minor (`v1.x.0`) | `v1.1.0` |
| Breaking changes | Major (`vX.0.0`) | `v2.0.0` |

**When to assign an issue to a milestone:**

- Assign immediately if the fix or feature is clearly scoped to the next release.
- Leave the milestone blank for proposals that have not yet been approved — assign once approved and scheduled.
- A bug that causes incorrect behaviour (e.g. misleading AI review output) should generally target the next milestone without delay.
- A larger feature proposal may target a later milestone or none at all until it is approved and sequenced.

**Milestone hygiene:**

- Close the milestone when the release is tagged and submitted to the Chrome Web Store.
- Move any unfinished issues to the next milestone rather than leaving them against a closed one.

## Issue relationships

GitHub does not have native "depends on / blocked by" links, but you can communicate relationships clearly in the issue body or comments.

**When to reference another issue:**

- Reference a prerequisite with "Requires #N to be merged first" in the issue body.
- Reference a related issue with "Related: #N" — for issues that share context but have no strict ordering.
- Reference a superseded issue with "Supersedes #N" and close the older one.

**When NOT to add a relationship:**

- Do not add relationships just because two issues are in the same area of the codebase. Only link issues when the relationship materially affects scheduling or implementation order.
- Independent improvements that happen to touch the same file do not need a dependency link.

## Projects

There are no project boards in use at this time. If one is created in the future, update this section with the board name and the criteria for moving issues between columns.

## GitHub CLI reference

Most issue management can be done from the terminal with the `gh` CLI. This section documents the exact commands to avoid having to rediscover them.

### Create an issue

```bash
gh issue create \
  --repo getprobe-dev/probe-extension \
  --title "Your issue title" \
  --label "bug" \
  --assignee "@me" \
  --milestone "v1.1.0" \
  --body "Issue body here."
```

Labels, assignee, and milestone can be omitted and set later. Type cannot be set at creation time — see below.

### Edit assignee, labels, and milestone

```bash
# Add assignee and label
gh issue edit <number> \
  --repo getprobe-dev/probe-extension \
  --add-assignee "@me" \
  --add-label "in progress"

# Remove a label
gh issue edit <number> \
  --repo getprobe-dev/probe-extension \
  --remove-label "proposal" \
  --add-label "approved"

# Set milestone (milestone must already exist)
gh issue edit <number> \
  --repo getprobe-dev/probe-extension \
  --milestone "v1.1.0"
```

### Create a milestone

```bash
gh api repos/getprobe-dev/probe-extension/milestones \
  --method POST \
  --field title="v1.1.0" \
  --field description="Next Chrome Web Store submission."
```

### Set issue type

GitHub issue types are not available through the REST API — they require a GraphQL mutation. The steps are:

**1. Look up available types and their node IDs:**

```bash
gh api orgs/getprobe-dev/issue-types
```

This returns a JSON array. Note the `node_id` of the type you want (`Bug`, `Feature`, or `Task`).

**2. Look up the issue's node ID:**

```bash
gh api graphql -f query='
{
  repository(owner:"getprobe-dev", name:"probe-extension") {
    issue(number: <number>) { id }
  }
}'
```

**3. Apply the type:**

```bash
gh api graphql -f query='
mutation {
  updateIssue(input: {
    id: "<issue-node-id>",
    issueTypeId: "<type-node-id>"
  }) {
    issue { number title issueType { name } }
  }
}'
```

**Quick reference — type node IDs for this org:**

| Type | Node ID |
|---|---|
| `Task` | `IT_kwDOD9wJhs4B4wSt` |
| `Bug` | `IT_kwDOD9wJhs4B4wSu` |
| `Feature` | `IT_kwDOD9wJhs4B4wSv` |

### List and verify issues

```bash
# List open issues with labels and milestone
gh issue list --repo getprobe-dev/probe-extension

# View full metadata for a specific issue
gh issue view <number> \
  --repo getprobe-dev/probe-extension \
  --json assignees,labels,milestone,issueType
```
