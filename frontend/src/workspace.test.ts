import { describe, expect, it } from "vitest";
import { createTree, initialProfiles, resourceKey } from "./integrations";
import { makeTab, workspaceReducer, type WorkspaceState } from "./workspace";
import { sampleData } from "./mock";

const target = createTree(initialProfiles[0]).children![0].children![0]
  .children![0].target!;
const empty = (): WorkspaceState => ({ tabs: [], activeId: null, drafts: {} });

describe("workspace identity and request ownership", () => {
  it("reuses a resource tab but keeps separate sessions and new consoles independent", () => {
    const tab = makeTab(target);
    let state = workspaceReducer(empty(), { type: "open", tab });
    state = workspaceReducer(state, { type: "open", tab: makeTab(target) });
    expect(state.tabs).toHaveLength(1);
    state = workspaceReducer(state, {
      type: "open",
      tab: makeTab({ ...target, sessionId: "another-session" }),
    });
    const first = makeTab(target, true);
    const second = makeTab(target, true);
    state = workspaceReducer(state, { type: "open", tab: first });
    state = workspaceReducer(state, { type: "open", tab: second });
    state = workspaceReducer(state, {
      type: "draft",
      id: first.id,
      patch: { query: "SELECT 42" },
    });
    expect(state.tabs).toHaveLength(4);
    expect(
      state.tabs.find((tab) => tab.id === second.id)?.draft.query,
    ).not.toBe("SELECT 42");
  });

  it("routes background completion by request, rejects superseded or wrong-target output", () => {
    const first = makeTab(target, true);
    const second = makeTab(target, true);
    let state = workspaceReducer(empty(), { type: "open", tab: first });
    state = workspaceReducer(state, {
      type: "start",
      id: first.id,
      requestId: "new-run",
    });
    state = workspaceReducer(state, { type: "open", tab: second });
    const result = {
      requestId: "old-run",
      target,
      action: "query" as const,
      payload: sampleData(target),
    };
    state = workspaceReducer(state, {
      type: "finish",
      id: first.id,
      requestId: "old-run",
      result,
    });
    expect(state.tabs[0].state).toBe("running");
    state = workspaceReducer(state, {
      type: "finish",
      id: first.id,
      requestId: "new-run",
      result: {
        ...result,
        requestId: "new-run",
        target: { ...target, database: "wrong" },
      },
    });
    expect(state.tabs[0].state).toBe("running");
    state = workspaceReducer(state, {
      type: "finish",
      id: first.id,
      requestId: "new-run",
      result: { ...result, requestId: "new-run" },
    });
    expect(state.activeId).toBe(second.id);
    expect(state.tabs[0].state).toBe("succeeded");
    expect(state.tabs[1].results.query).toBeUndefined();
  });

  it("closing all keeps an empty workspace after late results and retains only resource drafts", () => {
    const resource = makeTab(target);
    const consoleTab = makeTab(target, true);
    let state = workspaceReducer(empty(), { type: "open", tab: resource });
    state = workspaceReducer(state, {
      type: "draft",
      id: resource.id,
      patch: { filter: "id > 8" },
    });
    state = workspaceReducer(state, { type: "open", tab: consoleTab });
    state = workspaceReducer(state, {
      type: "start",
      id: consoleTab.id,
      requestId: "pending",
    });
    state = workspaceReducer(state, { type: "close-all" });
    state = workspaceReducer(state, {
      type: "finish",
      id: consoleTab.id,
      requestId: "pending",
      result: {
        requestId: "pending",
        target,
        action: "query",
        payload: sampleData(target),
      },
    });
    expect(state.tabs).toHaveLength(0);
    expect(state.activeId).toBeNull();
    expect(Object.keys(state.drafts)).toEqual([resourceKey(target)]);
    state = workspaceReducer(state, { type: "open", tab: makeTab(target) });
    expect(state.tabs[0].draft.filter).toBe("id > 8");
  });

  it("cancellation prevents matching late success from replacing its outcome", () => {
    const tab = makeTab(target);
    let state = workspaceReducer(empty(), { type: "open", tab });
    state = workspaceReducer(state, {
      type: "start",
      id: tab.id,
      requestId: "pending",
    });
    state = workspaceReducer(state, { type: "cancel", id: tab.id });
    state = workspaceReducer(state, {
      type: "finish",
      id: tab.id,
      requestId: "pending",
      result: {
        requestId: "pending",
        target,
        action: "query",
        payload: sampleData(target),
      },
    });
    expect(state.tabs[0].state).toBe("canceled");
    expect(state.tabs[0].results.query).toBeUndefined();
  });
});
