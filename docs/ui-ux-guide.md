# UI and UX guide

## Product experience

The user should always know **where they are connected**, **what will run**, and
**what happened**. The first release is a focused database viewer with a SQL
editor and a MongoDB Find workspace. No inline record editing is planned.

The Go developer can work against [handoff contracts](frontend-handoff.md) while
a frontend implementer builds these screens using mock responses. The
[interactive wireframe](ui-prototype.html) is a dependency-free illustration,
not a Wails application or a database client. Open the file in a desktop browser.
Its contents are fictional and it performs no network requests or persistence.
It now includes PostgreSQL/MongoDB creation forms and future Kafka/HTTP workspace
designs. [Research and source evidence](ui-research.md) explain the choices and
limitations. Kafka/HTTP production integrations remain outside release 0.0.1.

## Workspace layout

```text
+--------------------------------------------------------------------------+
| Data Viewer                    Local PostgreSQL / appdb      Connected   |
+---------------------+----------------------------------------------------+
| Connections      [+]| [users] [Query Console 1 · appdb]                  |
| ▾ Local PostgreSQL  | users                         [Data] [Structure]   |
|   ▾ appdb           +----------------------------------------------------+
|     ▾ public        | Filter [name LIKE 'A%'                         ]   |
|         users       |                                                     |
|         orders      | [Apply filter] [Cancel]     Limit 100   Timeout 30s |
| ▸ Local MongoDB     +----------------------------------------------------+
|                     | id         | name                                   |
|                     | 1          | Ada                                    |
|                     | 2          | Lin                                    |
+---------------------+----------------------------------------------------+
| Ready               | 2 rows · 18 ms                                      |
+---------------------+----------------------------------------------------+
```

Use a tab strip for resource views and independent database query consoles.
Tables have Data/Structure views; collections have Data/Sampled fields views.
Both use a single-line filter text field, not a free-form query editor. For custom
queries, use the database's **⋯ → New → Query Console**, or right-click for the
same menu. Every invocation opens a distinct console tab.

Clicking a row or icon selects the explorer entity and toggles branch expansion;
it never opens a tab, switches the active tab, retargets a draft, or cancels a
running operation. The chevron only expands/collapses. Connection roots, schemas,
and grouping folders have no action menus. Databases and data entities have an
always-visible right-side **⋯** button, including on touch layouts. Tables,
collections, topics, and requests offer **Open in Tab**. Database menus offer
**New → Query Console** directly, with no intermediate database/overview page.
Enter/Space selects/toggles a row; the action button opens its menu. Shift+F10 or
right-click opens the same menu for entities with actions. Left/Right arrows still control
tree expansion. Explorer selection and the active workspace are distinct states;
the breadcrumb and active tab identify the execution target.

Menus are built from extensible action descriptors with applicability checks.
Available actions currently include Open in Tab for data entities and New →
Query Console for databases. Parent expansion uses the tree, not menus.
Tables/collections show a disabled
**View indexes · planned** entry; it performs no request. Future index/properties/
export actions can extend this registry without turning row clicks into actions.
Do not infer backend permissions from menu visibility.

Each console owns its ID, draft, results, request/cancel state, and immutable
connection/database binding. Database simulations can finish in an inactive tab
and update only that tab's result snapshot. Closing a console cancels its pending
simulation and discards its window draft/results. The last tab can close; the
workspace then shows **No tabs open**, keeps the explorer usable, and offers Add
connection. **Close all tabs** closes every tab and cancels pending work without
opening a replacement. Normal resource drafts stay in window memory; closed
console drafts/results are discarded. Left/Right/Home/End navigate the tab strip.
The prototype closes drafts
directly; a production editor needs an unsaved-work policy before adding file
persistence or valuable user sessions.

This user-requested design supersedes the single-workspace plan. Persistent tabs
and history remain deferred. Kafka/HTTP operations still cancel on navigation;
independent background execution is demonstrated for database operations only.

