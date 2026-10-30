# Architecture and feature design

This is a proposed design, not an implemented API. Keep the first implementation
small and adjust contracts as actual database behavior becomes clear.
The [domain model](domain-model.md) defines the identities and state transitions
behind the latest UI; the [implementation guide](implementation-guide.md) turns
them into small backend-first steps.

## Stack

| Component | Choice | Purpose |
| --- | --- | --- |
| Backend | Go | Connections, database operations, lifecycle, persistence |
| Desktop bridge | Wails | Desktop window and Go/frontend bindings |
| Frontend | React + TypeScript | Connection forms, navigation, workspace |
| Editor | CodeMirror 6 | Editing, syntax highlighting, completion UI |
| PostgreSQL | pgx | Connection pooling, queries, PostgreSQL types |
| MongoDB | Official MongoDB Go driver | Connections, BSON, collection operations |
| Profile storage | JSON in OS application config directory | Non-secret connection settings |

Select supported versions and commit generated manifests/lockfiles during
implementation. Verify Wails prerequisites for the chosen desktop OS before
building the UI. No versions or dependencies are installed by this document.

## Component boundaries

```text
React interface
  Catalog/profile forms | Explorer selection | Independent tabs/results
                                |
                   Typed Wails DTOs and lifecycle events
                                |
               Thin Go application methods (app.go)
                                |
        Profile store | Session manager | Request registry
                         /                 \
                PostgreSQL adapter     MongoDB adapter
                       |                     |
                      pgx               MongoDB driver
```

Database connections and credentials stay in Go after submission from the
connection form. Expose serializable data transfer objects to the frontend,
not driver connections, cursors, or internal errors containing credentials.

Start with concrete database adapters. Share profile management, request IDs,
timeouts, cancellation, and error presentation. Keep SQL execution and MongoDB
Find as separate operations instead of forcing both into one query interface.

The frontend owns tab order, active tab, explorer selection/expansion, drafts,
and result rendering. Go owns authoritative profile validation, sessions,
capability checks, requests, cancellation, bounds, and typed conversion. A UI
menu's visibility never substitutes for backend validation.

Keep saved profiles separate from live sessions: Edit connection updates a
profile, while Connect captures a settings snapshot and returns a new session
ID. `connectionId` in operation DTOs means that session ID, not the profile ID.
Changing a saved database/host must not mutate existing sessions or tabs.

## Proposed layout

```text
data-viewer/
├── main.go
├── app.go                    # Thin Wails methods
├── internal/
│   ├── connection/            # Profile types and active connection lifecycle
│   ├── operation/             # Request registry, deadlines, cancellation (when needed)
│   ├── postgres/              # Metadata, SQL execution, value conversion
│   ├── mongo/                 # Collection browsing, Find, sampled fields
│   ├── integration/           # Small built-in descriptors/capabilities (when needed)
│   └── storage/               # Non-secret profile persistence
└── frontend/src/
    ├── components/
    ├── features/
    │   ├── connections/
    │   ├── explorer/
    │   ├── workspace/         # Tabs, captured targets, filters/consoles/results
    │   └── integrations/      # Trusted adapter forms/view registration
    └── types/
```

Add packages when needed. A dependency injection framework, generic repository
layer, or runtime plugin system is unnecessary for the first release. The
[plugin design](plugin-design.md) describes small built-in capability descriptors
and a deferred direction for external integrations.

Use the [frontend handoff](frontend-handoff.md) to build Go functionality
independently of the [UI/UX](ui-ux-guide.md). The developer's primary work is the
Go backend; a separate frontend implementation can start from mock contracts.
Initially keep session/request helpers beside the working connection code; split
the optional packages above once both adapters use them. Keep domain contracts
free of Wails/React imports; adapters must be testable without launching a window.

## UI intents and application behavior

| UI intent | Application behavior | Must not happen implicitly |
| --- | --- | --- |
| Add connection | Catalog selects a registered adapter; SaveProfile creates non-secret settings | Connect, query execution, or opening a tab |
| Root pencil → Save | Load/save by stable profile ID; return updated non-secret fields | Changing adapter type or retargeting a live session |
| Click/expand/search explorer | Frontend selection/expansion; bounded metadata fetch as needed | Opening/switching a tab or changing a query target |
| Table/collection ⋯ → Open in Tab | Create/activate resource tab bound to session and resource | Running free SQL/commands in a parent overview |
| Database ⋯ → New → Query Console | Create a fresh console ID bound to that database | Reusing another console's draft/request state |
| Apply filter / Run | Capture tab target and input; invoke the matching capability | Resolving destination from current tree selection |
| Close tab / Close all | Remove frontend tabs; cancel their operations and release payloads | Disconnecting all profiles or opening a replacement tab |

Connection roots have a direct pencil, with no action menu. Schemas/group folders
have no menus. Databases have console actions only; there are no parent overview
pages. The last tab can close into an empty workspace. Keep menu actions as local
descriptors with supported entity kinds/capabilities and captured target IDs.

## Application contracts

