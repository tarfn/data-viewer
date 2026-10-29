# Release 0.0.1 plan

## Goal and assumptions

Build an installed desktop application that connects to PostgreSQL and MongoDB,
helps users inspect their data, and provides a practical way to improve Go skills.
Target completion: **December 31, 2026**.

This plan starts October 29, 2026 and assumes about 8–12 hours per week, with
additional time potentially needed to learn the frontend. It is a target, not a
delivery guarantee. Complete one working vertical slice at a time.

Choose the developer's own operating system as the first packaging target.
Cross-platform installers can follow once the first target works.

## Release scope

| Capability | PostgreSQL | MongoDB |
| --- | --- | --- |
| Connect and disconnect | Host, port, database, user, password, TLS | Connection URI and database |
| Test connection | Ping with timeout | Ping with timeout |
| Browse structure | Schemas, tables, columns, primary/foreign keys | Databases, collections, sampled fields |
| Read data | SQL editor and results grid | Find form, document list, JSON viewer |
| Query controls | Run, cancel, timeout, bounded result preview | Filter, projection, sort, limit, cancel, timeout |
| Autocomplete | Keywords, schemas, tables, columns | Operators and sampled field names |
| Profiles | Save non-secret settings; prompt for password | Save non-secret settings; prompt for credentials |

Errors and loading states are required. Multiple query tabs and persistent
history are stretch goals and should be cut first if the schedule slips.

### Explicitly deferred

- Kafka, HTTP, and additional database integrations.
- Record editing, imports, exports, migrations, and database administration.
- Arbitrary `mongosh` scripts or JavaScript execution.
- Advanced SQL parsing, alias-aware completion, and a language server.
- SSH tunnels, cloud-specific login flows, and third-party plugins.
- OS keychain integration and credential persistence.
- Polished installers for every operating system.

## Weekly milestones

| Dates (2026) | Deliverable | Go learning focus | Demonstration |
| --- | --- | --- | --- |
| Oct 29–Nov 4 | Small PostgreSQL and MongoDB CLI experiments | Modules, structs, methods, errors, context | Print SQL rows and MongoDB documents; exit cleanly |
| Nov 5–11 | Wails shell and connection form | Packages, lifecycle, frontend bindings | Connect from the UI; explain failed connection attempts |
| Nov 12–18 | PostgreSQL structure explorer | pgx, metadata queries, scanning | Expand schemas and tables; inspect columns and keys |
| Nov 19–25 | SQL editor and result grid | Dynamic values, cleanup, cancellation | Execute SQL; cancel a slow query; show empty results |
| Nov 26–Dec 2 | MongoDB explorer and Find form | BSON, Extended JSON, cursors | Browse collections; filter, project, and sort documents |
| Dec 3–9 | Basic autocomplete | Metadata caching and data contracts | Suggest SQL names and MongoDB operators/observed fields |
| Dec 10–16 | Saved non-secret profiles; optional tabs/history | File handling and lifecycle management | Restart and reconnect from a profile without saving credentials |
| Dec 17–23 | Integration tests and reliability fixes | Testing, race detection, errors | Handle invalid credentials, timeouts, disconnects, cancellation |
| Dec 24–31 | Packaging, documentation, bug fixes | Desktop builds and release workflow | Install on the chosen OS and complete the end-to-end workflow |

Reserve the last week for stabilization. If behind, drop optional tabs/history
and visual polish before dropping either database's basic workflow.

## Definition of done

- [ ] Install and launch the app on the selected desktop OS.
- [ ] Connect to and disconnect from both local sample databases.
- [ ] Reuse a saved profile after restarting, with credentials entered again.
- [ ] Inspect PostgreSQL schemas, tables, columns, and keys.
- [ ] Browse MongoDB databases/collections and clearly labeled sampled fields.
- [ ] Run SQL and MongoDB finds; inspect results and empty states.
- [ ] Receive useful basic completion suggestions for both databases.
- [ ] Cancel slow operations and receive understandable connection/query errors.
- [ ] Keep the UI responsive and result retrieval bounded.
- [ ] Preserve NULL, large integers, dates, ObjectIDs, and nested documents.
- [ ] Pass relevant Go tests and manually exercise the packaged application.
- [ ] Document supported operations, limitations, and development commands.

## Validation strategy

Use disposable local PostgreSQL and MongoDB instances with deterministic sample
data. Pin service and tool versions when implementation starts. Test against
actual databases rather than mocking all driver behavior.

Required integration cases: connection success/failure, metadata discovery,
known query results, empty results, type preservation, timeout, cancellation,
and cleanup. Include PostgreSQL NULL and large integers, and MongoDB ObjectIDs,
dates, arrays, and documents with inconsistent fields.

Run `go test ./...` as packages are added. Run `go test -race ./...` after shared
connection state and cancellation are introduced. Clearly distinguish tests that
ran from integration tests skipped because services were unavailable.

Manually verify the actual UI and installed build. A passing Go test suite alone
does not prove desktop startup, frontend bindings, or rendering work.