### Resource search and workspace context

The explorer's **Find a resource** searches loaded resource names, kinds, and
parent paths. All query words must match. Keep matching leaves beneath their
connection/database/schema ancestors; expand matching paths temporarily and hide
unrelated branches. Searching a parent also exposes its children. Show no-results
feedback and Clear; clearing restores earlier expansion state, while retaining
the path to a resource explicitly opened from the results. Selecting a result
alone does not open a workspace. Do not query a database on each keystroke.

The prototype searches its fictional loaded tree. Real lazy-loaded metadata needs
a separate supported discovery/search contract before promising server-wide
search. Arrow navigation skips hidden results. Escape clears the explorer query.

Show the full active resource breadcrumb above the workspace, alongside the
profile label and an explicit demo/disconnected/live state. Changing a branch's
expansion never changes this execution context.

### Per-resource drafts and resizing

Keep editor inputs separately per full resource identity in the current window:
resource filters, each console's query text, Kafka consume settings/publish
payloads, and HTTP request fields.
Returning to a resource restores its own draft and view rather than inheriting
the last tool's inputs. Restoring a draft never starts execution or restores a
previous in-flight operation. Database jobs already running in another open tab
may finish without changing the active tab; restoration never resubmits them.

The prototype stores drafts only in JavaScript memory; reload clears them.
Dedicated password/token inputs and HTTP header text are excluded and reset on
navigation. Other editor text may contain sensitive user content and must never
be logged or persisted implicitly. Persistent draft storage remains deferred.

Drag the divider to resize the desktop explorer (260–440 px); Left/Right arrows
adjust its width, Home/End choose bounds, and double-click resets to 300 px.
The console textarea has a native vertical resize handle. Layout sizes are not
saved. Narrow layouts stack the explorer and hide the desktop divider.

### Result detail drawer

Make SQL values keyboard-accessible inspection buttons. The drawer displays full
value, database type, and source path, distinguishing NULL from empty text. MongoDB
document inspection preserves its Extended JSON representation. Kafka message
inspection includes key/value, headers, partition/offset; HTTP inspection uses
the completed response's captured target, even if the request draft is edited.

The drawer is a modal panel on the right: move focus inside it, close with Done,
Close, or Escape, and restore focus when practical. Copy uses the clipboard API
on explicit action, falling back to selecting text for Ctrl/Cmd+C when unavailable.
Opening or copying data never executes an operation.

For a Kafka message, **Use as publish draft** copies key, headers, and payload to
the selected topic's Publish editor. It does not publish. The user must explicitly
invoke Publish and receive a separate acknowledgement.

### Explorer hierarchy and expansion

The sidebar is one nested resource tree, similar to DataGrip or Robo 3T. Children
appear **immediately below their own parent**, before the next sibling connection.
Never put the selected connection's schema/collection list below all connections.

```text
▾ Local PostgreSQL                 connection
  ▾ appdb                          connected database
    ▾ public                       schema
        users                      table
        orders                     table
▾ Local MongoDB                    connection
  ▾ shop                           database
      customers                    collection
      orders                       collection
```

PostgreSQL release 0.0.1 browses the connected database; selecting a different
database requires its own connection/session. MongoDB can list databases allowed
by the current credentials. Do not add a fake schema level for MongoDB.

- Each branch has a disclosure chevron and visible indentation/guide lines.
  Connection, database, and PostgreSQL schema branches expand independently.
- Clicking rows selects/toggles explorer entities without changing the active
  tab. The right-side actions menu is the explicit entry to opening a workspace.
  Explorer selection can differ from the execution context shown in the active
  tab/breadcrumb. Branch chevrons only expand/collapse.
- Keep expansion state per node while navigating between resources. Collapsing
  a branch hides only its descendants and leaves the active workspace intact.
