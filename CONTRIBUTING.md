# Contributing to cc-fe

Thanks for your interest in contributing! cc-fe is the open-source Angular frontend for [Capital Copilot](https://capitalcopilot.io). Anyone can fork it, run their own instance against the Capital Copilot API (or any compatible backend), or build a different frontend entirely.

## Ground rules

- Be respectful and constructive. We follow the [Contributor Covenant](https://www.contributor-covenant.org/version/2/1/code_of_conduct/) — see `CODE_OF_CONDUCT.md`.
- This is MIT-licensed (see `LICENSE`). By submitting a PR you agree your contribution may be relicensed under MIT.
- We don't accept contributions that add or change backend API contracts. The backend is closed-source and proprietary; if you need a new field or endpoint, open a discussion first.

## Quick start

```bash
git clone https://github.com/Perpetuator-LLC/cc-fe.git
cd cc-fe
nvm use            # picks up .nvmrc (Node 22)
yarn install       # also installs Husky git hooks
yarn start         # dev server at http://localhost:4200
```

You don't need to run the backend — the dev environment points at the shared staging API by default. See `README.md` for the full setup including OAuth client configuration.

## Branch and PR flow

1. **Fork** the repo on GitHub.
2. **Create a branch** from `main` named after your change: `feat/foo`, `fix/bar`, `chore/baz`, etc.
3. **Make focused commits.** One logical change per commit; small commits are easier to review and revert. We use [Conventional Commits](https://www.conventionalcommits.org/) (enforced by commitlint).
4. **Run the gates** locally before pushing:
   ```bash
   yarn lint:all        # ESLint, Stylelint, MD3 compliance, unused SCSS, Prettier
   yarn test            # Karma unit tests
   yarn build           # Production build (catches issues lint misses)
   ```
5. **Open a PR** against `main`. The CI runs the same gates plus a CVE audit and a Docker build.
6. A maintainer reviews. Address feedback by pushing additional commits (no force-pushes during review — easier to see what changed).
7. Once approved, the maintainer merges. On merge to `main`, GitHub Actions builds a Docker image, scans it with Trivy, and pushes to GHCR.

## Code conventions

cc-fe is opinionated. Run `yarn lint:all` and follow what it says, but the highlights:

- **Standalone Angular components** with `inject()` DI — no `NgModule`, no constructor injection.
- **`@if` / `@for` / `@switch`** template syntax — not `*ngIf` / `*ngFor`.
- **External templates and styles only** — no inline `template:` or `styles:`.
- **Component selectors** start with `app-` (kebab-case).
- **MD3 design tokens** for colors: `var(--md-sys-color-*)`. No hex, no `rgba()`, no `rgb()`.
- **4-pixel spacing grid**: 4, 8, 12, 16, 20, 24, 28, 32, 40, 48, 64px. No 5px / 10px / 15px.
- **2-pixel font grid**: 10, 12, 14, 16, 18, 20, 22, 24px.
- **Copyright header** on every new source file:
  ```typescript
  // Copyright (c) 2025-2026 Perpetuator LLC
  ```

See `.github/copilot-instructions.md` for the full pattern catalog (MD3 styling, Apollo patterns, SCSS checklists, etc.).

## What NOT to do

- Don't edit `src/app/schema.graphql` — it's generated from the backend.
- Don't hardcode values the backend provides (sectors, hints, commands).
- Don't use `::ng-deep`, `!important`, or override Material component sizing.
- Don't commit secrets. The pre-commit hook runs `gitleaks` to catch them, but be intentional.
- Don't add documentation files unless they're necessary — prefer self-explanatory code and inline comments.

## Reporting bugs and requesting features

- **Bugs**: open an issue with reproduction steps, expected vs. actual behavior, browser/OS, and screenshots if it's a visual bug.
- **Features**: open a discussion first to align on scope before doing the work.
- **Security issues**: please email `security@perpetuator.com` rather than opening a public issue.

## Self-hosting

If you want to run cc-fe against your own backend (or a self-hosted Capital Copilot API), see the "Docker self-hosting" section of `README.md`. The published image at `ghcr.io/perpetuator-llc/cc-fe:latest` is environment-agnostic — all config comes from `CC_FE_*` env vars at runtime.

---

Questions? Open a [discussion](https://github.com/Perpetuator-LLC/cc-fe/discussions) on GitHub.
