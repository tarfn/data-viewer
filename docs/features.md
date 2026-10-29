# Feature inventory

All entries below are planned; none is currently implemented. IDs let backend
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
| UX-01 | Accessible workspace states | Required | Structured safe errors and authoritative operation state | Keyboard access, focus, loading/empty/error/disconnected states | Main workflow works with keyboard and identifies its target connection |
| REL-01 | Installable desktop build | Required | Lifecycle cleanup and chosen-OS build | Verify packaged rendering/bindings | Install outside dev runner and complete both database workflows |
| WS-01 | Multiple editor tabs | Stretch | Independent request IDs and connection bindings | Tabs, unsaved draft handling | Changing tabs never retargets a running request |
| WS-02 | Persistent history | Stretch | Define opt-in storage/redaction policy | Search/reopen/delete history | Sensitive query text is not persisted by default |
| UX-02 | Theme switching and layout persistence | Stretch | Persist non-secret preferences if needed | Light/dark theme, saved splitter sizes | Restart restores preferences |
| EXT-01 | Built-in adapter capabilities | Required, small | Capability descriptors for PostgreSQL and MongoDB | Show only supported actions | MongoDB does not show a SQL action |
| EXT-02 | External installable plugins | Future | Versioned protocol, process lifecycle, trust model | Installation, permission and compatibility UX | No release 0.0.1 commitment |
| NEXT-01 | Kafka and HTTP | Future | Separate stream/request capabilities | Topic/message and HTTP request workspaces | No release 0.0.1 commitment |

The initial UI presents data browsing without inline editing. User SQL can still
write if the database account permits it; do not label the application universally
read-only. Prefer read-only sample credentials during development.

See [UX](ui-ux-guide.md), [backend/frontend handoff](frontend-handoff.md), and
[plugin design](plugin-design.md) for implementation boundaries.