- In the real app, load a branch's metadata on first expansion. Show loading,
  empty, permission/error, and Retry states inside that branch. Cache children
  until explicit refresh or disconnect; do not fetch again on every collapse.
- Keep the tree scrollable on small screens; do not hide resource navigation.
- Use stable IDs scoped by connection, database, schema, and resource kind/name.
  A MongoDB `orders` collection and PostgreSQL `orders` table are distinct nodes.

The prototype implements expansion, leaf selection, and keyboard navigation with
fixed sample resources. Lazy loading and real connection management remain future
application work.

## Screens and flows

### 1. First launch

Show an empty connection list and a centered message: **Connect your first
database**. Primary action: **Add connection**. Secondary link: connection help.
Do not show a fake connected database or working results on first launch.

### 2. Add or edit a connection

Keep **+ Add connection** visible in the sidebar header, even with existing
profiles. Open a searchable integration catalog, not a fixed grid of tool cards.
Show a bounded, scrollable list populated from registered descriptors. Each row
contains name, short description, category, and availability/release status.
Search matches name and capability keywords; category filters and a no-results
state make a larger catalog usable. Categories come from the descriptors too.

Selecting a row opens that integration's configuration step with a visible
**Back to integrations** action. Back clears credentials; choosing another
integration starts a fresh form. Escape closes the dialog and restores focus to
Add connection. Search/arrow keys/Enter can select a result without a pointer.
Do not automatically install or execute an external plugin by selecting its row.

The configuration step includes profile name, connection fields,
Test connection, Cancel, and Save and connect. Saving settings must not imply the
connection succeeded. Show field errors next to their fields and connection
errors in a dialog summary. Keep the dialog open after a failed attempt.

The prototype also offers Kafka/HTTP choices marked **Future design**. Its
**Validate form (demo)** action validates inputs, not connectivity; **Add demo
profile** adds fictional resources in memory and discards all credential fields
when the dialog closes. Reloading removes these profiles. In the actual app,
Save profile, Test connection, and Save and connect need distinct outcomes.
Adding a profile does not automatically open a workspace; use its entity menu.

PostgreSQL fields: host, port, database, username, password, TLS mode and supported
certificate options. MongoDB: URI entry plus optional database override. Explain
that credentials are used for the session and are not saved. Never repopulate a
saved profile with a raw credential-bearing URI.

Test does not create a lasting active session. Show Connecting while testing or
opening; prevent duplicate submissions and offer cancellation for slow attempts.
Use the same backend validation for Test and Connect.

For future Kafka setup, show bootstrap servers and security protocol first,
revealing SASL mechanism/username/password only when SASL is enabled. TLS trust
and client certificate options belong in Advanced settings. For HTTP, show a
profile name/base URL and explain that the profile groups requests, rather than
opening a persistent connection. Auth belongs to session/request configuration.

### 3. Explore PostgreSQL

Expand a connected profile/database/schema, then use a table's ⋯ → Open in Tab.
Data opens a bounded preview; Structure lists column name, type, nullability,
default, and key indicators. Data has a filter text field for a SQL WHERE expression
such as `id > 10 AND name LIKE 'A%'`; Apply/Enter targets only the selected table.
Empty text clears the filter. Explicit Refresh reloads metadata/completions.

For free SQL, use database ⋯ → New → Query Console. The new tab is bound to
that database, independent of the current table. Opening another console never
replaces an existing console draft.

Keep the active profile/database visible beside Run. Use full resource identity
internally, so equal table names in different schemas cannot collide.

### 4. Explore MongoDB

Expand profile/database/collection. Data uses a filter text field such as
`{ "active": true }`; empty text means `{}`. Apply validates a JSON object.
Projection, ordered Sort, and Limit remain planned advanced Find controls; the
current prototype demonstrates the filter, not those advanced controls.

