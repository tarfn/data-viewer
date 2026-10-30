import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import type { ExplorerNode, Profile } from "../types";
import { Icon } from "./Icon";

export interface EntityAction {
  id: "open" | "new-console" | "indexes";
  label: string;
  disabled?: boolean;
}
export function entityActions(node: ExplorerNode): EntityAction[] {
  if (node.entity === "database")
    return [{ id: "new-console", label: "Query Console" }];
  if (["table", "collection", "topic", "request"].includes(node.entity))
    return [
      { id: "open", label: "Open in Tab" },
      ...(["table", "collection"].includes(node.entity)
        ? [
            {
              id: "indexes" as const,
              label: "Indexes · planned",
              disabled: true,
            },
          ]
        : []),
    ];
  return [];
}

interface Menu {
  node: ExplorerNode;
  anchor: HTMLElement;
  x: number;
  y: number;
}
interface Props {
  trees: ExplorerNode[];
  profiles: Profile[];
  expanded: Set<string>;
  setExpanded: (value: Set<string>) => void;
  onEdit: (profile: Profile) => void;
  onAdd: () => void;
  onOpen: (node: ExplorerNode, consoleTab: boolean) => void;
}

export function Explorer({
  trees,
  profiles,
  expanded,
  setExpanded,
  onEdit,
  onAdd,
  onOpen,
}: Props) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState("postgres:users");
  const [menu, setMenu] = useState<Menu | null>(null);
  const tree = useRef<HTMLUListElement>(null);
  const names = new Map(profiles.map((profile) => [profile.id, profile.name]));
  const label = (node: ExplorerNode) =>
    node.entity === "profile" ? names.get(node.id) || node.label : node.label;
  const matches = (node: ExplorerNode): boolean =>
    label(node).toLowerCase().includes(search.toLowerCase().trim()) ||
    !!node.children?.some(matches);
  function visibleNodes(
    nodes: ExplorerNode[],
    parentMatches = false,
  ): ExplorerNode[] {
    return nodes.flatMap((node) => {
      const own =
        parentMatches ||
        label(node).toLowerCase().includes(search.toLowerCase().trim());
      if (search && !own && !matches(node)) return [];
      return [
        node,
        ...(search || expanded.has(node.id)
          ? visibleNodes(node.children || [], own)
          : []),
      ];
    });
  }
  const visible = visibleNodes(trees);
  const focusId = visible.some((node) => node.id === selected)
    ? selected
    : visible[0]?.id;
  function toggle(node: ExplorerNode, open?: boolean) {
    const next = new Set(expanded);
    if (open ?? !next.has(node.id)) next.add(node.id);
    else next.delete(node.id);
    setExpanded(next);
  }
  function showMenu(node: ExplorerNode, anchor: HTMLElement) {
    const bounds = anchor.getBoundingClientRect();
    setMenu({
      node,
      anchor,
      x: Math.max(8, Math.min(bounds.right, innerWidth - 230)),
      y: Math.max(8, Math.min(bounds.bottom, innerHeight - 160)),
    });
  }
  function key(event: KeyboardEvent<HTMLLIElement>, node: ExplorerNode) {
    if (event.target !== event.currentTarget) return;
    const elements = [
      ...tree.current!.querySelectorAll<HTMLLIElement>('[role="treeitem"]'),
    ].filter((item) => !item.closest("[hidden]"));
    const index = elements.indexOf(event.currentTarget);
    let destination: HTMLElement | undefined;
    if (event.key === "ArrowDown")
      destination = elements[Math.min(index + 1, elements.length - 1)];
    else if (event.key === "ArrowUp")
      destination = elements[Math.max(index - 1, 0)];
    else if (event.key === "Home") destination = elements[0];
    else if (event.key === "End") destination = elements.at(-1);
    else if (event.key === "ArrowRight" && node.children) {
      if (!expanded.has(node.id)) toggle(node, true);
      else destination = elements[index + 1];
    } else if (event.key === "ArrowLeft") {
      if (node.children && expanded.has(node.id)) toggle(node, false);
      else
        destination =
          event.currentTarget.parentElement?.closest<HTMLLIElement>(
            '[role="treeitem"]',
          ) || undefined;
    } else if (["Enter", " "].includes(event.key)) {
      setSelected(node.id);
      if (node.children) toggle(node);
    } else if (
      (event.key === "F10" && event.shiftKey) ||
      event.key === "ContextMenu"
    ) {
      const button = event.currentTarget.querySelector<HTMLButtonElement>(
        ":scope > .tree-row .entity-more",
      );
      if (button) showMenu(node, button);
    } else return;
    event.preventDefault();
    event.stopPropagation();
    if (destination) {
      setSelected(destination.dataset.nodeId!);
      destination.focus();
    }
  }
  function render(node: ExplorerNode, parentMatches = false) {
    const own =
      parentMatches ||
      label(node).toLowerCase().includes(search.toLowerCase().trim());
    const hidden = !!search && !own && !matches(node);
    const actions = entityActions(node);
    const profile = profiles.find((profile) => profile.id === node.profileId)!;
    const open = !!search || expanded.has(node.id);
    return (
      <li
        key={node.id}
        role="treeitem"
        data-node-id={node.id}
        data-entity={node.entity}
        aria-labelledby={"label-" + node.id}
        aria-selected={selected === node.id}
        aria-expanded={node.children ? open : undefined}
        hidden={hidden}
        tabIndex={node.id === focusId ? 0 : -1}
        onKeyDown={(e) => key(e, node)}
        onContextMenu={(e) => {
          if (
            e.target !== e.currentTarget &&
            (e.target as HTMLElement).closest('[role="treeitem"]') !==
              e.currentTarget
          )
            return;
          e.preventDefault();
          const anchor = e.currentTarget.querySelector<HTMLElement>(
            ":scope > .tree-row .entity-more",
          );
          if (anchor) showMenu(node, anchor);
        }}
      >
        <div
          className="tree-row"
          onClick={(e) => {
            setSelected(node.id);
            e.currentTarget.parentElement?.focus();
            if (node.children) toggle(node);
          }}
        >
          <span className="chevron" aria-hidden="true">
            {node.children ? "▸" : "·"}
          </span>
          <Icon name={node.entity === "profile" ? node.kind : node.entity} />
          <span className="tree-label" id={"label-" + node.id}>
            {label(node)}
          </span>
          <span className="tree-kind" aria-hidden="true">
            {node.entity === "profile"
              ? profile.revision > 1
                ? "updated"
                : ["kafka", "http"].includes(node.kind)
                  ? "future"
                  : "demo"
              : node.entity}
          </span>
          {node.entity === "profile" && (
            <button
              className="connection-edit"
              title={"Edit connection " + profile.name}
              aria-label={"Edit connection " + profile.name}
              aria-haspopup="dialog"
              tabIndex={node.id === focusId ? 0 : -1}
              onClick={(e) => {
                e.stopPropagation();
                onEdit(profile);
              }}
            >
              <Icon name="edit" />
            </button>
          )}
          {!!actions.length && (
            <button
              className="entity-more"
              aria-label={"Actions for " + node.entity + " " + label(node)}
              aria-haspopup="menu"
              aria-expanded={menu?.node.id === node.id}
              tabIndex={node.id === focusId ? 0 : -1}
              onClick={(e) => {
                e.stopPropagation();
                setSelected(node.id);
                if (menu?.node.id === node.id) setMenu(null);
                else showMenu(node, e.currentTarget);
              }}
            >
              ⋯
            </button>
          )}
        </div>
        {node.children && (
          <ul role="group" hidden={!open}>
            {node.children.map((child) => render(child, own))}
          </ul>
        )}
      </li>
    );
  }
  return (
    <aside aria-label="Database explorer" id="explorer">
      <div className="explorer-head">
        <div className="eyebrow">Connections</div>
        <button onClick={onAdd}>+ Add connection</button>
      </div>
      <div className="explorer-search">
        <label htmlFor="explorer-search">Find a resource</label>
        <div className="inline">
          <input
            id="explorer-search"
            type="search"
            placeholder="Table, collection, topic…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setMenu(null);
            }}
          />
          <button
            aria-label="Clear explorer search"
            onClick={() => setSearch("")}
          >
            Clear
          </button>
        </div>
      </div>
      <ul
        className="tree"
        role="tree"
        ref={tree}
        aria-label="Connections and database resources"
      >
        {trees.map((root) => render(root))}
      </ul>
      {!visible.length && (
        <p className="muted" role="status">
          No matching resources. Try another name or clear the search.
        </p>
      )}
      <div className="explorer-help">
        <p>
          Click to select or expand. Use <strong>⋯ → Open in Tab</strong> for
          data, or <strong>database ⋯ → New → Query Console</strong>.
        </p>
        <p>
          Use the pencil beside a connection name to review or edit its
          settings.
        </p>
        <p className="draft-label">
          Drafts stay in this window. Reload clears them. Passwords, tokens, and
          HTTP headers are not retained.
        </p>
      </div>
      {menu && (
        <EntityMenu
          menu={menu}
          onClose={() => setMenu(null)}
          onAction={(action) => {
            const node = menu.node;
            setMenu(null);
            onOpen(node, action === "new-console");
          }}
        />
      )}
    </aside>
  );
}

