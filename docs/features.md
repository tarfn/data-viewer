# Feature inventory

All production entries below are planned; none is currently implemented. The
documentation prototype illustrates some interactions using fictional data.
IDs let backend
work, frontend work, tests, and PRs refer to the same behavior. Required means
needed for release 0.0.1; stretch means cut it before moving the release date.

| ID | Feature | Priority | Go/backend responsibility | Frontend responsibility | Acceptance check |
| --- | --- | --- | --- | --- | --- |
| CON-01 | Test and open PostgreSQL/MongoDB connections | Required | Validate config, TLS, ping, return connection ID | Forms, loading/errors, active connection label | Valid config connects; invalid config explains failure without leaking credentials |
| CON-02 | Disconnect and shutdown | Required | Cancel operations and close pools/clients | Disable actions and clear stale active state | Disconnect during a request does not leave it running or render its late result |
| CON-03 | Saved profiles | Required | Store only non-secret fields in OS config directory | List, rename, edit, remove profiles; credential prompt | Restart restores settings without restoring passwords or raw credential URIs |
| PG-01 | Structure browser | Required | Return schemas, tables, columns, keys | Expandable tree and structure panel | Known sample table shows ordered columns and primary/foreign keys |
| PG-02 | Table preview | Required | Build safely quoted, bounded SELECT | Open Data view with active database/table | Preview returns at most the configured cap and labels truncation |
| PG-03 | SQL execution | Required | Execute one statement; ordered typed results | SQL editor, Run, grid, empty/error states | SELECT preserves duplicate column labels, NULL, and large integers |
| MG-01 | Database/collection explorer | Required | List permitted databases and collections | Tree navigation | Authorized collections appear; permission errors remain visible |
| MG-02 | Find operation | Required | Parse filter/projection/sort, bound limit, iterate cursor | Find form and expandable document viewer | Known filter returns expected documents; invalid input points to the input |
| MG-03 | Sampled fields | Required | Sample up to 100 documents; merge observed paths/types | Label sample size and uncertainty | Mixed field types are visible; empty collections infer no fields |
| EDT-01 | Basic autocomplete | Required | Cache metadata; provide typed completion candidates | CodeMirror completion menus and keyboard behavior | Suggestions follow active connection and refresh after metadata changes |
| RUN-01 | Timeout and cancellation | Required | Context deadline, request registry, cancellation, cleanup | Running/Cancel states, elapsed time | Slow operation cancels; subsequent execution still works |
| RUN-02 | Bounded typed results | Required | Enforce row/document and byte caps; safe serialization | Type display, truncation notice, responsive result view | Large responses stop within limits without silent numeric precision loss |
| UX-01 | Accessible workspace states and explorer tree | Required | Structured safe errors; metadata scoped to parent identity | Independently expandable connection/database/schema tree, nested resources, keyboard navigation, loading/empty/error states | Each table/collection stays beneath its database; expanding a branch never retargets execution; main workflow works with keyboard |
| REL-01 | Installable desktop build | Required | Lifecycle cleanup and chosen-OS build | Verify packaged rendering/bindings | Install outside dev runner and complete both database workflows |
| WS-01 | Multiple editor tabs | Stretch | Independent request IDs and connection bindings | Tabs, unsaved draft handling | Changing tabs never retargets a running request |
| WS-02 | Persistent history | Stretch | Define opt-in storage/redaction policy | Search/reopen/delete history | Sensitive query text is not persisted by default |
| UX-02 | Theme switching and layout persistence | Stretch | Persist non-secret preferences if needed | Light/dark theme, saved splitter sizes | Restart restores preferences |
| EXT-01 | Built-in adapter capabilities | Required, small | Capability descriptors for PostgreSQL and MongoDB | Show only supported actions | MongoDB does not show a SQL action |
| EXT-02 | External installable plugins | Future | Versioned protocol, process lifecycle, trust model | Installation, permission and compatibility UX | No release 0.0.1 commitment |
| UI-CON-01 | Searchable integration picker and setup | Required production UX; prototyped | Registered descriptors, compatibility metadata, type-specific config/session lifecycle | Searchable scrollable list, category filter, configuration step; separate Save/Test/Connect meaning | Catalog can grow without a fixed card grid; search/keyboard selection works; saved settings do not imply connectivity |
| UI-NAV-01 | Resource search and breadcrumbs | UI improvement; prototyped | Full resource identities and loaded metadata | Filter nested tree with ancestors, restore expansion, show active path | Hidden results are skipped by keyboard navigation; search/expansion never retargets execution |
| UI-DRAFT-01 | Per-resource window drafts | UI improvement; prototyped | No additional backend required for in-memory drafts | Restore each resource's inputs/views; exclude explicit credential fields and HTTP headers | Switching resources preserves their own draft without auto-executing; reload clears drafts |
| UI-DATA-01 | Result detail drawer | UI improvement; prototyped | Typed values and captured result source | Full-value/type inspection, explicit copy, Kafka copy-to-publish draft | NULL and Extended JSON retain meaning; draft changes never relabel a completed HTTP result |
| UI-LAYOUT-01 | Resizable workspace | UI improvement; prototyped | No additional backend required | Pointer/keyboard sidebar resizing and native vertical editor resizing | Bounds enforced; narrow layout keeps navigation available; no layout persistence assumed |
| KF-01 | Kafka setup and topic browser | Future; UI prototyped | Broker metadata, TLS/SASL, resource identity | Kafka form and cluster/Topics/topic tree | Expand topic under the right profile; error for inaccessible advertised brokers |
| KF-02 | Bounded Kafka inspection | Future; UI prototyped | Partition assignment, seek, cancellation, byte/record/time limits | Start position, Consume/Stop, message list and details | Offset applies to one partition; inspection never commits consumer group offsets |
| KF-03 | Kafka publish (producer) | Future; UI prototyped | Encoding, key/ordered headers, partition routing, broker acknowledgement | First-class Publish beside Consume; JSON/Text editor, validation, receipt/cancel states | Explicit publish captures target; malformed JSON/headers rejected; receipt includes topic/partition/offset; uncertain real delivery is explicit |
| HTTP-01 | API profile and request builder | Future; UI prototyped | URL composition, auth, headers/body, TLS and redirect policy | Method, effective URL, Params/Headers/Auth/Body | API profiles never imply a persistent database-style connection |
| HTTP-02 | Response inspection | Future; UI prototyped | Bounded body, cancellation, transport/status distinction | Body/Headers, status/timing/size, canceled/error states | HTTP 4xx/5xx is distinguishable from a transport error |

The initial UI presents data browsing without inline editing. User SQL can still
write if the database account permits it; do not label the application universally
read-only. Prefer read-only sample credentials during development.

See [UX](ui-ux-guide.md), [backend/frontend handoff](frontend-handoff.md), and
[plugin design](plugin-design.md) for implementation boundaries.
