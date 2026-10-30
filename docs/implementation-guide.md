# Beginner implementation guide

Work in small steps: learn one concept, implement a usable behavior, verify it,
then commit it. The [release plan](release-0.0.1-plan.md) defines scope and dates;
the [architecture](architecture.md) explains component boundaries.

Your primary focus can stay on Go. Implement and test each backend capability
against the [handoff contract](frontend-handoff.md). Frontend work can be completed
separately using the [UI/UX guide](ui-ux-guide.md) and interactive wireframe.
Review backend completion and full desktop completion as separate milestones.

## 1. Connect from a Go program

Create a Go module and a temporary CLI entry point before adding a desktop UI.
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

Follow the supported Wails setup for the selected OS, then generate a React and
TypeScript application. Verify the generated starter runs before changing it.
Move working database code into `internal/postgres` and `internal/mongo`.

Build one form with connection kind, settings, Test, Connect, and Disconnect.
Have `app.go` delegate to the database packages and return plain response types.
Show loading, success, and error states, and prevent duplicate submissions.

Done when the UI can test either database connection without exposing secrets
in logs or error details.

## 3. Finish PostgreSQL end to end

Use an inline text filter in each table's Data view, opened through its entity
menu. Row clicks only select/expand. Open free SQL from the database's
⋯ → New → Query Console action in a separate tab. Implement per-console
request/result identity so switching the explorer or opening another console
cannot change where SQL runs. Keep each console's draft and cancellation separate.

Implement schema listing, table listing, and table details before adding SQL
editing. Show structure in a sidebar and details panel. Then add CodeMirror,
Run/Cancel actions, and a simple results table.

Use a sample table containing integers, text, NULL, timestamps, and exact numeric
values. Keep column order, duplicate column labels, and value types correct.
Include a clear empty-results state and output-truncation notice.

Done when a user can connect, inspect a table, run SQL, inspect rows, and cancel
a deliberately slow query against a disposable database.

## 4. Finish MongoDB end to end

Add database and collection navigation. Build separate inputs for filter,
projection, sort, and limit; start with `{}` as the filter. Parse inputs in Go
using driver-supported BSON/Extended JSON facilities. Do not execute JavaScript.

Show a document list with expandable JSON. Test dates, ObjectIDs, arrays, nested
objects, empty collections, and inconsistent field types. Add bounded field
sampling for the structure panel.

Done when a known filter returns expected documents, malformed input gets a
useful error, and cancellation works.

## 5. Add completion and saved profiles

Wire cached metadata into CodeMirror completion. Start with prefix matching and
basic ranking. Verify completions change when switching databases and refreshing
structure. Label MongoDB field suggestions as derived from sampled documents.

Save non-secret profiles in the OS config directory. Write updates atomically
and preserve the previous file if an update fails. Handle missing or malformed
configuration with a clear error rather than silently losing profiles.

Done when restarting preserves connection settings, requires credentials again,
and provides relevant completion suggestions after connecting.

## 6. Stabilize and package

Add integration tests alongside the database packages and focused unit tests for
value conversion, profile serialization, and sampled-field merging. Keep sample
data reproducible. Document how to start local test databases and seed them once
those scripts exist; this planning-only repository has no runnable setup yet.

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
