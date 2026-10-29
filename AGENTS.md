# Repository guidance for Codex

## Project status and scope

Data Viewer is a planning-stage desktop workspace inspired by DataGrip. Its
long-term purpose is to connect several kinds of data/developer tools in one
application: databases first, then potentially Kafka and HTTP. It is a personal
learning project, not an attempt to match all DataGrip features in one release.

The developer's primary goal is to improve beginner Go skills by implementing
the backend personally. Favor understandable, incremental Go code over elaborate
abstractions. Frontend work can be implemented separately from the documented
UI/UX and handoff contracts; do not require the developer to build the UI before
a backend capability can be tested or reviewed.

The main development target is **release 0.0.1 by December 31, 2026**: connect to
PostgreSQL and MongoDB, browse structure, run SQL or MongoDB Find, inspect bounded
typed results, and offer basic metadata-based autocomplete. Timeouts,
cancellation, safe credential handling, and clear errors are part of that target.
PostgreSQL has declared schemas; MongoDB fields are sampled observations and
must not be presented as a guaranteed collection schema.

The proposed stack is Go + Wails + React/TypeScript, CodeMirror 6, pgx, and the
official MongoDB Go driver. Required scope and acceptance checks are in
[features](docs/features.md) and [the release plan](docs/release-0.0.1-plan.md).
Kafka/HTTP, record editing, arbitrary mongosh scripts, advanced SQL parsing,
external installable plugins, and credential persistence are deferred. Tabs and
history are stretch goals. A reviewer should not demand them for this release.

The documentation prototype also explores Kafka/HTTP forms and workspaces at the
user's request. These are future UI designs, not shipped integrations or added
0.0.1 backend requirements. Research evidence and limitations are recorded in
[UI research](docs/ui-research.md); distinguish simulated interactions from real
connectivity and actual integration tests.

Start with [README.md](README.md) and the linked design documents. Planned APIs,
screens, and prototype behavior are not shipped features. Do not scaffold the
application during documentation-only tasks. Update this status as implementation
lands rather than treating planning-stage assumptions as permanent.

Keep changes focused on the requested feature. Use the existing checkout;
create branches as requested. Preserve unrelated changes. Never commit secrets
or connection strings containing credentials.

## Implementation conventions

- Keep database logic in Go and keep Wails methods thin.
- Pass contexts through database operations; close rows, cursors, and clients.
- Keep SQL and MongoDB Find contracts separate. Prefer small capability
  interfaces and built-in adapters over a runtime plugin framework.
- Preserve database types across the Go/JavaScript boundary.
- Update relevant feature, contract, and UX documentation when behavior changes.

## Validation

There is currently no application, Go module, or test suite. For documentation,
check relative links, code fences, and `git diff --check`. Do not claim Go tests
or UI checks passed when no implementation exists.

Once Go packages exist, run relevant tests; use integration tests for actual
driver behavior and the race detector when shared lifecycle state changes.
Report unavailable dependencies and skipped checks explicitly. Follow documented
commands as they are introduced rather than inventing a passing test workflow.

## Code review guidelines

Use [the PR review guide](docs/pr-review-guide.md) for review scope and reporting.
Read the diff and enough surrounding code to establish an actual failure path.
Prioritize credential exposure, wrong-connection execution, data/type corruption,
unbounded responses, ineffective cancellation, resource leaks, and races.

Report actionable defects introduced by the change with file/line evidence,
trigger, user impact, and severity. Do not treat deferred features or documented
design sketches as missing implementation bugs. Avoid speculative findings,
style-only findings, duplicate findings, and unsupported test claims. Distinguish
blocking correctness defects from optional suggestions.
