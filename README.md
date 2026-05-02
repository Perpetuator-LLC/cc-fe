# Capital Copilot Frontend

> **Angular 21 | Material Design 3 | Apollo GraphQL**

[![Angular](https://img.shields.io/badge/Angular-21.1-red)](https://angular.io/)
[![Material Design](https://img.shields.io/badge/Material-MD3-blue)](https://m3.material.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9+-blue)](https://www.typescriptlang.org/)

## 🚀 Quick Start

You do **not** need to run the backend locally. All frontend development points at the shared staging API.

### Prerequisites

- **Node.js 22** (use [nvm](https://github.com/nvm-sh/nvm): `nvm install 22 && nvm use 22`)
- **yarn** (`npm install -g yarn`)
- **Python 3** with pip (for pre-commit hooks)

### One-time setup

```bash
# 1. Clone and enter the repo
git clone https://git.perpetuator.io/Perpetuator-LLC/cc-fe.git
cd cc-fe

# 2. Install Node dependencies (also installs Husky git hooks automatically)
yarn install

# 3. Install gitleaks for secret scanning (runs automatically on every commit)
brew install gitleaks
# Windows/Linux: https://github.com/gitleaks/gitleaks/releases

# 4. Create your local environment file (gitignored — never committed)
```

Create `src/environments/environment.ts` with the following content:

```typescript
// src/environments/environment.ts
export const environment = {
  production: false,
  API_URL: 'https://stage-api.capitalcopilot.io',
  OAUTH_ISSUER: 'https://stage-api.capitalcopilot.io',
  OAUTH_CLIENT_ID: 'BCZ0upsNuX9nZu0HxxYdpP6Fq1ZQGbICCuLzgDME',
  OAUTH_SCOPES: 'read write',
  STRIPE_PUBLIC_KEY: 'pk_test_REPLACE_ME',
  TEST_EMAIL: '',
  TEST_PASSWORD: '',
};
```

> **`src/environments/environment.ts` is gitignored — you must create it yourself.**
>
> `OAUTH_CLIENT_ID` is a public identifier (it appears in OAuth redirect URLs in the browser) — safe to share.
> `STRIPE_PUBLIC_KEY` is a test-mode publishable key — also public. Never commit passwords or private keys.

### Start the dev server

```bash
yarn start
# → http://localhost:4200
```

---

## 📋 Common Commands

```bash
# Development
yarn start                    # Dev server on :4200
yarn build                    # Development build
yarn build:prod               # Production build (also generates API docs)

# Code quality (run before pushing)
yarn lint                     # ESLint
yarn lint:scss                # Stylelint
yarn test                     # Unit tests (headless, no watch)

# GraphQL API docs (generated into docs/graphql/ — gitignored)
yarn docs:graphql             # Build docs from schema
open docs/graphql/index.html  # View in browser (macOS)
```

---

## 🔒 Git Hooks

Two hook systems run automatically:

| Hook | Trigger | What it checks |
|------|---------|----------------|
| **Husky** + lint-staged | every `git commit` | ESLint, Prettier, copyright headers on staged files |
| **gitleaks** (via Husky) | every `git commit` | Secret scanning on staged files |
| **yarn audit** (via Husky) | every `git push` | High/critical CVEs in dependencies |

Renovate also runs continuously and opens PRs to update vulnerable dependencies.

If a commit is rejected, fix the flagged issues and try again.

---

## 📚 API Documentation

GraphQL API docs are generated from `src/app/schema.graphql` using [SpectaQL](https://github.com/anvilco/spectaql):

```bash
yarn docs:graphql
open docs/graphql/index.html
```

> The schema is **auto-generated from the backend** — do not edit it manually. When the backend adds new queries or mutations, pull the updated schema and regenerate docs.

---

## 🎨 Styling Standards (MD3)

This project enforces **Material Design 3** via ESLint and Stylelint — violations will fail linting.

| Rule | Detail |
|------|--------|
| Colors | `var(--md-sys-color-*)` tokens only — no hex, no `rgba()` |
| Spacing | 4px grid: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64px |
| Font sizes | 2px grid: 10, 12, 14, 16, 18, 20, 22, 24px |
| Dependency injection | `inject()` only — constructor injection is linted out |
| Templates / styles | External files only (`templateUrl` / `styleUrl`) |
| Forbidden | `::ng-deep`, `!important`, inline `style="..."` |

See [notes/reference/MD3_COMPREHENSIVE_THEME_GUIDE.md](./notes/reference/MD3_COMPREHENSIVE_THEME_GUIDE.md) for the full guide.

---

## 📦 Project Structure

```
cc-fe/
├── src/
│   ├── app/                 # Application code (components, services, guards)
│   ├── styles/              # Global styles and MD3 theme
│   └── environments/        # Environment configs (gitignored — create locally)
├── docs/graphql/            # Generated API docs (gitignored — run yarn docs:graphql)
├── notes/                   # Developer documentation
├── scripts/                 # Build and test utilities
└── logs/                    # Local build/lint logs (gitignored)
```

---

## 📖 Documentation

- **[notes/README.md](./notes/README.md)** — Full documentation index
- **[notes/development/](./notes/development/)** — Development workflows and setup
- **[notes/architecture/](./notes/architecture/)** — System design and patterns
- **[notes/integrations/](./notes/integrations/)** — OAuth, GraphQL, third-party services
- **[CHANGELOG.md](./CHANGELOG.md)** — Release history

---

## 📄 License

Copyright © 2025-2026 Perpetuator LLC. All rights reserved.
