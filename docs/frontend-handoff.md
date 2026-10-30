# Backend/frontend handoff

## Working independently

The developer owns Go database behavior. A separate frontend implementation can
use the [UX guide](ui-ux-guide.md) and mock responses while the Go developer builds
adapters and integration tests. These are proposed contracts, not existing APIs.

| Go/backend owns | Frontend owns | Agree together |
| --- | --- | --- |
| Drivers, pools, TLS, credentials in session memory | Forms, editor, explorer, results | Request/response names and fields |
| Input validation, metadata, execution | Interaction states and keyboard access | Error codes and recovery actions |
| Deadlines, cancellation, output caps | Run/Cancel interaction and stale-result suppression | Request IDs and connection identity |
| Typed serialization and non-secret profiles | Value formatting and non-secret UI preferences | Supported type encoding and capability IDs |

Frontend validation improves feedback; Go validation remains authoritative. Go
does not accept SQL/Find operations through one ambiguous string method.

The prototype's explorer search filters already loaded resources and retains
their ancestors. It does not imply that Go can search metadata that has not been
loaded. The frontend owns search/expansion, window-only per-resource drafts, and
layout dimensions; any later server-wide discovery needs an explicit backend
contract. Scope draft keys by full connection/resource identity, not display name.
Do not retain password/token inputs or raw HTTP header text in draft snapshots.
Do not implicitly persist arbitrary editor content or automatically run restored
drafts. Draft restoration and request/result lifecycle are separate state.

Result inspection uses the original typed payload and source identity; never
coerce a large integer just to display it. HTTP result metadata must capture the
submitted method/URL instead of resolving the current edited draft. Kafka
copy-to-publish fills a draft only and must never call the producer automatically.

## Proposed Wails surface

Resource browsing uses text filters; database New → Query Console creates a new
console ID with captured connection/database identity. Several consoles may target
one database. A table-preview/filter operation needs structured resource identity
and a documented expression contract. Quote identifiers safely; arbitrary WHERE
text does not become safe through value parameterization. Define supported syntax,
single-expression handling, permissions, limits, and timeouts in Go. Collection
filters remain parsed document objects passed to FindDocuments.

Explorer row selection/expansion must not open tabs or mutate the active execution
context. Data entities expose Open in Tab; databases expose New → Query Console
directly, without a database overview tab. Connection roots, schemas, and grouping
folders have no action menus. Keep menu
context captured by entity ID, independent of whichever tab is active. Adding a
profile only adds explorer nodes. Use extensible action descriptors with supported
entity kinds/capabilities, disabled reasons, and handlers. Backend authorization
still applies; disabled planned index actions do not call a backend operation.

Connection roots instead expose a direct Edit connection pencil. Load settings
by stable profile ID into the registered adapter's form; keep adapter ID fixed
during edits. Cancel must not mutate the profile. SaveProfile updates non-secret
configuration, not the active session or any tab's captured execution identity.
Renaming changes display labels only. Reconnect/new-session behavior requires a
separate explicit lifecycle action. In the prototype, edits are window-only and
do not reconnect or rebuild sample resources. Passwords reopen blank; retained
MongoDB URIs omit credentials and unsupported query options. The demo's URI
allowlist is not a production credential-redaction/validation contract; implement
that in Go with appropriate parsing and tests before persisting real profiles.

PostgreSQL consoles call ExecuteSQL. MongoDB command-JSON consoles need a distinct
ExecuteMongoCommand contract with an explicit supported/authorized command set;
never evaluate JavaScript. The current prototype validates object-shaped JSON and
returns fixed samples only; it implements no database authorization or commands.

Each tab owns draft, result snapshot, request ID, running/canceled/error state,
and close cleanup. Route completion to its originating tab, even while inactive.
Cancel targets only that tab's operation; closing a running console prevents late
output from recreating it. This prototype discards closed console drafts/results
and allows the last/all tabs to close into an empty workspace. Cancel outstanding
operations and prevent late results from recreating closed tabs. Define an
unsaved-work policy before real
session persistence. Kafka/HTTP still cancel on navigation in this prototype.

