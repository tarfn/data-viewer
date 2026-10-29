# UI research and design decisions

Research date: October 29, 2026. Scope: connection setup, resource navigation,
database query workspaces, Kafka inspection, HTTP requests, and accessibility.

## Method and limits

This is a primary-source documentation review plus a local interactive prototype,
not a usability study or a claim that the vendor applications were installed and
tested. The environment denied access to JetBrains' documentation host. The
initial Postman source URLs were unavailable. Neither is used as verified
evidence below. DataGrip and Robo 3T remain user-supplied interaction references;
the detailed decisions use accessible official sources.

Official repository sources were read through allowed GitHub endpoints. The
Compass and Bruno references below are pinned to the commits inspected. Other
branch links identify sources accessed on the research date and may change.
Recommendations are our synthesis, not claims that every cited product implements
the proposed behavior exactly.

## Evidence register

| ID | Official source inspected | Relevant evidence |
| --- | --- | --- |
| S1 | [pgAdmin server dialog](https://github.com/pgadmin-org/pgadmin4/blob/master/docs/en_US/server_dialog.rst) | Named server profiles; separate connection fields; password, connection timeout, TLS modes and certificates |
| S2 | [pgAdmin object explorer](https://github.com/pgadmin-org/pgadmin4/blob/master/docs/en_US/tree_control.rst) | Hierarchical expandable server objects; resource-specific actions |
| S3 | [pgAdmin query tool](https://github.com/pgadmin-org/pgadmin4/blob/master/docs/en_US/query_tool.rst) | Editor above output; visible connection/transaction context; separate execution messages |
| S4 | [Compass connections sidebar](https://github.com/mongodb/docs-compass/blob/4ccf2ba4270d0ac32257356b9f0d78381edbcbfc/source/connect/connections.txt) | Persistent sidebar Add action opens a New Connection modal; saved profiles and active connection states are distinct |
| S5 | [Compass connection setup](https://github.com/mongodb/docs-compass/blob/4ccf2ba4270d0ac32257356b9f0d78381edbcbfc/source/connect.txt) | Connection string entry plus advanced authentication/TLS options; replica-set/SRV considerations |
| S6 | [Compass schema analysis](https://github.com/mongodb/docs-compass/blob/4ccf2ba4270d0ac32257356b9f0d78381edbcbfc/source/schema.txt) | Schema observations are sampled; fields can have different types between documents |
| S7 | [Redpanda Console overview](https://github.com/redpanda-data/console/blob/master/README.md) | Topic overview, partition details, message inspection, encodings, consumer groups, TLS/SASL configuration |
| S8 | [Apache Kafka consumer documentation in source](https://github.com/apache/kafka/blob/trunk/clients/src/main/java/org/apache/kafka/clients/consumer/KafkaConsumer.java) | Offsets belong to partitions; current position differs from committed position; manual partition assignment differs from consumer-group subscription |
| S9 | [Bruno request creation](https://github.com/usebruno/bruno-docs/blob/1494fd0423634b0ffe31fcc5613309630e9b7e28/get-started/bruno-basics/create-a-request.mdx) | Explicit creation affordance; named requests with method and URL; request collections; headers, parameters, body, and auth |
| S10 | [Bruno authentication](https://github.com/usebruno/bruno-docs/blob/1494fd0423634b0ffe31fcc5613309630e9b7e28/auth/overview.mdx) and [Bearer auth](https://github.com/usebruno/bruno-docs/blob/1494fd0423634b0ffe31fcc5613309630e9b7e28/auth/bearer.mdx) | Request-level and inherited authentication; dedicated authorization configuration rather than manually mixing secrets into request text |
| S11 | [W3C APG tree view](https://github.com/w3c/aria-practices/blob/main/content/patterns/treeview/treeview-pattern.html) | Expand/collapse semantics, roving focus, arrow navigation, distinction between focus and selection |
| S12 | [W3C APG modal dialog](https://github.com/w3c/aria-practices/blob/main/content/patterns/dialog-modal/dialog-modal-pattern.html) | Focus moves into modal; Tab stays within it; Escape dismisses; focus normally returns to opener |

Kafka's Java source is evidence of protocol/client concepts, not a recommendation
to use Java or assume a Go client's API has identical threading rules.

## Comparative synthesis

| Task | Database client pattern | Kafka pattern | HTTP client pattern | Decision for Data Viewer |
| --- | --- | --- | --- | --- |
| Begin | Add named connection/profile [S1, S4] | Configure broker/security [S7] | Create request or collection [S9] | One persistent Add connection entry, followed by tool-specific forms |
| Navigate | Expand owned resources [S2, S4] | Cluster/topic/partition metadata [S7] | Collection/request hierarchy [S9] | Shared tree shell, different child types; no fake Kafka schema or HTTP database |
| Execute | Query editor plus result output [S3] | Bounded message inspection [S7, S8] | Method/URL and request settings [S9, S10] | Separate SQL, Find, Consume, Produce, and Send actions |
| Explain result | Rows/types or sampled documents [S3, S6] | Partition, offset, key, timestamp, headers [S7, S8] | Response body/headers and transport outcome | Results designed for each capability, not one universal grid |
| Recover | Retain input; explain connection errors [S1, S4] | Stop, change position, inspect without committing offsets | Retain request; distinguish transport failure from HTTP response | Explicit state machine per operation; no blind retries |

## Decision 1: Add must be visible before and after setup

The first prototype omitted the Add action entirely. A new user could explore
samples but could not discover how to begin using their own database. S4 places
Add at the top of the sidebar, and S9 gives request creation an explicit entry.

Keep **+ Add connection** beside the Connections heading, including when there
are already profiles. The empty state repeats the same action. Opening it shows
PostgreSQL, MongoDB, Kafka, and HTTP choices with release/future labels. Avoid
four unrelated global Add buttons or a hidden context-menu-only setup path.

Production flow: choose type → name and configure → optionally Test → Save
profile or Save and connect. Saving is not evidence of connectivity. HTTP uses
**Save API profile**, because reachability is tested by an explicit request rather
than a database-style persistent connection. A successful ping/test does not
establish access to every database, topic, or API operation.

Prototype flow: choose type → validate fields → **Add demo profile**. It inserts
fictional child resources in memory, clearly states no connectivity test occurred,
and discards credential fields on close. This intentionally differs from real
connection lifecycle semantics. Reloading removes added demo profiles.

## Decision 2: Adapt setup to the integration

| Type | Essential fields | Advanced settings for actual implementation | Do not imply |
| --- | --- | --- | --- |
| PostgreSQL | Name, host, port, database, username, password | TLS mode, CA/client certificate, connection timeout | All databases share one PostgreSQL session; encryption alone always verifies server identity |
| MongoDB | Name, URI, initial database | Auth source/mechanism, TLS trust, replica-set options | A masked URI is safe to persist unchanged or a sampled field is guaranteed |
| Kafka | Name, bootstrap servers, security protocol | SASL mechanism/credentials, CA/client certificate, metadata timeout | Reachable bootstrap broker means every advertised broker is reachable |
| HTTP | Name, base URL | Session auth, certificate trust, timeout, redirect policy | Saved API profile is a live connection or a health check is automatically safe |

Use ordinary fields first, with advanced settings progressively disclosed. Never
disable TLS verification as a default troubleshooting action. URI paste is useful
for MongoDB but needs deliberate parsing/redaction before any profile persistence.

## Decision 3: Keep the tree faithful to resource ownership

Use connection → connected database → schema → table for PostgreSQL and
connection → database → collection for MongoDB [S2, S4, S6]. Kafka uses cluster
profile → Topics → topic; an HTTP API profile uses Requests → saved request [S7,
S9]. Add consumer-group inspection later when its separate capability exists.

Children must remain directly beneath their own parent, not in a shared list
after all connections. Expansion, keyboard focus, and active resource selection
are distinct states. Expanding another cluster must never retarget a query that
is already running. Use full resource identities, per-branch cache/loading/error
state, and lazy metadata retrieval in the real app.

## Decision 4: Kafka needs stream controls, not a query editor

The inspection workspace should expose:

- Topic and cluster context, partition selection, and start position.
- Latest, earliest available, and explicit offset (only with a selected
  partition). Offsets are not global across a topic, may have gaps, and may be
  unavailable after retention/compaction [S8].
- Maximum records, duration, and byte cap. Initial design proposals: 100 records,
  30 seconds, 10 MiB; these are product defaults, not vendor recommendations.
- Consume/Stop and a bounded buffer, with idle/consuming/stopped/empty/error
  states. “Latest with no new messages” is a valid idle result, not an error.
- Message table with partition, offset (string-encoded), key, timestamp, and
  value preview; detail view includes headers, decoder, raw payload, and size.

Browsing should use explicit partition inspection without auto-committing group
offsets. A later live-tail mode needs pause/resume and visible dropped/buffered
counts; it must not promise replay from a timestamp without a supported contract.
Group lag, reset offsets, topic deletion, and ACL editing are different tasks and
are deferred. Topic partition metadata changes require refresh/error handling.

Produce is a separate, deliberate action with target topic/partition, key,
headers, payload, encoding, and acknowledgement. Canceling a produce request does
not guarantee the broker did not receive it. The prototype only illustrates key,
payload, and a fake acknowledgement; it does not implement these guarantees.

## Decision 5: HTTP needs request composition and response inspection

The workspace uses method + effective URL + Send/Cancel, followed by Params,
Headers, Authorization, and Body controls [S9, S10]. Keep response body/headers
below the request with status, timing, byte count, and truncation indication.
Do not reuse database “Connect” terminology for an API profile.

In production, parameters/headers should be editable enabled key/value rows
preserving duplicate keys and order where relevant. Show the final encoded URL
before sending. Provide a clear rule for inherited base URL/auth and expose the
effective host/auth source. A body/editor mode must match Content-Type; multipart,
binary, scripting, environments, OAuth flows, and cURL import can follow later.

Transport failure, timeout, user cancellation, and a received 4xx/5xx response
are distinct outcomes. Never render a network failure as HTTP status 0 success.
Do not forward sensitive headers blindly across redirects to another origin.
Cancellation does not undo a completed HTTP mutation, and retry is not always
safe. A future Go implementation must bound response bytes and close bodies.

The prototype provides simplified parameter/header textareas, None/Bearer auth,
raw JSON for POST/PUT/PATCH, response Body/Headers, URL composition, and simulated
Send/Cancel. Its sample 200 status is labeled simulated and is not a real result.

## Decision 6: Accessibility is part of the interaction model

Follow the tree keyboard model [S11], with a visible focused node and a separate
selected resource. Closing a parent should not move other branches. Keep resource
navigation available at narrow widths; a scrollable stacked explorer is the
current prototype approach.

The Add dialog uses native modal behavior with explicit labels, initial focus,
Cancel/Close, Escape dismissal, and focus restoration [S12]. Validate required
fields and show errors without throwing away the form. Do not place live
credentials in screenshots, logs, fixtures, or committed browser storage.

## Evaluation and remaining research

Local Chromium checks cover the prototype's creation forms, tree navigation,
workspace switching, stream Stop, request Cancel, field validation, and narrow
layout. These checks verify prototype mechanics, not database connectivity,
Kafka consumption, HTTP transport behavior, assistive-technology conformance, or
user comprehension.

Before frontend implementation is considered finished, run task-based sessions:

| Task | What to observe | Candidate acceptance target, not a measured result |
| --- | --- | --- |
| Add a PostgreSQL profile | Is Add found without help? Are errors recoverable? | Complete setup unaided without losing input |
| Find a MongoDB collection | Does hierarchy ownership make sense? | Open the correct collection without switching the wrong connection |
| Inspect a Kafka record | Do partition/start/Stop controls make sense? | Find record details and stop inspection without changing group offsets |
| Send an API request | Are URL, auth, and response distinguishable? | Identify effective target and distinguish 404 from connection failure |
| Keyboard-only navigation | Can users escape a modal and reach results? | Complete the main flow without a pointer |

Open questions: initial desktop OS, metadata scale in real user databases, need
for live Kafka tail versus bounded inspection, payload encodings, and preferred
HTTP auth mechanisms. These can be answered during later implementation; they
do not block the present PostgreSQL/MongoDB backend learning milestones.

## Release boundary

This request expands the design/prototype to four tools. It does not implement
Kafka/HTTP backends or silently add them to the December 0.0.1 commitment. Use
[features](features.md) for production priorities and [the UX guide](ui-ux-guide.md)
for interaction requirements. Reassess the release plan explicitly before taking
on additional integration backend work.
