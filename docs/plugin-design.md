# Integration plugin design

## Scope and terminology

A plugin here means a database/tool integration, not a Codex plugin. In 0.0.1,
PostgreSQL and MongoDB are built-in Go adapters compiled into the application.
There is no plugin download, marketplace, runtime loading, or extension API yet.
This keeps the beginner implementation small while giving new integrations a
clear place to live.

## Separate shared lifecycle from capabilities

Each adapter has a stable kind (`postgres` or `mongo`), display name, and supported
capabilities. Keep descriptors separate from saved connection profiles. A profile
references its kind; it does not embed executable paths or arbitrary code.

| Capability | PostgreSQL | MongoDB | Later integrations |
| --- | --- | --- | --- |
| Connect / disconnect / test | Yes | Yes | Kafka; HTTP may have stateless profiles |
| Browse resources | Schemas/tables | Databases/collections | Kafka topics |
| SQL query | Yes | No | Other SQL databases |
| Document Find | No | Yes | Other document databases if semantics fit |
| Structure metadata | Declared schema | Sampled observations | Integration-specific |
| Completion candidates | SQL names/keywords | Operators/observed fields | Integration-specific |
| Stream messages | No | No | Kafka |
| Send HTTP request | No | No | HTTP |

Do not build one `Execute(string) -> table` abstraction for all tools. A stream,
a SQL result, a document list, and an HTTP response have different lifecycles.

## Minimal Go shape

Illustrative design only; types should be defined alongside the first working
adapter. Use concrete implementations until an interface has an actual consumer.

```go
type Descriptor struct {
    Kind         string
    DisplayName  string
    Capabilities []string
}

type Session interface {
    Ping(ctx context.Context) error
    Close(ctx context.Context) error
}

type SQLQuerier interface {
    Query(ctx context.Context, req SQLRequest) (SQLResult, error)
}

type DocumentFinder interface {
    Find(ctx context.Context, req FindRequest) (FindResult, error)
}
```

These sketches omit imports and request definitions. Wrap driver-specific close
signatures inside adapters. A small built-in registry can map kind to factory and
descriptor; explicit registration at startup is enough. Do not use init-time
global mutation, reflection, Go's native `plugin` package, or a generic method
router just to support two integrations.

The application validates requested capabilities on the backend as well as
hiding unsupported actions in the frontend. An unknown kind or capability returns
a typed unsupported-operation error.

## Ownership and failure behavior

- Connection manager owns session creation, lookup, disconnect, and shutdown.
- Adapters own driver calls, data conversion, metadata, and cursor cleanup.
- Application layer owns deadlines, request IDs, safe errors, and output caps.
- Frontend owns rendering and user intent, never raw driver objects.

Cancellation propagates through every adapter operation. Failed connection
attempts clean up partial clients. Disconnect prevents new operations, cancels
existing ones, and waits for cleanup without holding a global lock during I/O.
One failed session should not disconnect unrelated sessions.

Give adapters only the configuration they need. Keep credentials in runtime
memory and out of descriptors, profile files, completion responses, and logs.
Validate result serialization at the application boundary even for trusted
built-ins. Database authorization remains the final authority on allowed actions.

## Adding a built-in integration later

1. Specify its actual user workflow and capability/result types.
2. Add the Go adapter and descriptor with explicit registration.
3. Implement relevant lifecycle and real-service integration tests.
4. Add a frontend workspace for capabilities not already supported.
5. Update the feature matrix, profile validation, and compatibility documentation.

Kafka should receive a stream capability with explicit stop/backpressure behavior;
HTTP should receive a request/response contract. Neither belongs in `SQLQuerier`.

## External plugins: design direction, deferred

If user-installed plugins become necessary, evaluate separate executable
processes using a versioned JSON-RPC or gRPC protocol. A future manifest could
declare ID, version, protocol version, platforms, entrypoint, and capabilities.
Treat manifests and returned data as untrusted input.

Before shipping, define handshake compatibility, message size limits, request
cancellation, process crash recovery, upgrade/removal, verified distribution,
credential delivery, and executable trust. A subprocess is **not** automatically
a sandbox: filesystem/network restrictions need an explicit OS-level design.
Do not claim these protections exist in release 0.0.1.