Database ⋯ → New → Query Console opens a command-JSON editor, for example
`{ "find": "customers", "filter": {}, "limit": 100 }`. It does not evaluate
`db.collection.find(...)`, JavaScript, or mongosh scripts. Actual supported
commands and authorization require a separate backend contract.

Results use an expandable document list and a formatted JSON detail panel.
Sampled fields shows field path, observed types, and the number of documents
sampled. Explain: **Fields observed in up to 100 documents; other fields may
exist.** An empty collection shows **No fields observed**, not a made-up schema.

### 5. Run and inspect results

Keep draft inputs editable if feasible, but bind each execution to a snapshot of
its submitted inputs and connection. Disable another Run for the same workspace
while its request is active. Enable Cancel only during that operation.

Show elapsed time, row/document count, and truncation status. Render NULL with a
distinct subdued label; do not confuse it with an empty string. Let users inspect
full cell/document values without silently coercing large numbers to JavaScript
numbers. Byte-limited responses must say why output stopped.

Do not show a Next button until a real continuation contract exists. Initially,
let users refine their query or explicitly increase the allowed preview limit.

### 6. Kafka workspace (future)

```text
Development Kafka → Topics → orders.created
+------------------------------------------------------------------+
| [Consume] [Publish]                                                |
| Consume workspace:                                                |
| Partition [All]  Start [Latest]   Max records [100]  Duration [30s] |
| [Consume] [Stop]                        Inspection: no group commits|
+------------------------------------------------------------------+
| Partition | Offset | Key        | Timestamp | Value preview        |
| 0         | 24     | order-1042 | ...       | {"event": ...}        |
+------------------------------------------------------------------+
| Selected message: headers, encoding, full key/value                 |
+------------------------------------------------------------------+
```

Selecting a topic does not automatically consume. Latest, Earliest available,
and Specific offset are different starting intents; explicit offset requires
one partition. Stop is separate from disconnect. Bounded record/duration/byte
limits prevent unlimited accumulation. Keep current topic/cluster visible.

Distinguish Idle, Consuming, Stopped, Empty, Truncated, and Failed. A quiet topic
is not an error. Preview inspection must not commit group offsets or join a
production application's consumer group. Do not imply offsets form a global
topic-wide sequence or guarantee consecutive offsets after compaction/retention.

The details pane shows partition/offset, timestamp, headers, decoded value, and
raw fallback. **Consume and Publish are equally visible workspace actions**.
Publishing must not be hidden inside a collapsed section of the consumer view.
Neither switching modes nor selecting a topic sends data automatically.

```text
Development Kafka → Topics → orders.created
+------------------------------------------------------------------+
| [Consume] [Publish]                                                |
| Publish target: Development Kafka / orders.created                 |
| Partition [Automatic]   Format [JSON]                              |
| Key [order-1042]                                                   |
| Headers [{"key":"source","value":"data-viewer"}]                   |
| Payload {"event":"order.created","id":1042}                        |
| [Publish] [Cancel]                                                 |
+------------------------------------------------------------------+
| Acknowledgement: topic, partition, offset, delivery status          |
+------------------------------------------------------------------+
```

Publish includes optional key, automatic/explicit partition, ordered headers
(duplicate keys supported), JSON/Text payload, validation, and a result panel.
The prototype validates JSON/header shape and a 1 MiB payload cap, then simulates
an acknowledgement. It supports Cancel simulation and captures the target before
the operation; navigating to another topic cancels pending simulation output.
All partition/offset values in acknowledgements are explicitly fictional.

The real producer must distinguish acknowledged, failed, and uncertain delivery.
Cancel or timeout after transmission cannot guarantee that a broker did not
accept the record. Do not automatically retry an uncertain publish from the UI.
Actual encodings, broker limits, acknowledgements, and idempotence depend on the
chosen Go driver and configuration. The prototype does not publish to Kafka.

### 7. HTTP workspace (future)

