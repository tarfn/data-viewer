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

## Workspace layout

```text
+--------------------------------------------------------------------------+
| Data Viewer                    Local PostgreSQL / appdb      Connected   |
+---------------------+----------------------------------------------------+
| Connections      [+]| users                                      Refresh |
| > Local PostgreSQL  | [Data] [Structure] [SQL]                            |
|   appdb             +----------------------------------------------------+
|   > public          | SELECT id, name FROM public.users;                  |
|     > users         |                                                     |
|     > orders        | [Run] [Cancel]              Limit 100   Timeout 30s |
| > Local MongoDB     +----------------------------------------------------+
|                     | id         | name                                   |
|                     | 1          | Ada                                    |
|                     | 2          | Lin                                    |
+---------------------+----------------------------------------------------+
| Ready               | 2 rows · 18 ms                                      |
+---------------------+----------------------------------------------------+
```

Use one active workspace initially. Data/Structure/SQL are views of the selected
resource, not the stretch feature of multiple independently open editor tabs.
MongoDB replaces SQL with Find and Structure with Sampled fields.

## Screens and flows

### 1. First launch

Show an empty connection list and a centered message: **Connect your first
database**. Primary action: **Add connection**. Secondary link: connection help.
Do not show a fake connected database or working results on first launch.

### 2. Add or edit a connection

Use a dialog with PostgreSQL/MongoDB selection, profile name, connection fields,
Test connection, Cancel, and Save and connect. Saving settings must not imply the
connection succeeded. Show field errors next to their fields and connection
errors in a dialog summary. Keep the dialog open after a failed attempt.

PostgreSQL fields: host, port, database, username, password, TLS mode and supported
certificate options. MongoDB: URI entry plus optional database override. Explain
that credentials are used for the session and are not saved. Never repopulate a
saved profile with a raw credential-bearing URI.

Test does not create a lasting active session. Show Connecting while testing or
opening; prevent duplicate submissions and offer cancellation for slow attempts.
Use the same backend validation for Test and Connect.

### 3. Explore PostgreSQL

Select a connected profile, expand database/schema/table, then open a table.
Data opens a bounded preview; Structure lists column name, type, nullability,
default, and key indicators. SQL opens the editor without automatically executing
text. Explicit Refresh reloads metadata and completion candidates.

Keep the active profile/database visible beside Run. Use full resource identity
internally, so equal table names in different schemas cannot collide.

### 4. Explore MongoDB

Expand profile/database/collection. Find shows Filter (`{}`), Projection (`{}`),
ordered Sort entries, Limit (100), and Run/Cancel. Use JSON/Extended JSON editors
for filter/projection and a simple ordered sort-field control for the first UI.

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

- Default to a calm light workspace with a 260 px connection sidebar, resizable
  result/editor split, 8 px spacing scale, and restrained borders. Theme switching
  and saved splitter sizes are stretch goals.
- Use a system sans-serif UI font and a monospace query/data font. Aim for 14 px
  body text, 32–36 px result rows, and clear focus outlines.
- Provide at least WCAG AA contrast (4.5:1 for ordinary text). Connection and
  error states need text/icons, not color alone.
- Begin with a 1024×720 desktop layout. At narrower widths collapse the sidebar
  and keep Run/Cancel reachable. Scroll wide result tables horizontally instead
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
| Arrow keys in explorer | Navigate/expand/collapse resource tree |

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

The wireframe demonstrates layout only and does not validate these production
behaviors. Verify them in Wails once real bindings and database operations exist.
