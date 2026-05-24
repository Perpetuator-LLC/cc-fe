# Deployment Architecture

## Overview

cc-fe uses a **pull-based deployment** with **secrets fetched at container startup** — never written to disk on the host:

1. **GitHub** is the source of truth and the public FOSS repo.
2. **GitHub Actions** builds the Docker image, scans it with Trivy, pushes to **GHCR** (`ghcr.io/perpetuator-llc/cc-fe`), then explicitly **dispatches the Gitea deploy workflow** as the last step.
3. **Gitea** mirrors the GitHub repo (pull mirror) for source-of-truth visibility, but the deploy trigger is the GitHub-Actions-initiated dispatch, **not** the mirror sync (which doesn't fire push events in Gitea Actions).
4. **Gitea Actions** runs `.gitea/workflows/stage-deploy.yml` on the lestrange runner:
   - Re-runs audit/lint/test gates
   - Pulls the image (guaranteed to exist — GitHub Actions just confirmed)
   - `docker compose up -d`
5. **The container itself** fetches `CC_FE_*` secrets from OpenBao at startup using AppRole credentials mounted read-only from `/etc/vault/`. Secrets are exported as env vars in-process, the AppRole token is revoked, and the SSR server starts. No `.env.stage` ever touches disk.

```
GitHub push to main
  │
  ├─→ pr-checks.yml      (re-runs audit/lint/test/build)
  │
  └─→ build-and-publish.yml
        │
        ├─→ Docker build
        ├─→ Trivy scan (blocks CRITICAL/HIGH with fixes)
        ├─→ Push to ghcr.io/perpetuator-llc/cc-fe:{latest, sha-XXX}
        └─→ POST workflow_dispatch → Gitea stage-deploy.yml
              │
              ↓
git.perpetuator.io/perpetuator/cc-fe
  │
  └─→ stage-deploy.yml (runs on lestrange runner)
        ├─→ audit / lint / test (gates)
        ├─→ rsync docker-compose.stage.yml to deploy path
        ├─→ docker compose pull
        ├─→ docker compose up -d
        │      │
        │      └─→ container starts → docker-entrypoint.sh:
        │            ├─→ AppRole login (reads /etc/vault/* from
        │            │    host, mounted ro into container)
        │            ├─→ GET secret/services/cc-fe/staging
        │            ├─→ export CC_FE_* env vars
        │            ├─→ revoke vault token
        │            └─→ exec node server/server.mjs
        └─→ health check on /health
```

(Gitea pull-mirror still runs in parallel for source visibility, but is no longer on the deploy critical path.)

---

## One-Time Setup

### 1. Gitea Mirror from GitHub

The Gitea repo at `git.perpetuator.io/perpetuator/cc-fe` needs to be configured as a **pull mirror** of `github.com/Perpetuator-LLC/cc-fe` so changes pushed to GitHub flow through to Gitea (which triggers the deploy workflow).

**If the Gitea repo already exists as a regular (non-mirror) repo:**

You'll need to convert it. Easiest path:

1. **Back up anything Gitea-only.** Inspect `git.perpetuator.io/perpetuator/cc-fe` — make sure no branches, tags, or issues live only on Gitea. (If any do, push the branches to GitHub first.)
2. **Delete the existing Gitea repo.** Settings → Settings → Delete this Repository.
3. **Re-create as a migration.**
   - Top-right of Gitea: **+ → New Migration → GitHub**
   - **Migrate / Clone From URL**: `https://github.com/Perpetuator-LLC/cc-fe.git`
   - **Authorization**: While the GitHub repo is private, supply a GitHub Personal Access Token with `repo` read scope. After the repo is made public (Phase 5), remove the token — anonymous reads will work.
   - **Owner**: `perpetuator`
   - **Repository Name**: `cc-fe`
   - **This repository will be a mirror**: ✅ check
   - **Mirror interval**: `8h0m0s` is the default; set to `5m0s` for faster sync, or `0` to require manual / webhook-triggered syncs only.
4. Click **Migrate Repository**.

**Optional: GitHub webhook for near-instant sync**

Polling has a 5–10 min lag. To trigger the Gitea mirror sync on every GitHub push:

1. In GitHub: **Settings → Webhooks → Add webhook**
2. **Payload URL**: `https://git.perpetuator.io/api/v1/repos/perpetuator/cc-fe/mirror-sync`
3. **Content type**: `application/json`
4. **Secret**: a Gitea API token with `write:repository` scope (Gitea: User → Settings → Applications → Generate New Token)
5. **Trigger**: just the `push` event
6. **Active**: ✅

This makes Gitea sync within ~1 second of each GitHub push.

### 1b. Gitea Dispatch Token (REQUIRED for auto-deploy)

GitHub Actions calls Gitea's `workflow_dispatch` API to trigger the deploy after each successful image push. This needs a Gitea API token stored as a GitHub repo secret.

**Why this instead of relying on mirror sync?** Gitea Actions does not fire push events on mirror sync — this is a documented limitation. The cleanest workaround is for GitHub Actions to explicitly dispatch the Gitea workflow once it knows the image is published, which also eliminates any race condition where the deploy could start before the image is available.

**One-time setup:**

1. **Create a Gitea token**: in Gitea, click your avatar → **Settings** → **Applications** → **Manage Access Tokens**.
   - **Token Name**: `GitHub Actions dispatch — cc-fe`
   - **Scopes**: just `write:repository` (needed to dispatch workflows)
   - Click **Generate Token** and copy the token (Gitea shows it only once).

2. **Add it as a GitHub repo secret**: in the GitHub cc-fe repo, go to **Settings** → **Secrets and variables** → **Actions** → **New repository secret**.
   - **Name**: `GITEA_DISPATCH_TOKEN`
   - **Value**: (paste the Gitea token)

3. **Verify**: merge a trivial change to `main`. The `build-and-publish.yml` workflow's last step ("Trigger Gitea deploy workflow") should print `✅ Gitea stage-deploy dispatched for ref main` and the Gitea Actions tab should show a new run within a few seconds.

If the secret is missing, the workflow emits a warning rather than failing — deploys just need to be triggered manually from the Gitea Actions UI until the secret is added.

### 2. GHCR Authentication for the Gitea Runner

While the cc-fe GHCR package is private, the Gitea runner needs Docker auth to pull from GHCR.

**Important — DinD isolation:** the Gitea runner on lestrange uses an isolated Docker-in-Docker daemon (see `infra/ansible/playbooks/gitea-runner.yml` in the `mcp` repo). The host's `/root/.docker/config.json` is NOT mounted into the runner. Logging in on the host with `docker login ghcr.io` therefore has NO effect on what the workflow can pull. The runner needs its own credentials, provided via a Gitea secret consumed by `docker login` inside the workflow.

**One-time setup:**

1. **Create a GitHub classic PAT** with `read:packages` scope only:
   - GitHub → Settings → Developer settings → Personal access tokens → **Tokens (classic)** → **Generate new token (classic)**
   - **Note**: `Gitea runner GHCR pull`
   - **Expiration**: 1 year (set a calendar reminder to rotate before it expires)
   - **Scopes**: ONLY check `read:packages` — nothing else
   - Click **Generate token** and copy it (shown once).

   > Fine-grained PATs do not yet support GHCR for organization-owned packages. Use a classic PAT.

2. **Add it as a Gitea repo secret** (in Gitea, at the cc-fe-gh mirror repo):
   - **Repo Settings** → **Actions** → **Secrets** → **Add Secret**
   - **Name**: `GHCR_PULL_TOKEN`
   - **Value**: (paste the PAT)

3. **Verify** by triggering the deploy workflow — the "Login to GHCR" step should print `✅ Authenticated to GHCR` and the subsequent pull step should succeed.

**(Optional) Make the package public** to skip auth entirely:

Since cc-fe is MIT-licensed and intended to be FOSS, the container can be public too:

- GitHub → your org **Packages** → `cc-fe` → **Package settings** (right sidebar) → scroll to **Danger Zone** → **Change visibility** → **Public**
- After that the `GHCR_PULL_TOKEN` step is harmless but unnecessary; you can delete it (and the secret) when convenient.
   - At that point, you can `docker logout ghcr.io` on lestrange and pulls will still work anonymously.

### 3. OpenBao Secrets

The container reads its runtime config from `secret/services/cc-fe/staging` (KV v2). The path must contain these six keys:

| Key | Example value |
|---|---|
| `api_url` | `https://stage-api.capitalcopilot.io` |
| `site_url` | `https://stage.capitalcopilot.io` |
| `oauth_issuer` | `https://stage-api.capitalcopilot.io` |
| `oauth_client_id` | (your OAuth2 client ID) |
| `oauth_scopes` | `read write` |
| `stripe_public_key` | `pk_test_…` or `pk_live_…` |

**Seed the path interactively from your workstation:**

```bash
./scripts/seed-vault-staging.sh
```

The script prompts for a vault token (or uses an existing `vault login` session), then for each value. Sensitive values use `read -rs` (no echo, no shell history), and writes go via STDIN to `vault kv put` (never argv). Run it once per environment.

**Update later** by running the same script again — `vault kv put` replaces the entire payload, so make sure to enter every value (or use `vault kv patch` for incremental updates).

**AppRole credentials — provided via Gitea secrets** (NOT mounted from `/etc/vault`):

The Gitea runner uses Docker-in-Docker (see `infra/ansible/playbooks/gitea-runner.yml` in the `mcp` repo). The host's `/etc/vault` directory is invisible to the runner's DinD daemon — and therefore invisible to the deployed container. So we provide AppRole credentials as Gitea secrets that the deploy workflow passes through as env vars.

**One-time setup:**

1. **Obtain AppRole credentials** for the `cc-fe-staging` role from OpenBao (or whatever role is authorized to read `secret/services/cc-fe/staging`). If you don't have one provisioned, see the OpenBao admin in the `mcp` repo's playbooks.

2. **Add them as Gitea repo secrets** at `git.perpetuator.io/perpetuator/cc-fe-gh` → Settings → Actions → Secrets:
   - **Name**: `VAULT_ROLE_ID` — value: the role_id (typically a UUID, not very sensitive)
   - **Name**: `VAULT_SECRET_ID` — value: the secret_id (treat as sensitive; rotate via OpenBao admin)

3. The deploy workflow reads both, passes them to `docker compose up -d` as env vars, which are forwarded to the container. The container's entrypoint uses them once to fetch a short-lived OpenBao token, fetches the `CC_FE_*` config, then revokes the token. Credentials never persist on container disk.

`docker-entrypoint.sh` accepts AppRole creds from any of three sources (first available wins):

1. `VAULT_TOKEN` env var (e.g. from a vault-agent sidecar)
2. `VAULT_ROLE_ID` + `VAULT_SECRET_ID` env vars ← **CI / Gitea-secrets pattern, what staging uses**
3. `/etc/vault/vault-role-id` + `/etc/vault/vault-secret-id` files (works for non-DinD deploys that bind-mount the host's `/etc/vault`)

> **Existing `scripts/generate-env-from-vault-runtime.sh`** is kept as a debugging tool — useful for verifying OpenBao access from lestrange without spinning up the container. It writes a dotenv file you can `cat`; just delete the file afterward. The deploy pipeline does NOT use it.

---

## Day-to-Day Operations

### Releasing a change

1. Open a PR against `main` on GitHub.
2. Wait for `.github/workflows/pr-checks.yml` to pass (audit, lint, test, build).
3. Merge.
4. On push to `main`:
   - GitHub runs `pr-checks.yml` again (safety net) and `build-and-publish.yml` (builds + publishes GHCR image).
   - Gitea syncs the mirror.
   - Gitea runs `stage-deploy.yml`, which pulls the image and deploys.
5. Verify at https://stage.capitalcopilot.io.

### Rolling back

`docker-compose.stage.yml`'s `image:` line is templated: `ghcr.io/perpetuator-llc/cc-fe:${IMAGE_TAG:-latest}`. The deploy pipeline always sets `IMAGE_TAG=sha-<commit>` so each release is pinned to a specific image — no `:latest` race. Rollback is one command:

```bash
# On lestrange, in /mnt/storage1/stage.capitalcopilot.io/
IMAGE_TAG=sha-abc1234 docker compose -p cc-fe-stage -f docker-compose.stage.yml up -d
```

Replace `sha-abc1234` with whichever previous build you want to revert to (`docker images ghcr.io/perpetuator-llc/cc-fe` shows what's available locally; GHCR has the full history).

`IMAGE_TAG` is environment-scoped to the `up -d` invocation — the next pipeline-driven deploy will set its own SHA and roll forward automatically. Edit nothing on disk.

### Tagged releases

Push a semver tag from main:

```bash
git tag v1.2.3
git push origin v1.2.3
```

`build-and-publish.yml` will build and push:
- `ghcr.io/perpetuator-llc/cc-fe:1.2.3`
- `ghcr.io/perpetuator-llc/cc-fe:1.2`
- `ghcr.io/perpetuator-llc/cc-fe:sha-<hash>`

The Gitea deploy workflow does NOT trigger on tags (only `main` pushes), so tagged builds are publish-only by default. You can manually `docker compose pull` on lestrange to roll forward.

### Self-hosting (FOSS users)

The image at `ghcr.io/perpetuator-llc/cc-fe:latest` is public after the FOSS switch (Phase 5). Self-hosters can run it directly:

```bash
docker run -d -p 4000:80 \
  -e CC_FE_API_URL=https://your-api.example.com \
  -e CC_FE_SITE_URL=https://your-frontend.example.com \
  -e CC_FE_STRIPE_PUBLIC_KEY=pk_live_xxx \
  -e CC_FE_OAUTH_ISSUER=https://your-api.example.com \
  -e CC_FE_OAUTH_CLIENT_ID=your-client-id \
  -e CC_FE_OAUTH_SCOPES='read write' \
  ghcr.io/perpetuator-llc/cc-fe:latest
```

The container fails fast at start if `CC_FE_API_URL` or `CC_FE_SITE_URL` is missing.

---

## Troubleshooting

### "Image pull failed: unauthorized"

GHCR auth on lestrange has expired or wasn't set up. Run the `docker login ghcr.io` step in [GHCR Authentication on Lestrange](#2-ghcr-authentication-on-lestrange) again.

### Deploy step says "Timed out waiting for ghcr.io/.../cc-fe:sha-XXX"

The GitHub Actions `build-and-publish.yml` workflow failed or is slower than 10 minutes.

- Check the GitHub Actions run: https://github.com/Perpetuator-LLC/cc-fe/actions
- Common cause: Trivy scan blocked the build on a HIGH/CRITICAL CVE. Look at the Trivy step output and either patch the affected dependency or (if it's a false positive) update `.trivyignore`.

### Frontend serves placeholder API URLs

`.env.stage` was not generated, or the container started before it was written.

- Check `/mnt/storage1/stage.capitalcopilot.io/.env.stage` exists and has real values.
- Check `docker logs cc-fe-stage-angular` for the entrypoint output — it logs `Starting cc-fe with API_URL=...` at startup.

### Tests pass locally but fail in CI

CI runs in the Gitea workflow using a `docker create + docker cp` pattern (DinD-safe). The test step copies the entire checkout into the container, runs `yarn install && yarn test`. If you've added a file that isn't picked up, ensure it's tracked by git.
