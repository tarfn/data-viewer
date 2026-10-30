# Run and develop Data Viewer

The repository now has a Go/Wails desktop shell and a React/TypeScript UI preview.
The UI uses fictional data for PostgreSQL, MongoDB, Kafka, and HTTP. It never
connects, executes a query, publishes a record, or sends an HTTP request. The only
Go bridge method is `App.Info`, which reports shell name/version/mode. Database
adapters, sessions, profile files, and request APIs remain for later Go work.

## Prerequisites

- Go 1.26 or later; this branch was checked with Go 1.26.10.
- Node.js 22.12 or later and npm; this branch was checked with Node 24.19.0.
- Wails CLI **v2.17.0**, matching `go.mod`.
- For desktop development, the [Wails platform prerequisites](https://wails.io/docs/gettingstarted/installation).
  On modern Debian/Ubuntu, install a C compiler, `pkg-config`, `libgtk-3-dev`,
  and `libwebkit2gtk-4.1-dev`, and use the `webkit2_41` build tag. Windows/macOS
  have their own platform prerequisites. A graphical session is needed to launch.

Install the CLI with checksum verification enabled:

```sh
go install github.com/wailsapp/wails/v2/cmd/wails@v2.17.0
```

Ensure the Go bin directory is on PATH. Dependency versions are pinned in
`go.mod`, `go.sum`, `frontend/package.json`, and `frontend/package-lock.json`.

## Browser UI development

From the repository root:

```sh
npm --prefix frontend ci
npm --prefix frontend run dev
```

The Vite server binds to loopback on port 5173. Browser mode needs no Go process,
database, credentials, or desktop libraries. The header identifies it as Browser
preview. Changes to mock profile/draft state disappear on reload.

## Desktop development and builds

Build frontend assets once before standalone Go checks because `main.go` embeds
`frontend/dist` (generated and ignored):

```sh
npm --prefix frontend run build
go mod download
wails dev -tags webkit2_41
```

On Windows/macOS, omit the Linux-specific tag: `wails dev`. The Wails dev command
runs the configured Vite watcher and generates bridge bindings. In the desktop
header, a successful `App.Info` call identifies the desktop shell. This does not
mean a database connection exists.

For a production Linux executable:

```sh
wails build -tags webkit2_41 -nopackage -trimpath
```

The output is `build/bin/data-viewer`. Omit the tag on Windows/macOS. Only the
Linux build is validated in this cloud task; cross-platform packaging still needs
its own checks. Generated Wails bindings in `frontend/wailsjs` are committed;
regenerate with `wails generate module` after changing exported Go methods or
DTOs. Do not edit generated files by hand.

## Checks

```sh
npm --prefix frontend run format:check
npm --prefix frontend run typecheck
npm --prefix frontend test
npm --prefix frontend run build
go vet -tags bindings ./...
go test -tags bindings ./...
```

Vitest tests cover workspace/request identity, late results, draft cleanup, and
non-secret mock profile handling. The Go commands use Wails' `bindings` tag to
check the bridge without native GTK/WebKit linkage; there are no Go tests yet.
They do not replace a native Wails build or verify database behavior.

Browser interaction checks:

```sh
cd frontend
npx playwright install chromium
npm run test:e2e
```

On Linux, Playwright may also require its documented OS dependencies. The config
uses `/usr/bin/chromium` when present; otherwise it uses Playwright's installed
browser. Override with `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` if needed. Tests start
their own Vite server and cover profile editing, explicit menus, tab isolation,
empty workspace, typed value inspection, Kafka publish/consume, HTTP source
capture, keyboard behavior, and narrow layout. These are UI simulation checks,
not integration tests against real services.

## Source map and next backend work

| Location | Responsibility |
| --- | --- |
| `main.go`, `app.go`, `wails.json` | Native window, embedded assets, lifecycle hook, minimal metadata bridge |
| `frontend/src/App.tsx` | Application composition, profile/tree state, dialogs, layout |
| `frontend/src/components` | Explorer/menus, connection forms, database/Kafka/HTTP views, CodeMirror, value drawer |
| `frontend/src/integrations.ts` | Trusted built-in catalog, demo profiles, structured resource references |
| `frontend/src/workspace.ts` | Tabs, per-resource drafts, request ownership and abortable mock runs |
| `frontend/src/mock.ts` | Fixed typed results and local form/query validation; no network I/O |
| `frontend/src/shell.ts`, `frontend/wailsjs` | Browser fallback and generated Go bridge |

Start backend implementation with disposable PostgreSQL/MongoDB CLI experiments,
then typed profile validation and Test/Connect/Disconnect. Keep the existing UI
on mock data until a capability's Go contract and real-service checks are ready.
Replace mock calls one capability at a time using generated bindings; do not add
fake driver implementations to Go merely to make a button appear connected.
Follow the [beginner guide](implementation-guide.md), [domain model](domain-model.md),
and [handoff](frontend-handoff.md).

The current React preview deliberately retains the prototype's simplified
semantics: fixed sample results rather than real query filtering, window-only
settings/drafts, static sample metadata/completion, and no session restoration.
Kafka/HTTP remain future backend integrations. MongoDB command JSON still needs
its supported-command policy before a production execution API is enabled.

## Cloud Linux build container

`build/Dockerfile.linux` provides native GTK/WebKit build dependencies when the
cloud host does not have them. It runs build/launch commands as UID 1000. The
managed environment has Go/Wails under `/workspace/.tools` and uses the system
CA bundle for the session proxy. Build with TLS/package verification enabled:

```sh
BUILDX_CONFIG=/workspace/.tools/buildx docker build \
  --secret id=proxy_ca,src=/etc/ssl/certs/ca-certificates.crt \
  -t data-viewer-native -f build/Dockerfile.linux build
docker run --rm \
  --mount type=bind,src=/workspace,dst=/workspace \
  --mount type=bind,src=/etc/ssl/certs/ca-certificates.crt,dst=/run/system-ca.pem,readonly \
  -e SSL_CERT_FILE=/run/system-ca.pem \
  -e GOPATH=/workspace/.tools/gopath \
  -e GOCACHE=/workspace/.cache/go-native \
  -e XDG_CONFIG_HOME=/workspace/.cache/config \
  -e PATH=/workspace/.tools/go/bin:/workspace/.tools/gopath/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin \
  -w /workspace/data-viewer data-viewer-native \
  wails build -s -tags webkit2_41 -nopackage -trimpath
```

Run the frontend production build first; `-s` reuses those assets. This container
is an optional cloud build helper, not a requirement for local desktop development.
It needs access to the managed Docker daemon; registry/proxy access and CA trust
are session configuration, not credentials to commit into the image.

Verified in this task: frontend typecheck/build, 7 Vitest tests, 6 Playwright
scenarios using Chromium, Go vet/compile with the bindings tag, Linux native
Wails build, and a virtual-display startup showing the `App.Info` desktop bridge.
The CI workflow is committed but has not run on GitHub yet. These checks do not
exercise a real database or Kafka/HTTP service.

Screenshots: [workspace](screenshots/ui-workspace.png),
[query console](screenshots/ui-query-console.png),
[connection settings](screenshots/ui-connection-settings.png), and
[native Linux startup](screenshots/desktop-linux.png).
