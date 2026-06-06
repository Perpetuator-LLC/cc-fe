<!-- Copyright (c) 2026 Perpetuator LLC -->

# Containerized dev environment

cc-fe's dev server runs in a container so the toolchain (Node 22 + the exact
locked dependencies) is identical on every machine and in CI — while still
hot-reloading from your host edits exactly like a native `yarn start`. One
`docker-compose.yml` is the single source of truth, driven from either the CLI
or the IDE; start it from one and the other sees the same container, logs, and
health.

This mirrors the cc-be dev infra. The design rationale (12 principles + the
gotchas we already hit) lives in `cc-be/notes/frontend/DEV_INFRA_DOCKER_IDE_CICD.md`.

## Native `npm`/`yarn` still works — the two coexist

The container is the recommended default — the CLI and IDE stay in sync off one
compose file, and tooling (including AI assistants) can see whether the dev
server is running via `docker compose ps`. But running natively is fully
supported and unchanged:

```bash
yarn start      # native ng serve on :4200 — exactly as before
yarn test       # native unit tests
yarn build      # native production build
```

- **They don't corrupt each other.** The container keeps its Linux
  `node_modules` and `.angular` cache in anonymous volumes, so they never touch
  your host's macOS copies. Switch between `yarn start` and `scripts/dev_up.sh`
  freely.
- **Only one can own port 4200 at a time** (true of any two dev servers). Stop
  one before starting the other — `scripts/dev_down.sh` releases the port
  cleanly so a native `yarn start` works immediately after.
- **Your IDE still needs `node_modules` on the host** for IntelliSense / the
  Angular language service, so run `yarn install` once locally even if you only
  ever *run* the app in the container.
- **IDE run configs ship for both:** `.idea/runConfigurations/` has **Dev
  Stack** / **Web (dev server)** (container) and **Dev Server (native ng
  serve)** (native); VS Code has the `dev: up` task alongside the original
  `npm: start`.

## Quickstart

### CLI

```bash
scripts/dev_up.sh            # start the dev server (builds the image first time)
scripts/dev_up.sh --build    # force-rebuild after changing package.json / yarn.lock
docker compose logs -f web   # watch the dev server / compile output
scripts/dev_status.sh        # show running state + health
scripts/dev_down.sh          # stop (keeps the node_modules volume)
scripts/dev_down.sh --wipe   # stop + drop volumes (fresh dep install next time)
```

Then open <http://localhost:4200>. The first cold compile takes ~30–90s; after
that, edits hot-reload.

### JetBrains (WebStorm / IntelliJ)

Run the **Dev Stack** configuration (`.idea/runConfigurations/Dev_Stack.xml`) —
it's a Docker Compose deployment pointing at `docker-compose.yml`, so the
Services panel shows real running state, health, and streaming logs. **Web (dev
server)** scopes the same compose file to just the `web` service. Both point at
the *same* file the CLI uses, so the IDE and the terminal can't drift.

### VS Code

Run the **dev: up (container HMR)**, **dev: logs**, or **dev: down** tasks
(`.vscode/tasks.json`) — they call the same `scripts/dev_*.sh` wrappers.

## How it works

### Image stages (`Dockerfile`)

| Stage | Purpose |
| --- | --- |
| `deps` | `yarn install --frozen-lockfile` — shared dependency layer |
| `dev` | `ng serve` + HMR; **source is bind-mounted at runtime**, not copied in |
| `build` | copies source + `ng build` (production bundle); also the CI lint/test target |
| `production` | minimal runtime image — only `dist/` + the entrypoint, no source/devDeps/secrets |

`dev` and `build` share the `deps` layer, so the install only re-runs when the
lockfile changes. The `production` artifact is identical to what the previous
single-stage build produced.

### Volumes & hot reload (`docker-compose.yml`)

```yaml
volumes:
  - .:/app:ro              # host repo → container, READ-ONLY (see Security model)
  - /app/node_modules      # anonymous volume: image's LINUX deps + vite cache (RW)
  - /app/.angular          # anonymous volume: Angular build cache (RW)
  - /app/.git              # empty volume: hides git history/hooks from container
```

- The repo bind-mount is what makes host edits hot-reload inside the container.
  It is mounted **read-only** — host edits still reload (the *host* writes the
  file; the container only reads it), but the container can't write back. See
  the Security model below.
- The `/app/node_modules` anonymous volume is **essential**: without it the bind
  mount would hide the image's installed deps and `ng` wouldn't start. It also
  prevents the host's macOS/arm binaries (esbuild, native addons) from shadowing
  the image's Linux build.
