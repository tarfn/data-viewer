# Architecture and feature design

This is a proposed design, not an implemented API. Keep the first implementation
small and adjust contracts as actual database behavior becomes clear.

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
  Connection sidebar | Structure explorer | Query/Find workspace | Results
                                |
                         Wails bindings
                                |
                    Thin Go application methods
                                |
        Connection lifecycle | Request lifecycle | Profile storage
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

## Proposed layout

```text
data-viewer/
├── main.go
├── app.go                    # Thin Wails methods
├── internal/
│   ├── connection/            # Profile types and active connection lifecycle
│   ├── postgres/              # Metadata, SQL execution, value conversion
│   ├── mongo/                 # Collection browsing, Find, sampled fields
│   └── storage/               # Non-secret profile persistence
└── frontend/src/
    ├── components/
    ├── features/
    │   ├── connections/
    │   ├── explorer/
    │   └── workspace/
    └── types/
```

Add packages when needed. A dependency injection framework, generic repository
layer, or plugin system is unnecessary for the first release.

## Application contracts

Wails-facing methods accept a connection ID and plain request values. Go creates
operation contexts internally; a Go context is not passed across the UI bridge.
Adapter methods receive that context and the selected connection/client.

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

Synchronize shared maps if methods access them concurrently. Use request IDs to
ignore stale UI responses after selection changes. Do not hold a global mutex
across slow network operations.

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

Cache metadata per active connection and selected database/schema. Add explicit
Refresh, invalidate on disconnect, and surface metadata fetch errors.

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

Avoid credentials in query history, diagnostics, screenshots, and logs. Keep
TLS verification enabled. Develop with disposable sample data and read-only
database accounts; hiding write actions in the UI does not make arbitrary SQL
read-only.
