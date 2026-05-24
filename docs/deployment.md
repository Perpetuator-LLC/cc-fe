# Deployment Architecture

## Overview

cc-fe uses a **pull-based deployment** model:

1. **GitHub** is the source of truth and the public FOSS repo.
2. **GitHub Actions** builds the Docker image, scans it with Trivy, and pushes to **GHCR** (`ghcr.io/perpetuator-llc/cc-fe`).
3. **Gitea** mirrors the GitHub repo (pull mirror, syncs every few minutes or on webhook).
4. **Gitea Actions** triggers `.gitea/workflows/stage-deploy.yml` on push to `main`, which:
   - Runs audit/lint/test gates
   - Generates runtime config from OpenBao into `.env.stage`
   - Waits for the GHCR image (polls for the SHA tag)
   - Pulls the image and `docker compose up -d`

```
GitHub push to main
  │
  ├─→ pr-checks.yml      (re-runs audit/lint/test/build)
  │
  └─→ build-and-publish.yml
        │
        ├─→ Docker build
        ├─→ Trivy scan (blocks CRITICAL/HIGH with fixes)
        └─→ Push to ghcr.io/perpetuator-llc/cc-fe:{latest, sha-XXX}

(Gitea mirror sync, ~1–5 min)
  │
  └─→ Gitea push to main on git.perpetuator.io
        │
        └─→ stage-deploy.yml
              ├─→ audit / lint / test (gates)
              ├─→ generate-env-from-vault-runtime.sh → .env.stage
              ├─→ wait for GHCR sha-XXX tag (10 min timeout)
              ├─→ docker compose pull
              ├─→ docker compose up -d
              └─→ health check
```

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

### 2. GHCR Authentication on Lestrange

While the cc-fe GHCR package is private, the Gitea deploy runner on lestrange needs Docker auth to pull from GHCR.

1. **Create a GitHub PAT** with `read:packages` scope only (no other permissions):
   - GitHub → Settings → Developer settings → Personal access tokens → **Tokens (classic)** → **Generate new token (classic)**
   - **Note**: `lestrange GHCR pull`
   - **Expiration**: 1 year (or no expiration if you accept the risk)
   - **Scopes**: just `read:packages`
   - Click **Generate token** and save it.

2. **On lestrange, as the user the Gitea runner runs as** (likely `root` or a `deploy` user — check with `ps aux | grep act_runner`):
   ```bash
   echo "ghp_YOUR_TOKEN_HERE" | docker login ghcr.io -u perpetuator-llc --password-stdin
   ```
   This writes `~/.docker/config.json` with the credentials.

3. **Verify** (after the first `build-and-publish.yml` run completes on GitHub):
   ```bash
   docker pull ghcr.io/perpetuator-llc/cc-fe:latest
   ```
   Should succeed without prompting.

4. **After the repo is made public (Phase 5)**, you can also make the GHCR package public so no auth is needed for pulls:
   - GitHub → Your profile → Packages → cc-fe → **Package settings** → **Change visibility** → **Public**
   - At that point, you can `docker logout ghcr.io` on lestrange and pulls will still work anonymously.

### 3. OpenBao Secrets

The OpenBao secret path used by the deploy script is `secret/services/cc-fe/staging`. It must contain these keys:

```bash
vault kv put secret/services/cc-fe/staging \
  api_url=https://stage-api.capitalcopilot.io \
  site_url=https://stage.capitalcopilot.io \
  stripe_public_key=pk_test_xxx \
  oauth_issuer=https://stage-api.capitalcopilot.io \
  oauth_client_id=YOUR_CLIENT_ID \
  oauth_scopes='read write'
```

The deploy script (`scripts/generate-env-from-vault-runtime.sh`) reads these and writes `.env.stage` (a dotenv file) on lestrange, which `docker-compose.stage.yml` loads into the container.

AppRole credentials for the deploy host already live at:

- `/etc/vault/vault-role-id`
- `/etc/vault/vault-secret-id`

(No change from the existing setup.)

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

To pin to a specific image tag, edit `docker-compose.stage.yml` on lestrange and change the `image:` line:

```yaml
image: ghcr.io/perpetuator-llc/cc-fe:sha-abc1234  # or :v1.2.3
```

Then `docker compose -p cc-fe-stage -f docker-compose.stage.yml up -d` to apply.

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
