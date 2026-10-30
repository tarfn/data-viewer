import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createTree, initialProfiles, initialTrees } from "./integrations";
import { useWorkspace } from "./workspace";
import type { ExplorerNode, Profile, ValueDetail } from "./types";
import { Explorer } from "./components/Explorer";
import { ConnectionDialog } from "./components/ConnectionDialog";
import { DatabaseView } from "./components/DatabaseView";
import { KafkaView } from "./components/KafkaView";
import { HttpView } from "./components/HttpView";
import { ValueDrawer } from "./components/ValueDrawer";
import { Icon } from "./components/Icon";
import { shellInfo } from "./shell";

const initialTarget =
  initialTrees[0].children![0].children![0].children![0].target!;

export default function App() {
  const [profiles, setProfiles] = useState(initialProfiles);
  const [trees, setTrees] = useState(initialTrees);
  const [expanded, setExpanded] = useState(
    new Set(["postgres", "postgres:database", "postgres:public"]),
  );
  const [dialog, setDialog] = useState<{ profile?: Profile } | null>(null);
  const [detail, setDetail] = useState<{
    value: ValueDetail;
    tabId: string;
  } | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState(300);
  const drag = useRef<{ x: number; width: number } | null>(null);
  const [status, setStatus] = useState(
    "Ready · sample workspace. Open data or consoles through entity menus.",
  );
  const [shell, setShell] = useState("Browser preview");
  const workspace = useWorkspace(initialTarget);
  const active = workspace.active;
  useEffect(() => {
    let mounted = true;
    shellInfo().then((info) => {
      if (mounted) setShell(info);
    });
    return () => {
      mounted = false;
    };
  }, []);
  function saveProfile(profile: Profile) {
    const exists = profiles.some((p) => p.id === profile.id);
    setProfiles((current) =>
      exists
        ? current.map((p) => (p.id === profile.id ? profile : p))
        : [...current, profile],
    );
    if (!exists) {
      const root = createTree(profile);
      setTrees((current) => [...current, root]);
      const next = new Set(expanded);
      const expand = (node: ExplorerNode) => {
        if (node.children) {
          next.add(node.id);
          node.children.forEach(expand);
        }
      };
      expand(root);
      setExpanded(next);
    }
    setStatus(
      (exists ? "Updated" : "Added") +
        " demo profile " +
        profile.name +
        ". Window memory only; no reconnect or tab target change.",
    );
    setDialog(null);
  }
  const nameFor = (profileId: string) =>
    profiles.find((profile) => profile.id === profileId)?.name ||
    "Unknown profile";
  const path = active
    ? [
        nameFor(active.target.profileId),
        active.target.database,
        active.target.schema,
        active.console ? active.title : active.target.name,
      ].filter((value): value is string => !!value)
    : [];
  const source = active
    ? [
        nameFor(active.target.profileId),
        active.target.database,
        active.target.schema,
        active.target.name,
      ]
        .filter(Boolean)
        .join(" / ")
    : "";
  const inspect = (value: ValueDetail) => {
    if (active) setDetail({ value, tabId: active.id });
  };
  const focusWorkspace = () =>
    requestAnimationFrame(() =>
      document
        .querySelector<HTMLElement>(
          '#workspace [role="tab"][aria-selected="true"], #empty-workspace',
        )
        ?.focus(),
    );
  return (
    <>
      <div className="notice">
        <strong>UI preview:</strong> fictional data only. No live connections or
        query execution. Settings and drafts stay in this window.
      </div>
      <header>
        <div>
          <h1>
            Data Viewer <span className="muted">/ 0.0.1</span>
          </h1>
          <span className="muted">One workspace for your data</span>
        </div>
        <div className="inline">
          <span className="shell-label">{shell}</span>
          <span className="badge">Demo mode · no live connection</span>
        </div>
      </header>
      <div
        className="layout"
        style={{ "--sidebar-width": sidebarWidth + "px" } as CSSProperties}
      >
        <Explorer
          trees={trees}
          profiles={profiles}
          expanded={expanded}
          setExpanded={setExpanded}
          onAdd={() => setDialog({})}
          onEdit={(profile) => setDialog({ profile })}
          onOpen={(node, consoleTab) => {
            if (node.target) {
              const id = workspace.open(node.target, consoleTab);
              requestAnimationFrame(() =>
                document.getElementById("tab-" + id)?.focus(),
              );
            }
          }}
        />
        <div
          className="splitter"
          role="separator"
          aria-label="Resize explorer"
          aria-orientation="vertical"
          aria-valuemin={260}
          aria-valuemax={440}
          aria-valuenow={sidebarWidth}
          tabIndex={0}
          title="Drag or use Left/Right arrows to resize; double-click to reset"
          onPointerDown={(e) => {
            drag.current = { x: e.clientX, width: sidebarWidth };
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (drag.current)
              setSidebarWidth(
                Math.min(
                  440,
                  Math.max(
                    260,
                    drag.current.width + e.clientX - drag.current.x,
                  ),
                ),
              );
          }}
          onPointerUp={() => {
            drag.current = null;
          }}
          onPointerCancel={() => {
            drag.current = null;
          }}
          onDoubleClick={() => setSidebarWidth(300)}
          onKeyDown={(e) => {
            if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) {
              e.preventDefault();
              setSidebarWidth((value) =>
                e.key === "Home"
                  ? 260
                  : e.key === "End"
                    ? 440
                    : Math.max(
                        260,
                        Math.min(
                          440,
                          value + (e.key === "ArrowRight" ? 20 : -20),
                        ),
                      ),
              );
            }
          }}
        />
        <main id="workspace">
          <div className="workspace-topbar">
            <div
              className="workspace-tabs"
              role="tablist"
              aria-label="Open workspaces"
              onKeyDown={(e) => {
                if (
                  !(e.target instanceof HTMLElement) ||
                  e.target.getAttribute("role") !== "tab"
                )
                  return;
                if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key))
                  return;
                const index = workspace.tabs.findIndex(
                  (tab) => tab.id === workspace.activeId,
                );
                const next =
                  e.key === "Home"
                    ? 0
                    : e.key === "End"
                      ? workspace.tabs.length - 1
                      : (index +
                          (e.key === "ArrowRight" ? 1 : -1) +
                          workspace.tabs.length) %
                        workspace.tabs.length;
                e.preventDefault();
                workspace.activate(workspace.tabs[next].id);
                document
                  .getElementById("tab-" + workspace.tabs[next].id)
                  ?.focus();
              }}
            >
              {workspace.tabs.map((tab) => (
                <div className="workspace-tab" key={tab.id}>
                  <button
                    role="tab"
                    id={"tab-" + tab.id}
                    aria-selected={active?.id === tab.id}
                    aria-controls="tab-content"
                    tabIndex={active?.id === tab.id ? 0 : -1}
                    title={[
                      nameFor(tab.target.profileId),
                      tab.target.database,
                      tab.title,
                    ]
                      .filter(Boolean)
                      .join(" / ")}
                    onClick={() => workspace.activate(tab.id)}
                  >
                    <Icon name={tab.target.kind} />
                    <span>{tab.title}</span>
                    {tab.target.database && (
                      <small>{tab.target.database}</small>
                    )}
                    {tab.state === "running" && (
                      <span aria-label="Running simulation">●</span>
                    )}
                  </button>
                  <button
                    aria-label={"Close " + tab.title}
                    title="Close tab"
                    onClick={() => {
                      workspace.close(tab.id);
                      focusWorkspace();
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <button
              id="close-all-tabs"
              disabled={!workspace.tabs.length}
              onClick={() => {
                workspace.closeAll();
                focusWorkspace();
              }}
            >
              Close all tabs
            </button>
          </div>
          {!active ? (
            <section
              id="empty-workspace"
              tabIndex={-1}
              className="empty-workspace"
              aria-labelledby="empty-workspace-title"
            >
              <div className="empty-icon">
                <Icon name="table" />
              </div>
              <h2 id="empty-workspace-title">No tabs open</h2>
              <p>
                Open a table, collection, topic, or request using its ⋯ → Open
                in Tab. For a free query, use a database’s ⋯ → New → Query
                Console.
              </p>
              <button onClick={() => setDialog({})}>Add connection</button>
            </section>
          ) : (
            <div
              id="tab-content"
              role="tabpanel"
              aria-labelledby={"tab-" + active.id}
              tabIndex={0}
            >
              <nav aria-label="Active resource">
                <ol className="breadcrumb">
                  {path.map((label, index) => (
                    <li
                      key={index}
                      aria-current={
                        index === path.length - 1 ? "page" : undefined
                      }
                    >
                      {label}
                    </li>
                  ))}
                </ol>
              </nav>
              <div className="heading">
                <div>
                  <h2>{active.title}</h2>
                  <div className="muted">
                    {[nameFor(active.target.profileId), active.target.database]
                      .filter(Boolean)
                      .join(" / ")}
                  </div>
                </div>
                <span className="eyebrow">Query and inspect</span>
              </div>
              <div className="workspace-state">
                <span className="badge">Demo · no live connection</span>
                <span className="draft-label">
                  Window draft · not saved to disk
                </span>
              </div>
              {["postgres", "mongo"].includes(active.target.kind) ? (
                <DatabaseView
                  key={active.id}
                  tab={active}
                  source={source}
                  onDraft={(patch) => workspace.edit(active.id, patch)}
                  onRun={() => workspace.run(active, "query")}
                  onCancel={() => workspace.cancel(active.id)}
                  onInspect={inspect}
                />
              ) : active.target.kind === "kafka" ? (
                <KafkaView
                  key={active.id}
                  tab={active}
                  source={source}
                  onDraft={(patch) => workspace.edit(active.id, patch)}
                  onRun={(action) => workspace.run(active, action)}
                  onCancel={() => workspace.cancel(active.id)}
                  onInspect={inspect}
                />
              ) : (
                <HttpView
                  key={active.id}
                  tab={active}
                  onDraft={(patch) => workspace.edit(active.id, patch)}
                  onRun={() => workspace.run(active, "http")}
                  onCancel={() => workspace.cancel(active.id)}
                  onInspect={inspect}
                />
              )}
            </div>
          )}
        </main>
      </div>
      <footer role="status" aria-live="polite">
        {status}
      </footer>
      {dialog && (
        <ConnectionDialog
          profile={dialog.profile}
          onClose={() => setDialog(null)}
          onSave={saveProfile}
        />
      )}
      {detail && (
        <ValueDrawer
          detail={detail.value}
          onClose={() => setDetail(null)}
          onPublish={(record) => {
            workspace.edit(detail.tabId, {
              kafkaView: "publish",
              key: record.key,
              headers: JSON.stringify(record.headers, null, 2),
              payload: record.value,
              format: "json",
            });
            setDetail(null);
            setStatus("Copied message into a Publish draft. Nothing was sent.");
          }}
        />
      )}
    </>
  );
}