```text
Example API → Requests → GET /health
+------------------------------------------------------------------+
| [GET v] [https://api.example.test/health             ] [Send][Cancel]|
| [Params] [Headers] [Authorization] [Body]                          |
| Editable key/value controls or appropriate body editor             |
| Effective URL and auth source                                     |
+------------------------------------------------------------------+
| Response: 200 OK · elapsed · bytes       [Body] [Headers]           |
| { "status": "ok" }                                                |
+------------------------------------------------------------------+
```

The saved request stays under its API profile/folder. Keep method, effective URL,
and Send visible; show sensitive tokens in masked Authorization inputs. Separate
response body and headers and distinguish received 4xx/5xx from DNS/TLS/network
failure, timeout, and cancellation. Preserve the composed request on errors.

The prototype demonstrates simplified Params/Headers textareas, None/Bearer auth,
JSON bodies for POST/PUT/PATCH, URL encoding, and Send/Cancel. Its status/results
are simulated. Production work should replace key/value textareas with enabled
rows, define Content-Type behavior, avoid cross-origin auth leakage on redirects,
and bound response memory. Cancel does not undo an already completed mutation.

## States and recovery

| State | UI behavior | Recovery |
| --- | --- | --- |
| Disconnected | Show profile settings; disable data actions | Connect |
| Connecting | Spinner and status text; prevent duplicate action | Cancel or wait |
| Connected / idle | Show target and enabled supported actions | Browse or run |
| Metadata loading | Loading placeholder only in affected tree/panel | Cancel or wait |
| Running | Show elapsed time and Cancel; mark prior output as previous | Cancel or wait |
| Success | Show current results and timing | Edit and run again |
| Empty | “Query completed: no rows/documents” | Adjust inputs |
| Canceled | “Operation canceled”; do not imply success | Run again |
| Timed out | Explain configured duration | Refine request or change timeout |
| Failed | Safe operation-specific error; retain draft input | Fix input, retry, or reconnect |
| Truncated | Persistent notice with limit and returned count | Refine query or adjust cap |
| Connection lost | Mark session unavailable and disable execution | Explicit reconnect |

If old results remain after a failure, label them **Previous result** with their
target and execution time. Do not show stale data as the latest successful result.
Switching resource/connection discards late responses from the old selection.

## Visual and interaction guidelines

- Use consistent local icons beside names in the explorer, integration catalog,
  and configuration header: a cylinder for databases/PostgreSQL, a leaf for
  MongoDB, connected nodes for Kafka, and code brackets for HTTP/API. These are
  original pictograms, not official vendor logos. Schema, table, collection,
  folder, topic, and request nodes have corresponding resource icons.
- Keep text labels; hide decorative SVGs from assistive technology and keyboard
  focus. Shape distinguishes integrations without relying on color. Plugin icon
  keys select trusted local assets, with a generic plug fallback for unknown keys.
- Default to a calm light workspace with a 300 px connection sidebar, resizable
  result/editor split, 8 px spacing scale, and restrained borders. Theme switching
  and saved splitter sizes are stretch goals.
- Use a system sans-serif UI font and a monospace query/data font. Aim for 14 px
  body text, 32–36 px result rows, and clear focus outlines.
- Provide at least WCAG AA contrast (4.5:1 for ordinary text). Connection and
  error states need text/icons, not color alone.
- Begin with a 1024×720 desktop layout. At narrower widths use a scrollable
  explorer above the workspace and keep Run/Cancel reachable. Scroll wide result tables horizontally instead
  of shrinking text until unreadable.
- Use labeled native controls. Tree items need keyboard expand/collapse and an
  accessible selection state. Loading/status updates should use polite live
  announcements; urgent error messages should receive appropriate announcements.
- Dialogs trap focus, Escape closes when safe, and closing restores focus to the
  opener. Move focus to the first invalid input after validation.

### Keyboard behavior