- `.angular` is kept container-local so a stale host cache can't be loaded over
  the mount (the FE analogue of cc-be's `PYTHONPYCACHEPREFIX` fix).
- **Polling** (`--poll 2000` + `CHOKIDAR_USEPOLLING` / `WATCHPACK_POLLING`) is
  on because macOS bind-mount file events don't reliably reach the Linux
  container's inotify. If reloads feel slow, raise/lower the interval.

> **Running code generators / `--fix` in the container.** Because the source is
> read-only, commands that *write* to the tree (`yarn generate` GraphQL codegen,
> `ng generate`, `eslint --fix`, `prettier --write`) won't work inside the `web`
> container. Run them **natively** (`yarn generate`), or with a one-off RW
> container: `docker run --rm -v "$PWD:/app" -w /app cc-fe-dev:latest yarn generate`.

### Pointing the dev server at a backend

The app's runtime config comes from `src/environments/environment.ts`, which is
bind-mounted into the container — so whatever API URL you already use natively
(local cc-be on `http://localhost:8000`, staging, etc.) works unchanged, because
the browser runs on the host and reaches `localhost` the same way. If you ever
add a service that the **SSR server inside the container** must reach, address it
by compose service name (not `localhost`) and expose a separate host-reachable
URL for the browser — see Principle 2 in the cc-be notes.

## CI parity

CI builds the **same `Dockerfile`** and runs the checks against the source baked
into the image — it does **not** bind-mount, because the Gitea runner is
Docker-in-Docker and its daemon can't see the runner's filesystem. Same image
and toolchain as local; only source delivery differs (bake vs bind-mount).

- Run unit tests in-image by targeting the `build` stage:
  `docker build --target build -t cc-fe-ci . && docker run --rm cc-fe-ci yarn test --watch=false --browsers=ChromeHeadlessNoSandbox`
  (`.dockerignore` keeps `*.spec.ts` in the build context for exactly this).
- Lint-in-image additionally needs the lint configs in the build context
  (`eslint.config.js`, etc.), which `.dockerignore` currently excludes from the
  runtime image — relax those for the CI stage when wiring lint into CI.

> Status: the dev container + image stages are in place and CI-ready. Migrating
> the GitHub/Gitea check workflows to run inside this image is the planned next
> step (the workflows were just hardened separately; we'll layer container
> parity on top rather than rewrite them blind).

## Security model

The container is also a **supply-chain blast-radius reducer**. A malicious npm
dependency executing at runtime is confined to the container instead of running
as you on the host.

**A compromised dependency in the dev container CAN reach:**

- The repo at `/app` — but **read-only** (it can read source; it cannot write
  malware back into the tree or into `.git/hooks`).
- The container's env vars — which hold **no secrets** (`NODE_ENV` + polling
  flags only). No Vault/OpenBao credentials are present in dev (only the
  production container authenticates to OpenBao).
- Outbound network (so treat the `yarn audit` / Trivy gates as the real defense
  against a *known*-bad dep).

**It CANNOT reach** (all of which a native `yarn start` *would* expose): your
home dir, `~/.ssh`, `~/.docker/config.json`, `~/.aws`, `~/.config/gh` (GitHub
token), the macOS keychain, your other repos, or your shell rc files.

**Hardening in place** (`docker-compose.yml` + `Dockerfile`):

| Control | Effect |
| --- | --- |
| `.:/app:ro` | container can't write to the repo (kills the config-injection vector) |
| `/app/.git` empty volume | git history/hooks hidden from the container |
| `cap_drop: [ALL]` | no Linux capabilities |
| `no-new-privileges:true` | no setuid privilege escalation |
| base image pinned by digest | a poisoned upstream `node:22-alpine` tag can't be pulled |
| no `env_file`, no secrets, no `/var/run/docker.sock` | nothing high-value to steal, no host-Docker escape |

**Keep it this way:** don't add Vault creds or a real `.env` to the dev stack,
and keep throwaway values in `environment.ts`'s `TEST_EMAIL` / `TEST_PASSWORD`
(that file is in the read-only blast radius). The remaining residual risk is
egress (a dep can still phone home) and that the container runs as root —
mitigated by the dropped capabilities; running as a non-root user is a possible
further step.

## Troubleshooting

- **Port 4200 in use** — a native `ng serve` is already running; stop it (or
  change the host port mapping in `docker-compose.yml`).
- **Edits don't reload** — confirm you're editing files under the repo root (the
  bind-mounted tree) and that polling env vars are set; very large trees may need
  a longer `--poll` interval.
- **`ng: not found` / deps look wrong after a `yarn add`** — the image's deps are
  in an anonymous volume; rebuild and reset it: `scripts/dev_down.sh --wipe && scripts/dev_up.sh --build`.
- **Slow first load** — expected; the initial cold compile of the full app runs
  before the first response (the healthcheck `start_period` allows for it).