| Operation | Inputs | Result |
| --- | --- | --- |
| ListAdapters | None | Stable IDs/kinds, names, categories, keywords/capability IDs, compatibility/availability, config renderer/schema references |
| ListProfiles / SaveProfile / DeleteProfile | Non-secret profile fields or profile ID | Non-secret profiles |
| TestConnection | Runtime connection config and credentials | Success or safe structured error; no retained session |
| Connect | Runtime config and credentials | Connection ID, kind, display target, capabilities |
| Disconnect | Connection ID | Completed lifecycle cleanup or safe error |
| ListResources / DescribeResource | Connection ID and typed resource path | Resource tree or schema/sampled metadata |
| ExecuteSQL | Connection ID, request ID, SQL, execution options | SQL result or safe error |
| FindDocuments | Connection ID, request ID, Find inputs/options | Extended JSON documents or safe error |
| GetCompletions | Connection ID, resource path, language | Cached metadata candidates |
| RefreshMetadata | Connection ID and resource path | Refreshed metadata |
| CancelRequest | Connection ID and request ID | Cancellation requested, or already finished/unknown |

Operation names are illustrative. Prefer explicit methods over untyped generic
dispatch. Give resource paths separate database, schema, and table/collection
fields rather than splitting a display label on dots.

Explorer nodes are nested under their owning connection/database, as specified
in the [UX hierarchy](ui-ux-guide.md). Fetch children on first branch expansion
using the full parent path; cache and track loading/error/expanded state per
node. Expanding/collapsing a branch is navigation, not a request to retarget the
active execution workspace. Only selecting a resource changes that target.

Completion candidates should include label, insertion text, kind, and detail.
Frontend filters cached candidates per keystroke. Metadata responses include a
revision so refreshes can replace old candidates deterministically.

## Request identity and cancellation

The UI creates a unique request ID **before** invoking ExecuteSQL/FindDocuments
and passes it with the captured connection and resource. The backend registers
that ID and its cancel function before starting driver work, rejecting duplicate
active IDs. Use a small separate start acknowledgement or a request-started event
so Cancel becomes enabled only after registration; this avoids a cancel-before-
registration race. Do not persist request IDs or credentials.

Go applies a timeout to each context and sends a terminal result for success,
failure, cancellation, or timeout. Cancel's acknowledgement does not mean cleanup
is finished; the terminal result does. Ignore late responses using the request ID
and a workspace selection generation, especially after navigation/disconnect.
Never resolve the destination from the sidebar's current selection after Run.

Set a default timeout (initial proposal: 30 seconds), preview limit (100), and
hard row/document and byte maxima in Go. The UI displays effective values;
requests outside allowed ranges receive validation errors.

## Serialization example

Use ordered column metadata and positional typed cells for SQL. The following
proposed payload preserves an integer larger than JavaScript's safe range:

```json
{
  "requestId": "req-001",
  "connectionId": "conn-001",
  "status": "succeeded",
  "columns": [
    { "name": "id", "databaseType": "int8" },
    { "name": "note", "databaseType": "text" }
  ],
  "rows": [
    [
      { "kind": "integer", "text": "9007199254740993" },
      { "kind": "null" }
    ]
  ],
  "returnedCount": 1,
  "elapsedMs": 18,
  "truncated": false,
  "truncationReason": null
}
```

Every row has one cell per column in order, even if names repeat. Define an
exhaustive tagged cell union during implementation: null, text, boolean, integer,
decimal, float (including non-finite handling), timestamp, bytes, and structured
values. Encode integers/decimals as strings, not lossy JSON numbers. Document
formatting for timestamps, binary values, and unsupported driver types.

MongoDB returns each document as an Extended JSON string so JSON parsing in the
UI does not accidentally round BSON numeric values. Parse/render tagged values
deliberately; show a distinct ObjectID/date representation. Choose and document
canonical Extended JSON serialization during implementation. Result envelopes
share IDs, status, timing, count, and truncation fields but not SQL columns/rows.

