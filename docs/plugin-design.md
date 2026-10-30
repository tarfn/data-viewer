# Integration plugin design

## Scope and terminology

A plugin here means a database/tool integration, not a Codex plugin. In 0.0.1,
PostgreSQL and MongoDB will be built-in Go adapters compiled into the application.
Currently the initialized shell has a frontend catalog and mock workspaces only;
neither database driver nor an adapter implementation is present.
There is no plugin download, marketplace, runtime loading, or extension API yet.
This keeps the beginner implementation small while giving new integrations a
clear place to live.

## Separate shared lifecycle from capabilities

Each adapter has a stable kind (`postgres` or `mongo`), display name, and supported
capabilities. Keep descriptors separate from saved connection profiles. A profile
references its kind; it does not embed executable paths or arbitrary code.
See [the domain model](domain-model.md) for descriptor/profile/session separation
and [the architecture](architecture.md) for application ownership.

| Capability | PostgreSQL | MongoDB | Later integrations |
| --- | --- | --- | --- |
| Connect / disconnect / test | Yes | Yes | Kafka; HTTP may have stateless profiles |
| Browse resources | Schemas/tables | Databases/collections | Kafka topics |
| SQL query | Yes | No | Other SQL databases |
| Document Find | No | Yes | Other document databases if semantics fit |
| Native database command console | No | Gated on a supported-command contract | Per-adapter semantics; never JavaScript evaluation |
| Structure metadata | Declared schema | Sampled observations | Integration-specific |
| Completion candidates | SQL names/keywords | Operators/observed fields | Integration-specific |
| Stream messages | No | No | Kafka |
| Publish records | No | No | Kafka producer, separate from consumer |
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
    Category     string
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

Entity menus are a separate extensible action registry. An action describes its
ID, label, supported resource kinds/capabilities, disabled reason, handler, and
optional children (for example New → Query Console). The prototype supplies
trusted local handlers; this is not permission to execute manifest-provided JS.
Row clicks only navigate/select. Opening a tab or invoking an operation requires
an explicit menu action bound to the captured entity ID. Future index inspection
can add a capability/action without redesigning the explorer. The current planned
index item is disabled and makes no request.

Only show menus where registered actions apply. Connection roots, schemas, and
grouping folders currently have none. Databases offer console creation directly,
not a generic Open in Tab or overview page. Data resources offer Open in Tab.
Connection roots separately expose the direct Edit connection pencil. Its form
renderer comes from the profile's registered adapter and cannot switch adapters
during editing. Saving typed settings does not invoke the session factory or
any query capability. Future plugins must preserve this separation too.

## Catalog and connection setup UI

Add connection uses a searchable list of registered integration descriptors;
avoid a fixed card grid or a separate global button for every plugin. Adding a
descriptor should add a row without changing the picker layout. Each descriptor
needs a stable ID/kind, display name, category, search keywords/capabilities,
availability/compatibility state, an optional trusted icon key, and a configuration
renderer/schema reference. Unknown icon keys use a generic plug icon; never inject
SVG/HTML or fetch remote assets supplied by an untrusted manifest.
The backend remains authoritative about which integrations are available.

Categories are derived from descriptors. Search/filter within a bounded scroll
area, show no-results feedback, then open the chosen integration's setup step.
Use ordinary buttons with keyboard navigation; do not infer capability from a
plugin's display name. A metadata entry without a compatible renderer must show
an explanation rather than attempting to execute unknown configuration code.

The prototype has a local descriptor catalog, trusted built-in form templates,
and fixture tree references. It does not discover installed plugins or render
arbitrary downloaded HTML. Future configuration schemas should describe allowed
field types/validation and secret fields; a manifest is untrusted input, not
permission to inject scripts into the webview. External plugin installation and
trust remain separate, deferred workflows.

## Ownership and failure behavior

- Connection manager owns session creation, lookup, disconnect, and shutdown.
- Profile store owns non-secret settings and config revisions, independently of sessions.
- Adapters own driver calls, data conversion, metadata, and cursor cleanup.
- Application layer owns deadlines, request IDs, safe errors, and output caps.
- Frontend owns rendering and user intent, never raw driver objects.

Sessions capture profile settings at Connect; operations capture session/resource
identity at Run. Menu descriptors only request actions; they cannot mutate those
identities. Metadata caches and completion candidates belong to a session and
structured path, not an adapter name or globally selected explorer row.

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
it also needs an independent publish-record capability. A user may have consume
permission without produce permission, or the reverse; expose/validate each
action separately. HTTP should receive a request/response contract. None belongs
in `SQLQuerier`.

Their future UI workspaces are now illustrated in the prototype. Kafka resource
navigation is profile → Topics → topic; HTTP uses API profile → Requests → request.
HTTP profiles do not need a persistent connected Session simply to save a base
URL. Connection factories and lifecycle must be capability-specific rather than
forcing all tools into Ping/Close. Detailed future request contracts are in the
[handoff](frontend-handoff.md), with research in [UI decisions](ui-research.md).

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
