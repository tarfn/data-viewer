import { useState } from "react";
import { effectiveURL } from "../mock";
import type { Draft, ValueDetail, WorkspaceTab } from "../types";

interface Props {
  tab: WorkspaceTab;
  onDraft: (patch: Partial<Draft>) => void;
  onRun: () => void;
  onCancel: () => void;
  onInspect: (detail: ValueDetail) => void;
}

export function HttpView({ tab, onDraft, onRun, onCancel, onInspect }: Props) {
  // These explicit credential/header fields never enter tab drafts or mock requests.
  const [headers, setHeaders] = useState("Accept: application/json");
  const [auth, setAuth] = useState("none");
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const d = tab.draft;
  const running = tab.state === "running";
  const response = tab.results.http?.payload;
  let finalURL = "";
  try {
    finalURL = effectiveURL(d);
  } catch (error) {
    finalURL = error instanceof Error ? error.message : "Invalid URL";
  }
  function send() {
    if (
      headers
        .split("\n")
        .some((line) => line.trim() && !/^[!#$%&'*+.^_`|~\w-]+\s*:/.test(line))
    ) {
      setError("Use name: value for each header.");
      return;
    }
    if (auth === "bearer" && !token.trim()) {
      setError("Enter a fictional token, or choose No auth.");
      return;
    }
    setError("");
    onRun();
  }
  return (
    <section aria-label="HTTP workspace">
      <p className="hint future-hint">
        HTTP · future integration. Send displays a fictional response; no
        network request is made.
      </p>
      <section className="card">
        <div className="card-head">
          <strong>Request builder</strong>
          <span className="muted">API profile · no persistent connection</span>
        </div>
        <div className="panel-pad inline">
          <label htmlFor="http-method">Method</label>
          <select
            id="http-method"
            value={d.method}
            onChange={(e) => onDraft({ method: e.target.value })}
          >
            {["GET", "POST", "PUT", "PATCH", "DELETE"].map((method) => (
              <option key={method}>{method}</option>
            ))}
          </select>
          <label htmlFor="http-url">URL</label>
          <input
            id="http-url"
            className="request-url"
            type="url"
            value={d.url}
            onChange={(e) => onDraft({ url: e.target.value })}
          />
          <button className="primary" disabled={running} onClick={send}>
            Simulate Send
          </button>
          <button disabled={!running} onClick={onCancel}>
            Cancel
          </button>
        </div>
        <div className="subnav" role="group" aria-label="Request settings">
          {(["params", "headers", "auth", "body"] as const).map((view) => (
            <button
              key={view}
              aria-pressed={d.requestView === view}
              onClick={() => onDraft({ requestView: view })}
            >
              {view === "auth"
                ? "Authorization"
                : view[0].toUpperCase() + view.slice(1)}
            </button>
          ))}
        </div>
        <div className="panel-pad">
          {d.requestView === "params" && (
            <>
              <label htmlFor="http-params">
                Query parameters (name=value, one per line)
              </label>
              <textarea
                id="http-params"
                placeholder="limit=100"
                value={d.params}
                onChange={(e) => onDraft({ params: e.target.value })}
              />
              <p className="muted">
                Duplicate names are preserved; the encoded target is shown
                below.
              </p>
            </>
          )}
          {d.requestView === "headers" && (
            <>
              <label htmlFor="http-headers">
                Headers (name: value, one per line)
              </label>
              <textarea
                id="http-headers"
                value={headers}
                onChange={(e) => setHeaders(e.target.value)}
              />
              <p className="muted">
                Resets when you leave this tab. Use fictional values only.
              </p>
            </>
          )}
          {d.requestView === "auth" && (
            <>
              <label htmlFor="http-auth">Authentication</label>
              <select
                id="http-auth"
                value={auth}
                onChange={(e) => {
                  setAuth(e.target.value);
                  setToken("");
                }}
              >
                <option value="none">No auth</option>
                <option value="bearer">Bearer token</option>
              </select>
              {auth === "bearer" && (
                <div className="field">
                  <label htmlFor="http-token">Token · not retained</label>
                  <input
                    id="http-token"
                    type="password"
                    autoComplete="off"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                  />
                </div>
              )}
            </>
          )}
          {d.requestView === "body" && (
            <>
              <label htmlFor="http-body">Raw JSON body</label>
              <textarea
                id="http-body"
                value={d.body}
                disabled={!["POST", "PUT", "PATCH"].includes(d.method)}
                onChange={(e) => onDraft({ body: e.target.value })}
              />
              <p className="muted">
                Body enabled for POST, PUT, and PATCH in this preview.
              </p>
            </>
          )}
        </div>
        <p className="hint">Target: {finalURL}</p>
        {error && (
          <p className="error-text panel-pad" role="alert">
            {error}
          </p>
        )}
      </section>
      <section className="card">
        <div className="card-head">
          <strong>Response</strong>
          <span role="status" aria-live="polite">
            {tab.message === "Sample output · not executed"
              ? "Not sent"
              : tab.message}
          </span>
          <button
            disabled={response?.type !== "http"}
            onClick={() => {
              if (response?.type === "http")
                onInspect({
                  title: "HTTP response",
                  type: "JSON response · " + response.status,
                  value: response.body,
                  source: response.method + " " + response.url,
                });
            }}
          >
            Inspect response
          </button>
        </div>
        <div className="subnav" role="group" aria-label="Response view">
          {(["body", "headers"] as const).map((view) => (
            <button
              key={view}
              aria-pressed={d.responseView === view}
              onClick={() => onDraft({ responseView: view })}
            >
              {view === "body" ? "Body" : "Headers"}
            </button>
          ))}
        </div>
        {response?.type === "http" && (
          <p className="hint">
            {response.status} OK · {response.method} {response.url} · simulated
          </p>
        )}
        <pre>
          {response?.type === "http"
            ? response[d.responseView]
            : "Send a simulated request to see an example response."}
        </pre>
      </section>
    </section>
  );
}