function EntityMenu({
  menu,
  onClose,
  onAction,
}: {
  menu: Menu;
  onClose: () => void;
  onAction: (id: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [submenu, setSubmenu] = useState(false);
  const callbacks = useRef(onClose);
  callbacks.current = onClose;
  useEffect(() => {
    ref.current
      ?.querySelector<HTMLButtonElement>("button:not(:disabled)")
      ?.focus();
    const outside = (event: PointerEvent) => {
      if (
        !ref.current?.contains(event.target as Node) &&
        !menu.anchor.contains(event.target as Node)
      )
        callbacks.current();
    };
    const escape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        callbacks.current();
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
      if (menu.anchor.isConnected) menu.anchor.focus();
    };
  }, [menu.anchor]);
  return (
    <div
      ref={ref}
      role="menu"
      aria-label="Entity actions"
      className="context-menu"
      style={{ left: menu.x, top: menu.y }}
      onKeyDown={(e) => {
        const buttons = [
          ...e.currentTarget.querySelectorAll<HTMLButtonElement>(
            "button:not(:disabled)",
          ),
        ];
        const index = buttons.indexOf(
          document.activeElement as HTMLButtonElement,
        );
        if (["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) {
          e.preventDefault();
          buttons[
            e.key === "Home"
              ? 0
              : e.key === "End"
                ? buttons.length - 1
                : (index + (e.key === "ArrowDown" ? 1 : -1) + buttons.length) %
                  buttons.length
          ]?.focus();
        }
        if (e.key === "Tab") onClose();
      }}
    >
      {menu.node.entity === "database" ? (
        <>
          <button
            role="menuitem"
            aria-haspopup="menu"
            aria-expanded={submenu}
            onClick={() => setSubmenu(!submenu)}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight") {
                e.preventDefault();
                setSubmenu(true);
              }
            }}
          >
            New ▸
          </button>
          {submenu && (
            <div role="menu" aria-label="New">
              <button
                autoFocus
                role="menuitem"
                onClick={() => onAction("new-console")}
              >
                Query Console
              </button>
            </div>
          )}
        </>
      ) : (
        entityActions(menu.node).map((action) => (
          <button
            key={action.id}
            role="menuitem"
            disabled={action.disabled}
            onClick={() => onAction(action.id)}
          >
            {action.label}
          </button>
        ))
      )}
    </div>
  );
}