| Shortcut | Behavior |
| --- | --- |
| Ctrl/Cmd+Enter | Run the active SQL statement or Find form when enabled |
| Ctrl+Space in editor | Open completion menu |
| Enter / Escape in completion menu | Accept / dismiss suggestion |
| Tab / Shift+Tab | Navigate actionable controls with visible focus |
| Up / Down in explorer | Focus previous/next visible node without selecting it |
| Right in explorer | Expand branch, or focus its first child if already expanded |
| Left in explorer | Collapse branch, or focus its parent |
| Home / End in explorer | Focus first/last visible node |
| Enter / Space in explorer | Select/toggle entity without opening a tab |
| Enter / Space on entity actions button | Open that entity's action menu |
| Shift+F10 / context-menu key on entity | Open the same action menu |
| Escape in explorer search | Clear filter and restore branch expansion |
| Left / Right on explorer divider | Resize sidebar; Home/End choose bounds |

Cancel must have a reachable button; do not overload Escape while an editor
completion menu or dialog is open. Do not steal ordinary editor typing shortcuts.

## Frontend acceptance walkthrough

1. Launch without profiles and add each database type using only the keyboard.
2. Test an invalid connection, correct it, and connect without losing the form.
3. Browse a PostgreSQL table and run a query with NULL and a large integer.
4. Browse MongoDB, run a Find, and inspect a date/ObjectID/nested document.
5. Confirm autocomplete follows the active database and refreshes its metadata.
6. Run slow, empty, failing, and capped requests; distinguish every outcome.
7. Switch selection during a pending request; its late result must not replace
   the current workspace. Disconnect and reconnect without a frozen UI.
8. Restart and reconnect from saved non-secret settings.
9. Expand both connections and verify every schema/collection remains under its
   own database. Collapse/reopen either branch without moving the other branch
   or changing the active workspace. Repeat with keyboard navigation.
10. Open Add connection, inspect each type's form, validate bad/good input, add a
    demo profile, and verify its children stay under it. Escape restores focus;
    reopening does not restore password/URI/token contents.
11. In the future Kafka design, select a topic, inspect messages, stop a pending
    sample stream, and try an offset without selecting a partition. Switch to
    Publish, validate JSON/headers, publish JSON and text examples, inspect the
    simulated acknowledgement, and cancel an in-flight simulation.
12. In the future HTTP design, compose a URL with params, change request settings,
    send/cancel a simulated request, and inspect response headers.
13. Search integrations by name/capability, filter categories, recover from no
    matches, and select with the keyboard. A large test catalog must scroll
    inside the picker rather than expand it into an unbounded card grid.
14. Search the explorer for a resource in a collapsed branch, use its menu to
    Open in Tab, then
    clear the filter. Its parent path remains visible and unrelated branches
    return to their prior state.
15. Edit drafts in two resources of each tool and switch between them. Inputs
    remain isolated; password/token controls and HTTP headers reset. Reload
    clears window drafts.
16. Inspect a NULL, document, Kafka message, and completed HTTP response. Copy a
    value; copy a Kafka message to Publish without sending. Resize the explorer
    with pointer and keyboard, then verify the narrow layout.
17. Apply table/collection text filters; open two consoles from the same database
    and another database's console. Verify separate drafts/results and captured
    targets. Switch tabs while running, cancel one job, and close a running
    console without affecting another tab or leaking late results.
18. Click several entities and add a new profile while a query is running. No
    extra tabs should appear, and the active tab/draft/operation must stay intact.
    Open tabs through row menus, reuse an existing resource tab, and verify
    planned index actions are visibly disabled. Repeat using keyboard and touch.
19. Verify parent/group rows have no menus and a database menu has no Open in Tab
    or overview action. Close the last tab and use Close all tabs while operations
    are running. The empty workspace must stay empty until an explicit action
    opens a data tab/console; explorer search, menus, and Add connection still work.

The wireframe demonstrates layout only and does not validate these production
behaviors. Verify them in Wails once real bindings and database operations exist.
