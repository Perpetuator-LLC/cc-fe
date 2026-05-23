# Branching model & CI gates

## Branching model

- **`main`** — the always-green integration branch. All feature work merges
  into `main` via pull request. The contents of `main` is what we treat as
  *staging-equivalent* — it is expected to build, lint, test, and pass an
  audit at every commit. Direct pushes to `main` are not allowed; force
  pushes are not allowed.
- **`release/x.y` / `rc/x.y.z`** — release-candidate branches cut from
  `main` when we want to ship. Bug-fix PRs targeting an RC branch run the
  same checks as PRs to `main`.
- **`feat/*` / `fix/*` / `chore/*` / `ci/*`** — short-lived branches that
  exist only to feed a PR into `main` (or, occasionally, an RC).
- **`stage`** — legacy integration branch. Once the team has fully cut
  over to the `main`-as-integration model, `stage` becomes redundant and
  can be retired or fast-forwarded from `main`.

## PR checks (GitHub Actions)

The workflow at `.github/workflows/pr-checks.yml` runs on every PR
opened against `main`, `release/*`, or `rc/*` (and as a safety net on
direct pushes to `main`). Required jobs:

| Job   | What it does                                                                                       | Mirrors local hook    |
| ----- | -------------------------------------------------------------------------------------------------- | --------------------- |
| audit | `yarn audit`, fails on any **high** or **critical** advisory                                       | `husky/pre-push`      |
| lint  | `yarn lint:all` — ESLint + stylelint + MD3 + unused-SCSS + format check                            | `husky/pre-commit`    |
| test  | `yarn test --browsers=ChromeHeadless --watch=false` under stubbed env                              | `husky/pre-push`      |
| build | `yarn build --configuration=development` — catches compile errors lint/test miss                   | (new — full safety)   |

The deploy workflow (`.gitea/workflows/stage-deploy.yml`) is unchanged
and continues to deploy `stage` → `stage.capitalcopilot.io`. Once the
team cuts over to `main`, that workflow should either be removed or
re-pointed at `main` / a release tag.

## Enabling branch protection on `main`

GitHub *rulesets* (preferred over the legacy "branch protection rules")
are free on both public and private repositories — no paid plan
required. The configuration below requires PR reviews and successful CI
before any change can land on `main`, and bans direct push and force
push.

### One-shot setup with `gh`

You'll need to run this as a repo admin (your local `gh` is already
authenticated as `ncimino`). Replace `<reviewer-team>` with `null` if
you don't want a required-reviewer rule yet.

```bash
gh api -X POST \
  /repos/Perpetuator-LLC/cc-fe/rulesets \
  --input - <<'EOF'
{
  "name": "main protection",
  "target": "branch",
  "enforcement": "active",
  "conditions": {
    "ref_name": {
      "include": ["refs/heads/main"],
      "exclude": []
    }
  },
  "rules": [
    { "type": "deletion" },
    { "type": "non_fast_forward" },
    {
      "type": "pull_request",
      "parameters": {
        "required_approving_review_count": 1,
        "dismiss_stale_reviews_on_push": true,
        "require_code_owner_review": false,
        "require_last_push_approval": false,
        "required_review_thread_resolution": true
      }
    },
    {
      "type": "required_status_checks",
      "parameters": {
        "strict_required_status_checks_policy": true,
        "required_status_checks": [
          { "context": "Audit (high/critical CVE scan)" },
          { "context": "Lint (ESLint + stylelint + MD3 + format)" },
          { "context": "Unit tests (headless Chrome)" },
          { "context": "Build (dev configuration)" }
        ]
      }
    }
  ],
  "bypass_actors": []
}
EOF
```

The four `required_status_checks` strings are exactly the `name:`
values of the four jobs in `pr-checks.yml`. If you rename a job, update
the ruleset.

### Alternative: GitHub UI

`Settings → Rules → Rulesets → New branch ruleset`:

1. **Name:** `main protection`
2. **Enforcement status:** Active
3. **Target branches:** Include default branch (or explicitly `main`)
4. **Rules:**
   - Restrict deletions ✅
   - Block force pushes ✅
   - Require a pull request before merging ✅
     - Required approvals: 1 (or more)
     - Dismiss stale reviews when new commits are pushed ✅
     - Require conversation resolution before merging ✅
   - Require status checks to pass ✅
     - Require branches to be up to date before merging ✅
     - Status checks: `Audit (high/critical CVE scan)`,
       `Lint (ESLint + stylelint + MD3 + format)`,
       `Unit tests (headless Chrome)`, `Build (dev configuration)`
5. **Bypass list:** empty (no admin bypass — they can still set
   enforcement to "Disabled" temporarily if needed).

### Verifying

After enabling, push a test branch and open a PR into `main` — you
should see all four checks queued, and the merge button blocked until
they pass.

## Notes on open-sourcing this repo

Branch protection via rulesets is free on private repos, so paying or
open-sourcing is **not required** for the protection rules themselves.

If you still want to open-source for other reasons (community, free
GitHub Actions minutes), audit the following before flipping
visibility:

- **Secrets:** none should be committed, but search history for
  `AWS_`, `STRIPE_`, `API_KEY`, `secret`, `password`, tokens, OAuth
  client secrets. Note that even after the repo is private again,
  anything that was public is on someone's clone.
- **Internal config:** `docker-compose.stage.yml`, `ecosystem.config.cjs`,
  `scripts/generate-env-from-vault.sh` reveal infra topology. Review
  what you're comfortable exposing.
- **PII / customer data:** none should be in fixtures or tests — verify.
- **License:** there's a `LICENSE` file at the root — confirm its terms
  match your intent for public distribution.
- **CHANGELOG, notes/:** review for sensitive history (incident
  details, vendor names you'd rather not disclose).
- **OAuth client IDs / public keys:** `sample.environment.ts` contains
  the staging OAuth client ID — that's fine to expose (it's a public
  identifier and the redirect URLs are domain-locked) but worth
  confirming.