## Error contract

Return a frontend-safe code, message, optional field, request ID, and retry hint.
Initial codes: `INVALID_INPUT`, `AUTH_FAILED`, `PERMISSION_DENIED`,
`CONNECTION_FAILED`, `CONNECTION_CLOSED`, `TIMED_OUT`, `CANCELED`,
`UNSUPPORTED_OPERATION`, and `INTERNAL`. Do not return raw credential-bearing
driver errors or stack traces. Preserve sanitized diagnostic context in Go.

Distinguish failure codes from success and truncation. A failed metadata refresh
must not silently replace valid cached metadata with an empty schema. Do not
promise automatic retries of user SQL: its side effects may already have happened.

## Implementation sequence

1. Agree on Go DTOs for one vertical slice; generate Wails bindings.
2. Add matching frontend fixtures for success, empty, failure, canceled, timeout,
   and truncation states. Fixtures contain only fictional sample data.
3. Test the adapter against a local database and verify response serialization.
4. Frontend implements the same fixture contract, then replaces mocks with the
   generated bridge. Do not maintain a second handwritten API type system if
   the binding generator already supplies the types.
5. Exercise the real bridge and packaged app before marking the feature complete.

Backend completion and end-to-end completion are separate milestones. The Go
developer can finish and review backend work without pretending the UI is done.

## Future Kafka and HTTP contracts (design only)

The prototype now explores these capabilities; neither is a 0.0.1 backend
requirement. Keep them separate from ExecuteSQL and FindDocuments.

The integration picker renders ListAdapters metadata as a searchable, filtered,
scrollable list. Selection opens a separate configuration step; the frontend must
not assume exactly four plugin types. The prototype supplies trusted built-in
renderers and mock descriptors, not a runtime plugin installer.

| Capability | Proposed inputs | Lifecycle / result requirements |
| --- | --- | --- |
| Kafka topic metadata | Connection ID, topic | Partitions, earliest/latest positions, permitted metadata; no group mutation |
| Start topic inspection | Connection/request IDs, topic, partitions, start mode, optional per-partition offsets, record/byte/duration caps | Start acknowledgement, bounded batches, terminal stopped/timeout/error/cap outcome |
| Stop inspection | Connection/request IDs | Cancel polling and release consumer; no offset commits |
| Produce message | Connection/request IDs, topic, optional partition/key/headers, payload/encoding | Broker acknowledgement or explicit uncertain-delivery outcome; no blind retry |
| Send HTTP request | Profile/request IDs, explicit effective URL/method, ordered duplicate-capable params/headers, auth reference, typed body, timeout/byte cap | Response status/headers/body metadata or transport/canceled/timeout error |

Kafka offsets must cross JSON as strings to preserve 64-bit precision; carry
partition and topic with every message. Future streaming needs bounded queues,
backpressure, dropped-count policy, and a request-bound event channel, not an
unbounded array returned only at the end. Do not auto-join existing consumer
groups for inspection. Review the chosen Go client's actual partition/seek
semantics rather than copying another language's API mechanically.

Consume and publish are independent capabilities and peer workspace actions.
Preserve ordered duplicate headers (an array, not a map) and binary-safe key/value
encoding in the real transport. Capture the cluster/topic and content snapshot
before sending; an acknowledgement carries the actual topic, partition, and
string-encoded offset. Cancellation or missing acknowledgement after a send can
mean uncertain delivery, not a guaranteed rollback. The prototype's cancel only
cancels a local timer, and its partition/offset receipt is fictional.

HTTP profile creation does not establish a connected session. Resolve URL/auth
before sending, retain secret values only in the session, never echo credentials
in results, and specify redirect policy for sensitive headers. Preserve HTTP
4xx/5xx as received responses, distinct from transport errors. Bound body reads
and close bodies. Cancellation does not imply the server rolled back a mutation.

See [the UI research](ui-research.md) for primary-source evidence, UI states,
and design proposals that remain unimplemented.
