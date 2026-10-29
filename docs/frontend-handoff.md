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

## Proposed Wails surface

| Operation | Inputs | Result |
| --- | --- | --- |
| ListAdapters | None | Kinds, names, capability IDs |
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
