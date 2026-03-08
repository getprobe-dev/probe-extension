# Security Policy

## Supported versions

Only the latest version of PRobe is actively supported.

| Version | Supported |
|---|---|
| Latest | Yes |
| Older | No |

## Reporting a vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

PRobe handles sensitive credentials — an Anthropic API key and optionally a GitHub Classic Token. If you discover a vulnerability (e.g., a way to exfiltrate keys, bypass origin restrictions, or exploit the Cloudflare proxy), please report it privately.

**Email:** [sgunturi@protonmail.com](mailto:sgunturi@protonmail.com)  
**Subject line:** `[SECURITY] PRobe — <short description>`

Include:

- A description of the vulnerability and its potential impact.
- Steps to reproduce (or a proof-of-concept if applicable).
- Any relevant environment details (Chrome version, OS).

You can expect an acknowledgment within 48 hours and a resolution timeline within 7 days for critical issues.

## Scope

The following are in scope:

- The Chrome extension (`src/`)
- The Cloudflare Workers proxy (`proxy/`)
- Any mechanism that could expose a user's API keys or GitHub token

The following are out of scope:

- Vulnerabilities in third-party dependencies (report those upstream)
- GitHub's own security (report to GitHub directly)
