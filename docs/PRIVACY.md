# PRobe Privacy Policy

**Last updated:** March 2026

## What Data PRobe Collects

PRobe collects and stores the following data **locally on your device** via Chrome's built-in storage APIs:

- **Anthropic API Key** — Stored in `chrome.storage.sync` so it syncs across your Chrome profile. Used to authenticate requests to the Anthropic Messages API.
- **GitHub Classic Token** (optional) — Stored in `chrome.storage.sync`. Used to post PR comments and fetch PR statistics via the GitHub API.
- **Chat History** — Stored in `chrome.storage.local` on a per-PR basis. Conversations are kept so you can resume them when you revisit a PR.
- **Pending Review Comments** — Stored in `chrome.storage.local` until you submit or discard a review.
- **Skill Cache** — Downloaded review guideline content is cached in `chrome.storage.local` for 24 hours to avoid redundant network requests.

## What Data PRobe Sends

- **To the Anthropic API** (via a CORS proxy): Your API key, the PR diff, PR metadata (title, description, file names), selected code snippets, and your chat messages. The proxy does not log or store any of this data.
- **To the GitHub API**: Your GitHub token (if provided) and the specific API requests needed to fetch PR data or post comments.
- **To Google Fonts**: A stylesheet request to load the Inter and Outfit typefaces.

## What Data PRobe Does NOT Collect

- PRobe does **not** have any analytics, telemetry, or tracking.
- PRobe does **not** send data to any server other than Anthropic's API (via the proxy), GitHub's API, and Google Fonts.
- PRobe does **not** collect or transmit any personal information beyond what you explicitly provide (API keys).

## Data Retention

All data is stored locally in your browser. You can clear it at any time by:

1. Clicking the PRobe extension icon and using the **Clear** button to remove API keys.
2. Using Chrome's built-in "Clear browsing data" to remove extension storage.
3. Uninstalling the extension, which removes all stored data.

## Third-Party Services

| Service | Purpose | Privacy Policy |
|---------|---------|---------------|
| Anthropic | AI chat responses | https://www.anthropic.com/privacy |
| GitHub | PR data and comments | https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement |
| Google Fonts | Typography | https://policies.google.com/privacy |

## Contact

If you have questions about this privacy policy, you can reach out via email at sgunturi@protonmail.com or on [LinkedIn](https://linkedin.com/in/sankalpgunturi).
