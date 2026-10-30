# Beginner implementation guide

Work in small steps: learn one concept, implement a usable behavior, verify it,
then commit it. The [release plan](release-0.0.1-plan.md) defines scope and dates;
the [architecture](architecture.md) explains component boundaries.
Use the [domain model](domain-model.md) for profile/session/resource/tab/request
identity and lifecycle decisions. Its types are a guide, not a requirement to
create every package before the first database connection works.

Your primary focus can stay on Go. Implement and test each backend capability
against the [handoff contract](frontend-handoff.md). Frontend work can be completed
separately using the [UI/UX guide](ui-ux-guide.md) and interactive wireframe.
Review backend completion and full desktop completion as separate milestones.
The module, Wails shell, and React preview are now initialized. Use
[development setup](development.md) to run them; the steps below describe the
remaining real backend work, not instructions to replace the existing scaffold.

## Turn the UI into small implementation tasks

Implement one row at a time; a row can span several small PRs. Use Go tests or a
temporary CLI to demonstrate backend behavior before frontend bindings exist.

| Order | Backend task | Frontend handoff / evidence |
| --- | --- | --- |
| 1 | PostgreSQL/MongoDB experiments with contexts and typed values | Actual sample results and clean client shutdown |
| 2 | Built-in descriptors, typed settings, in-memory profile add/edit/rename; no saved secrets | Catalog and pencil forms use stable IDs; cancel/save/reopen fixtures |
| 3 | Test/Connect/Disconnect; immutable session settings, safe errors | Test never saves; successful Connect returns a session ID; edit does not reconnect |
| 4 | PostgreSQL metadata and PreviewTable with bounded filters | Nested tree; explicit Open in Tab; declared Structure |
| 5 | ExecuteSQL plus request registry/deadlines/Cancel | Multiple database consoles; inactive results, close/all-close cleanup |
| 6 | MongoDB metadata, FindDocuments, sampled fields | Collection filters and advanced Find inputs; Extended JSON and Sampled fields |
| 7 | Metadata completion and atomic non-secret profile storage | Reopen saved settings; credentials blank; reconnect creates a fresh session |
| 8 | Reliability and chosen-OS packaging | Real bridge, empty/error states, both database workflows |

Treat MongoDB command consoles as a separate capability gate during step 6:
define the supported native commands and bounds, then implement/test the handler
before enabling Run. Do not turn the HTML mock into a generic command runner.
Kafka consume/publish and HTTP remain future slices after the database release.

## 1. Connect from a Go program

Use the existing Go module and add a temporary CLI under `cmd/experiments`
without replacing the Wails `main.go` entry point.
Read credentials from local runtime configuration without committing them.

For PostgreSQL:

1. Open a pgx connection/pool.
2. Create a context with a short timeout and defer its cancellation.
3. Ping the database.
4. Execute `SELECT 1` and scan the result.
5. Print the result, handle errors, and close the pool.

For MongoDB:

1. Create an official driver client with the connection configuration.
2. Ping using a bounded context.
3. Find documents in a sample collection with a small limit.
4. Iterate the cursor, check its final error, and close it.
5. Display Extended JSON and disconnect cleanly.

Learn `go mod`, structs, methods, slices, errors, `defer`, and context as these
steps need them. Wrap errors with operation context, but keep credentials out of
error messages. Do not start with goroutines everywhere; driver calls and Wails
already involve concurrency that you can learn incrementally.

Done when both programs return expected data and invalid credentials produce
clear errors without hanging.

## 2. Add one desktop connection flow

Use the initialized Wails/React shell and existing fixture-based forms. Verify
the [development commands](development.md) on the chosen OS, then move working
database code into `internal/postgres` and `internal/mongo` as those slices land.

Start with two registered integration descriptors and an in-memory profile store.
Use concrete settings structs; keep credentials separate. The searchable catalog
chooses a trusted adapter form. The root pencil opens that profile by ID with
prefilled settings and blank passwords; Cancel changes nothing. Save validates
settings but does not connect, open a tab, or modify a session. Keep adapter kind
fixed when editing; rename updates labels, not identity.

Add Test, Connect, and Disconnect as distinct application operations. Have
`app.go` delegate to the database packages and return plain response types. Test
closes its temporary client; Connect captures settings/credentials and returns a
fresh session ID after ping. Show loading, success, and error states, prevent
duplicate submissions, and clean up failed attempts. Use the ID for subsequent
operations; never look up the current profile settings each time a query runs.

Done when either database can be tested/connected, a saved host edit does not
affect an active session, and disconnect releases its resources. Verify these in
Go even if the forms still use fixtures. Never expose secrets in logs/errors.

