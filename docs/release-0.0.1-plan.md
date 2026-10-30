# Release 0.0.1 plan

## Goal and assumptions

Build an installed desktop application that connects to PostgreSQL and MongoDB,
helps users inspect their data, and provides a practical way to improve Go skills.
Target completion: **December 31, 2026**.

This plan starts October 29, 2026 and assumes about 8–12 hours per week, with
additional time potentially needed for frontend integration. The developer's
primary learning goal is Go backend implementation; frontend work can be handled
separately using the [UI/UX specification](ui-ux-guide.md) and
[handoff contracts](frontend-handoff.md). It is a target, not a delivery guarantee.
Complete one working vertical slice at a time. A working desktop release still
requires frontend implementation and integration, even if that work is delegated
in a separate task.

Implementation starts from the accepted prototype interactions, not from its
JavaScript internals. The [domain model](domain-model.md) defines stable IDs and
ownership; the [beginner guide](implementation-guide.md#turn-the-ui-into-small-implementation-tasks)
breaks the work into reviewable backend-first tasks.

Choose the developer's own operating system as the first packaging target.
Cross-platform installers can follow once the first target works.

## Release scope

The [feature inventory](features.md) assigns stable IDs, responsibilities, and
acceptance checks. The [plugin design](plugin-design.md) keeps the two built-in
integrations small; external installable plugins remain deferred.

| Capability | PostgreSQL | MongoDB |
| --- | --- | --- |
| Connect and disconnect | Host, port, database, user, password, TLS | Connection URI and database |
| Test connection | Ping with timeout | Ping with timeout |
| Browse structure | Schemas, tables, columns, primary/foreign keys | Databases, collections, sampled fields |
| Read data | Table filter field; database-level SQL console tabs | Collection filter field, document list, JSON viewer |
| Query controls | Run, cancel, timeout, bounded result preview | Filter, projection, sort, limit, cancel, timeout |
| Autocomplete | Keywords, schemas, tables, columns | Operators and sampled field names |
| Profiles | Add/edit/rename non-secret settings via pencil; prompt for password | Add/edit/rename parsed non-secret settings via pencil; prompt for credentials |

Errors and loading states are required. The user subsequently requested
database-level New → Query Console tabs with separate resource filter fields.
Use explicit entity menus to open tabs; explorer row clicks only select/expand.
This replaces the earlier single-editor UI plan. History/session restoration
remain stretch goals. The prototype also explores MongoDB command-JSON consoles;
command execution needs its own backend contract beyond the initial Find adapter.
Gate that capability on a defined command set and bounded integration tests; keep
the production action unavailable until those exist. Do not treat mock JSON
validation as working MongoDB command execution.

### UI behavior that shapes backend work

- Keep saved profile IDs distinct from active session (`connectionId`) IDs.
  Save/edit does not reconnect; settings changes apply to a later connection.
  Test and Connect have distinct outcomes and never imply a tab was opened.
- Connection roots have a direct edit pencil. Roots/schemas/group folders have
  no menus or overview pages. Tree row clicks and search do not retarget work.
- Resource Open in Tab reuses its session/resource tab. Database New → Query
  Console creates an independent editor with a captured database target.
- Results and cancellation belong to their original tab/request. Closing the
  last/all tabs yields an empty workspace without disconnecting profiles, and
  late completions cannot reopen tabs.
- Go owns drivers/validation/metadata/bounds; the frontend owns tabs, window
  drafts, explorer selection, breadcrumbs, and value inspection. Backend PRs
  can be reviewed with real database evidence before frontend integration.

### Explicitly deferred

- Kafka, HTTP, and additional database integrations.
- Record editing, imports, exports, migrations, and database administration.
- Arbitrary `mongosh` scripts or JavaScript execution.
- Advanced SQL parsing, alias-aware completion, and a language server.
- SSH tunnels, cloud-specific login flows, and third-party plugins.
- OS keychain integration and credential persistence.
- Polished installers for every operating system.

## Weekly milestones

| Dates (2026) | Deliverable | Go learning focus | Demonstration |
| --- | --- | --- | --- |
| Oct 29–Nov 4 | Small PostgreSQL and MongoDB CLI experiments | Modules, structs, methods, errors, context | Print SQL rows and MongoDB documents; exit cleanly |
| Nov 5–11 | Wails shell; catalog, in-memory profile add/edit; Test/Connect/Disconnect | Typed settings, packages, session snapshots, frontend bindings | Pencil reopens settings; Cancel preserves them; Save never changes an existing session |
| Nov 12–18 | PostgreSQL structure explorer | pgx, metadata queries, scanning | Expand schemas and tables; inspect columns and keys |
| Nov 19–25 | Table filters, SQL console tabs, result grid | Dynamic values, request registry, cleanup, cancellation | Two independent consoles; inactive completion; close-all cancels and stays empty |
| Nov 26–Dec 2 | MongoDB explorer and Find; command-console contract gate | BSON, Extended JSON, cursors, capability validation | Browse/filter/project/sort; define and test supported commands before enabling a console |
| Dec 3–9 | Basic autocomplete | Metadata caching and data contracts | Suggest SQL names and MongoDB operators/observed fields |
| Dec 10–16 | Atomic non-secret profile persistence and reconnect checks | File handling, serialization, lifecycle management | Restart restores edited settings with blank passwords; reconnect has a new session ID |
| Dec 17–23 | Integration tests and reliability fixes | Testing, race detection, errors | Handle invalid credentials, timeouts, disconnects, cancellation |
| Dec 24–31 | Packaging, documentation, bug fixes | Desktop builds and release workflow | Install on the chosen OS and complete the end-to-end workflow |

Reserve the last week for stabilization. This schedule is tight for 8–12 hours
per week, especially for desktop integration and a separate MongoDB command
handler. Review progress weekly using real demonstrations. Drop optional history,
session/layout restoration, and visual polish first; non-secret profile storage
is required. If core database/tab behavior still does not fit, explicitly revise
the scope or date rather than replacing real execution with a mock.

## Definition of done

- [ ] Install and launch the app on the selected desktop OS.
- [ ] Connect to and disconnect from both local sample databases.
- [ ] Reuse a saved profile after restarting, with credentials entered again.
- [ ] Add/edit/rename through the catalog/pencil workflow; Cancel leaves settings
      intact, passwords reopen blank, and Save never retargets existing sessions.
- [ ] Inspect PostgreSQL schemas, tables, columns, and keys.
- [ ] Browse MongoDB databases/collections and clearly labeled sampled fields.
- [ ] Run SQL and MongoDB finds; inspect results and empty states.
- [ ] Filter table/collection data with text fields; open separate database query
      consoles without retargeting drafts, results, or cancellation.
- [ ] Row clicks only select/expand; explicit menus open data/consoles; no parent
      overview pages. Close the last/all tabs without reopening via late results.
- [ ] Receive useful basic completion suggestions for both databases.
- [ ] Cancel slow operations and receive understandable connection/query errors.
- [ ] Keep the UI responsive and result retrieval bounded.
- [ ] Preserve NULL, large integers, dates, ObjectIDs, and nested documents.
- [ ] Pass relevant Go tests and manually exercise the packaged application.
- [ ] Document supported operations, limitations, and development commands.

MongoDB command-console delivery has a separate gate: documented supported
commands, Go-side authorization/validation, captured database identity, bounded
results, timeout/cancel tests, and a real UI demonstration. Track its status as
MG-04; do not mark it delivered merely because the Find workflow is complete.

## Validation strategy

Use disposable local PostgreSQL and MongoDB instances with deterministic sample
data. Pin service and tool versions when implementation starts. Test against
actual databases rather than mocking all driver behavior.

Required integration cases: connection success/failure, metadata discovery,
known query results, empty results, type preservation, timeout, cancellation,
and cleanup. Include PostgreSQL NULL and large integers, and MongoDB ObjectIDs,
dates, arrays, and documents with inconsistent fields.

Add identity/lifecycle cases introduced by the UI: save a different endpoint
during a run; two profiles on the same server; two consoles on the same database;
completion in an inactive tab; close/all-close while running; disconnect and
reconnect with a fresh session ID. Verify non-secret profile round-trips, failed
atomic writes, and malformed configuration. UI checks cover explicit open actions,
pencil focus/cancel, empty workspace, and keyboard/navigation state separately
from actual driver integration tests.

Run `go test ./...` as packages are added. Run `go test -race ./...` after shared
connection state and cancellation are introduced. Clearly distinguish tests that
ran from integration tests skipped because services were unavailable.

Manually verify the actual UI and installed build. A passing Go test suite alone
does not prove desktop startup, frontend bindings, or rendering work.
