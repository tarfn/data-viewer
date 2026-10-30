import { useEffect, useReducer, useRef } from "react";
import { defaultDraft, simulate, validateRun } from "./mock";
import { resourceKey, targetName } from "./integrations";
import type {
  Draft,
  Payload,
  ResultSnapshot,
  RunAction,
  Target,
  WorkspaceTab,
} from "./types";

export interface WorkspaceState {
  tabs: WorkspaceTab[];
  activeId: string | null;
  drafts: Record<string, Draft>;
}
export type WorkspaceAction =
  | { type: "open"; tab: WorkspaceTab }
  | { type: "activate"; id: string }
  | { type: "draft"; id: string; patch: Partial<Draft> }
  | { type: "start"; id: string; requestId: string }
  | { type: "finish"; id: string; requestId: string; result: ResultSnapshot }
  | { type: "cancel"; id: string }
  | { type: "error"; id: string; message: string }
  | { type: "close"; id: string }
  | { type: "close-all" };

export function makeTab(
  target: Target,
  consoleTab = false,
  title?: string,
): WorkspaceTab {
  return {
    id: crypto.randomUUID(),
    target: { ...target },
    console: consoleTab,
    title: title || targetName(target),
    draft: defaultDraft(target, consoleTab),
    state: "idle",
    message: "Sample output · not executed",
    results: {},
  };
}

export function workspaceReducer(
  state: WorkspaceState,
  action: WorkspaceAction,
): WorkspaceState {
  if (action.type === "open") {
    const match =
      !action.tab.console &&
      state.tabs.find(
        (tab) =>
          !tab.console &&
          resourceKey(tab.target) === resourceKey(action.tab.target),
      );
    if (match) return { ...state, activeId: match.id };
    const tab = action.tab;
    const draft = !tab.console && state.drafts[resourceKey(tab.target)];
    return {
      ...state,
      tabs: [...state.tabs, draft ? { ...tab, draft } : tab],
      activeId: tab.id,
    };
  }
  if (action.type === "activate")
    return state.tabs.some((tab) => tab.id === action.id)
      ? { ...state, activeId: action.id }
      : state;
  if (action.type === "close" || action.type === "close-all") {
    const removed = state.tabs.filter(
      (tab) => action.type === "close-all" || tab.id === action.id,
    );
    const drafts = { ...state.drafts };
    removed.forEach((tab) => {
      if (!tab.console) drafts[resourceKey(tab.target)] = { ...tab.draft };
    });
    const tabs = state.tabs.filter((tab) => !removed.includes(tab));
    const index = state.tabs.findIndex((tab) => tab.id === state.activeId);
    return {
      tabs,
      drafts,
      activeId: tabs.some((tab) => tab.id === state.activeId)
        ? state.activeId
        : (tabs[Math.min(index, tabs.length - 1)]?.id ?? null),
    };
  }
  return {
    ...state,
    tabs: state.tabs.map((tab) => {
      if (tab.id !== action.id) return tab;
      if (action.type === "draft")
        return { ...tab, draft: { ...tab.draft, ...action.patch } };
      if (action.type === "start")
        return {
          ...tab,
          state: "running",
          requestId: action.requestId,
          message: "Simulation running · previous sample remains below",
        };
      if (action.type === "finish") {
        if (
          tab.requestId !== action.requestId ||
          action.result.requestId !== action.requestId ||
          tab.state !== "running" ||
          resourceKey(tab.target) !== resourceKey(action.result.target)
        )
          return tab;
        return {
          ...tab,
          state: "succeeded",
          message: "Simulation complete · fixed sample data",
          results: { ...tab.results, [action.result.action]: action.result },
        };
      }
      if (action.type === "cancel")
        return {
          ...tab,
          state: "canceled",
          requestId: undefined,
          message: "Simulation canceled · no external request was sent",
        };
      if (action.type === "error")
        return { ...tab, state: "failed", message: action.message };
      return tab;
    }),
  };
}

export function useWorkspace(initialTarget: Target) {
  const [state, dispatch] = useReducer(
    workspaceReducer,
    initialTarget,
    (target) => {
      const tab = makeTab(target);
      return { tabs: [tab], activeId: tab.id, drafts: {} };
    },
  );
  const pending = useRef(
    new Map<string, { id: string; controller: AbortController }>(),
  );
  const sequence = useRef(0);
  useEffect(() => {
    const jobs = pending.current;
    return () => {
      jobs.forEach((job) => job.controller.abort());
      jobs.clear();
    };
  }, []);

  const cancel = (id: string) => {
    pending.current.get(id)?.controller.abort();
    pending.current.delete(id);
    dispatch({ type: "cancel", id });
  };
  const leave = () => {
    const tab = state.tabs.find((tab) => tab.id === state.activeId);
    if (
      tab &&
      ["kafka", "http"].includes(tab.target.kind) &&
      pending.current.has(tab.id)
    )
      cancel(tab.id);
  };
  const run = (tab: WorkspaceTab, action: RunAction) => {
    if (pending.current.has(tab.id)) return;
    try {
      validateRun(tab.target, tab.draft, action, tab.console);
    } catch (error) {
      dispatch({
        type: "error",
        id: tab.id,
        message: error instanceof Error ? error.message : "Invalid input",
      });
      return;
    }
    const id = crypto.randomUUID();
    const controller = new AbortController();
    pending.current.set(tab.id, { id, controller });
    dispatch({ type: "start", id: tab.id, requestId: id });
    const target = { ...tab.target };
    const draft = { ...tab.draft };
    simulate(target, draft, action, controller.signal)
      .then((payload: Payload) => {
        if (pending.current.get(tab.id)?.id !== id) return;
        dispatch({
          type: "finish",
          id: tab.id,
          requestId: id,
          result: { requestId: id, target, action, payload },
        });
      })
      .catch((error) => {
        if (
          pending.current.get(tab.id)?.id === id &&
          error.name !== "AbortError"
        )
          dispatch({
            type: "error",
            id: tab.id,
            message: "Simulation failed.",
          });
      })
      .finally(() => {
        if (pending.current.get(tab.id)?.id === id)
          pending.current.delete(tab.id);
      });
  };
  return {
    ...state,
    active: state.tabs.find((tab) => tab.id === state.activeId),
    run,
    cancel,
    edit: (id: string, patch: Partial<Draft>) =>
      dispatch({ type: "draft", id, patch }),
    open: (target: Target, consoleTab = false) => {
      leave();
      const tab = makeTab(
        target,
        consoleTab,
        consoleTab ? "Query Console " + ++sequence.current : undefined,
      );
      const existing =
        !consoleTab &&
        state.tabs.find(
          (item) =>
            !item.console && resourceKey(item.target) === resourceKey(target),
        );
      dispatch({ type: "open", tab });
      return existing ? existing.id : tab.id;
    },
    activate: (id: string) => {
      if (state.activeId !== id) leave();
      dispatch({ type: "activate", id });
    },
    close: (id: string) => {
      pending.current.get(id)?.controller.abort();
      pending.current.delete(id);
      dispatch({ type: "close", id });
    },
    closeAll: () => {
      pending.current.forEach((job) => job.controller.abort());
      pending.current.clear();
      dispatch({ type: "close-all" });
    },
  };
}
