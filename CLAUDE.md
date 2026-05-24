# Project: cc-fe (Capital Copilot Frontend)

## Stack
- **Framework:** Angular 21.1.5 (standalone components, no NgModules)
- **Language:** TypeScript 5.9.3
- **Runtime:** Node.js 22
- **UI:** Angular Material 21.1.5 (Material Design 3)
- **Data:** Apollo Angular 13 / Apollo Client 4, GraphQL, graphql-ws
- **Auth:** angular-oauth2-oidc (OAuth2/OIDC)
- **Tests:** Karma + Jasmine
- **Linting:** ESLint + angular-eslint, Stylelint (strict MD3), Prettier
- **Package manager:** yarn
- **CI/CD:** Gitea Workflows

## Commands
- `yarn start` — dev server (port 4200)
- `yarn build` — production build
- `yarn build:prod` — production build with GraphQL docs
- `yarn test` — unit tests (no watch)
- `yarn test --include='**/foo.spec.ts'` — single file test
- `yarn lint` — ESLint (TS + HTML)
- `yarn lint:scss` — Stylelint
- `yarn lint:all` — all linters + format check
- `yarn generate` — GraphQL codegen (generate TS types)

## Architecture
- Standalone components with lazy-loaded routes
- Feature directories under `src/app/` (~72 modules)
- Apollo Client for GraphQL state and data fetching
- OAuth2/OIDC auth with guards, interceptors, token refresh
- SSR via Angular SSR + Express 5
- Global styles in `src/styles/`, theme in `src/m3-theme.scss`
- SCSS mixins: `@use 'styles/mixins' as mixins;`

## Key Conventions
- `inject()` for DI, not constructor injection (ESLint enforced)
- `@if`/`@for`/`@switch` template syntax (not `*ngIf`/`*ngFor`)
- External templates and styles only (no inline — ESLint enforced)
- Component selector prefix: `app-` (kebab-case)
- MD3 color tokens: `var(--md-sys-color-*)` — no hex, no rgba()
- 4px spacing grid: 4, 8, 12, 16, 20, 24, 28, 32, 40, 48, 64px
- 2px font grid: 10, 12, 14, 16, 18, 20, 22, 24px
- Conventional commits (commitlint enforced)
- Copyright headers required on all files

## Never Do
- Edit `src/app/schema.graphql` — backend-generated, never modify
- Hardcode values the backend provides (sectors, hints, commands, chart controls)
- Use constructor injection — use `inject()` only
- Use `::ng-deep`, `!important`, hex colors, `rgba()`, `rgb()`, `hsl()`
- Use inline templates or inline styles
- Use off-grid spacing (e.g. 5px, 10px, 15px, 18px)
- Override Material component sizing (icon buttons, form fields)

## Before Committing
1. `yarn test`
2. `yarn lint`
3. `yarn lint:scss`
4. No TODO comments in changed files
5. Copyright headers present

## Detailed Patterns
See `.github/copilot-instructions.md` for comprehensive MD3 styling rules, Apollo patterns, SCSS checklists, component examples, and backend API testing scripts.