## 3. Finish PostgreSQL end to end

Use an inline text filter in each table's Data view, opened through its entity
menu. Row clicks only select/expand. Open free SQL from the database's
⋯ → New → Query Console action in a separate tab. Implement per-console
request/result identity so switching the explorer or opening another console
cannot change where SQL runs. Keep each console's draft and cancellation separate.
Use separate profile, session, tab, and request IDs. Begin with one PostgreSQL
database per session/pool; do not pretend one pool can switch databases.

Implement schema listing, table listing, and table details before adding SQL
editing. Show structure in a sidebar and details panel. Then add CodeMirror,
Run/Cancel actions, and a simple results table.

Use a sample table containing integers, text, NULL, timestamps, and exact numeric
values. Keep column order, duplicate column labels, and value types correct.
Include a clear empty-results state and output-truncation notice.

Implement the request registry once SQL execution needs cancellation. Register
before acknowledging start; remove the entry and release rows on every terminal
path. Test cancellation during execution and disconnect, including concurrent
cleanup, without holding a manager mutex across driver calls. Return captured
request/session identity so the frontend can update an inactive tab correctly.

The frontend already implements resource-tab reuse, fresh console tabs, and an
empty workspace with mocks. Connect these to real request contracts. Close/Close
all requests cancellation without disconnecting the
profile. Ignore output for a closed tab or superseded request; keep valid results
for inactive tabs. Retain only window drafts and clear console drafts on close.

Done when a user can connect, inspect a table, run SQL, inspect rows, and cancel
a deliberately slow query against a disposable database. Verify two independent
consoles and close-all during running requests through the bridge before marking
the full UI workflow done.

## 4. Finish MongoDB end to end

Add database and collection navigation. Build separate inputs for filter,
projection, sort, and limit; start with `{}` as the filter. Parse inputs in Go
using driver-supported BSON/Extended JSON facilities. Do not execute JavaScript.

Show a document list with expandable JSON. Test dates, ObjectIDs, arrays, nested
objects, empty collections, and inconsistent field types. Add bounded field
sampling for the structure panel.

Reuse session/request lifecycle helpers from PostgreSQL, not its SQL payloads.
Capture database and collection on every Find; parse ordered sort and enforce
document/byte bounds while iterating. Cover mixed fields and an empty sample.

For the requested database JSON console, first agree on an initial supported
command set and a separate ExecuteMongoCommand DTO with explicit database and
limits. Reject unsupported commands and JavaScript in Go. Reuse bounded adapter
operations when semantics match; do not expose unrestricted driver RunCommand.
Document its acceptance checks before implementation. If this capability is not
ready, keep its production menu visibly unavailable; the prototype is not evidence
of a working command console.

Done when a known filter returns expected documents, malformed input gets a
useful error, and cancellation works.

## 5. Add completion and saved profiles

Wire cached metadata into CodeMirror completion. Start with prefix matching and
basic ranking. Verify completions change when switching databases and refreshing
structure. Label MongoDB field suggestions as derived from sampled documents.

Save non-secret profiles in the OS config directory. Write updates atomically
and preserve the previous file if an update fails. Handle missing or malformed
configuration with a clear error rather than silently losing profiles.
Persist the same settings model already used by the in-memory store, rather than
serializing a driver config or frontend state. Include a file format version;
test credential omission, a failed write preserving the prior file, and edit
round-tripping. A restart restores profiles, not live sessions or query tabs.

Done when restarting preserves connection settings, requires credentials again,
and provides relevant completion suggestions after connecting.

## 6. Stabilize and package

Add integration tests alongside the database packages and focused unit tests for
value conversion, profile serialization, and sampled-field merging. Keep sample
data reproducible. Document how to start local test databases and seed them once
those scripts exist; the current UI setup does not provision database services.

Run the Go tests and race detector, then manually check navigation, query
cancellation, disconnects, large responses, and error states. Build for the
selected OS and test the packaged app outside the development runner.

Record actual setup commands, pinned versions, known limitations, and release
checks in the repository as they become verified. Do not mark planned commands
or features as working before executing them.

## A useful development rhythm

- Spend the first part of a session on one observable behavior.
- Keep SQL and MongoDB work out of React components.
- Prefer explicit code to a general framework while the design is still changing.
- Investigate errors instead of discarding them or adding arbitrary retries.
- Finish with a small verification and a commit describing the resulting behavior.

The first milestone is two reliable Go database experiments. A polished desktop
shell can wait until those connections and data conversions work.