Wails-facing methods accept a connection ID and plain request values. Go creates
operation contexts internally; a Go context is not passed across the UI bridge.
Adapter methods receive that context and the selected connection/client.
Use distinct PreviewTable, ExecuteSQL, and FindDocuments contracts. See the
[handoff](frontend-handoff.md#proposed-wails-surface) for profile, metadata, and
request DTO responsibilities; do not introduce a generic `Execute(string)`.

Table/collection Data views expose scoped filter text fields. Free queries live
in independent database-bound console tabs created from New → Query Console.
Track console IDs separately from resource/database IDs: multiple consoles can
share a database without sharing drafts, results, cancellation, or request state.
MongoDB console design uses a separate native command-JSON capability, not a
JavaScript interpreter. See the handoff for filter/command contract requirements.
The HTML mock does not authorize MongoDB commands. Before enabling that menu in
production, implement its separate supported-command policy and bounded result
contract; until then display an explicit unavailable reason.

Illustrative adapter operations:

```text
PostgreSQL
  ListSchemas(ctx)
  ListTables(ctx, schema)
  DescribeTable(ctx, schema, table)
  Query(ctx, sql, resultOptions)

MongoDB
  ListDatabases(ctx)
  ListCollections(ctx, database)
  SampleFields(ctx, database, collection, sampleLimit)
  Find(ctx, findRequest)
```

A query result should contain ordered column metadata, rows, elapsed time, and
whether output was truncated. Preserve duplicate SQL column names using ordered
cells rather than a map keyed by column name. Return affected-row information
where applicable; initially support one SQL statement per execution and explain
that limitation in the UI.

A MongoDB Find request specifies database, collection, filter, projection, sort,
and a bounded limit. Represent sort as ordered fields. Parse user input in Go
and return validation errors before sending an invalid operation to MongoDB.
Use BSON/Extended JSON so ObjectIDs and dates retain their meaning.

## Connection and request lifecycle

1. Validate a profile and connect using the driver's normal TLS settings.
2. Ping with a timeout before marking the connection active.
3. Reuse a pool/client per active connection; do not reconnect for every click.
4. Assign each operation a request ID and a cancellable context with a timeout.
5. Expose a Cancel operation that cancels the matching active request.
6. Remove cancellation entries and close rows/cursors on every completion path.
7. Cancel outstanding requests on disconnect and close clients on app shutdown.

Synchronize shared maps if methods access them concurrently. Route completion by
originating tab ID, latest request ID, and captured session/target. Inactive
database tabs still receive their own results; explorer selection and active-tab
changes do not invalidate them. Closing a tab/disconnecting its session prevents
late output from restoring it. Do not hold a global mutex across slow network
operations. Start acknowledgement, cancellation races, and cleanup are specified
in the [request lifecycle](domain-model.md#operations-and-results).

The PostgreSQL pool is bound to one database. Start by browsing the configured
database and its schemas. Another database requires an explicit additional
database session/pool; never reuse a pool by changing a UI label. One MongoDB
client can serve authorized databases, but every request still captures its
database. Disconnect invalidates that session's metadata and disables execution
in its existing tabs; reconnect gets a new session ID without rebinding them.

## Results and responsiveness

Begin with a 100-row/document preview and a configurable hard output cap. Bound
both row count and serialized output size: a single document can be large.
Use cursor iteration/batches and stop reading once the cap is reached, then
close the cursor. Tell users when output is truncated.

A display cap does not cap database computation. Apply timeouts and cancellation
too. Do not append `LIMIT` blindly to arbitrary SQL. The table-preview operation
can construct its own bounded SELECT with safely quoted identifiers; user SQL
execution follows the explicit SQL execution contract.

Convert database values deliberately at the Go/frontend boundary. Keep SQL NULL
distinct from an empty string. Encode large integers or exact decimals without
JavaScript precision loss, and retain type information for display. Use Extended
JSON for MongoDB values and test nested structures.

## Explorer and autocomplete

PostgreSQL structure includes schemas, tables, ordered columns, types,
nullability, defaults, and primary/foreign keys. Metadata queries must respect
the connected user's permissions. Never interpolate untrusted identifiers
directly into SQL; use supported identifier quoting and parameterized values.

MongoDB has no uniform collection schema. Sample at most 100 documents initially
and show observed field paths and types under a **Sampled fields** label. Empty
collections provide no inferred fields. Different types for the same path should
remain visible. Sampling does not guarantee every field has been discovered.

Cache metadata per session and structured database/schema/resource path. Add explicit
Refresh, invalidate on disconnect, and surface metadata fetch errors.
Store branch loading/error state separately from tab state. Resource search
filters loaded nodes and retains ancestors; it is not server-wide discovery.

Completion version 1 supplies CodeMirror with SQL keywords and cached schema,
table, and column names. MongoDB completion supplies operators and sampled
fields. Network requests should not run on every keystroke. SQL alias resolution,
scope-aware completion, and full parsing are deferred.

## Profiles and credentials

Use `os.UserConfigDir` for profile storage. Store names, database kind, host,
port, database, username, and non-secret TLS preferences. Prompt for passwords
again when reconnecting. A MongoDB URI may contain credentials: never persist
the raw URI, log it, or return it in an error. Separate credentials from saved
connection settings using supported URI parsing.

SaveProfile and Test/Connect are separate operations. Edit forms prefill only
non-secret settings; Cancel discards the local draft. Save atomically updates the
profile, leaving active sessions unchanged. Increment the config revision only
when connection settings change; renaming only changes labels. Capture settings
at Connect; mark changed settings as applying on the next connection. A successful
save does not prove connectivity.

Window drafts/results are frontend state, not profile data. Do not persist query
text, raw credential-bearing URIs, password/token fields, or HTTP headers in the
profile store. Console drafts disappear on close; resource drafts may remain in
window memory for that same session. History/session restoration stays deferred.

Avoid credentials in query history, diagnostics, screenshots, and logs. Keep
TLS verification enabled. Develop with disposable sample data and read-only
database accounts; hiding write actions in the UI does not make arbitrary SQL
read-only.
