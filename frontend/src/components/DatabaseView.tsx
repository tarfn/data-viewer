import { lazy, Suspense } from "react";
import type { Draft, ValueDetail, WorkspaceTab } from "../types";
import { sampleData } from "../mock";
const CodeEditor = lazy(() =>
  import("./CodeEditor").then((module) => ({ default: module.CodeEditor })),
);

interface Props {
  tab: WorkspaceTab;
  source: string;
  onDraft: (patch: Partial<Draft>) => void;
  onRun: () => void;
  onCancel: () => void;
  onInspect: (detail: ValueDetail) => void;
}

export function DatabaseView({
  tab,
  source,
  onDraft,
  onRun,
  onCancel,
  onInspect,
}: Props) {
  const mongo = tab.target.kind === "mongo";
  const running = tab.state === "running";
  const payload = tab.results.query?.payload || sampleData(tab.target);
  return (
    <>
      {!tab.console && (
        <div className="switcher" role="group" aria-label="Workspace view">
          <button
            aria-pressed={tab.draft.view === "data"}
            onClick={() => onDraft({ view: "data" })}
          >
            Data
          </button>
          <button
            aria-pressed={tab.draft.view === "structure"}
            onClick={() => onDraft({ view: "structure" })}
          >
            {mongo ? "Sampled fields" : "Structure"}
          </button>
        </div>
      )}
      {tab.draft.view === "structure" && !tab.console ? (
        <Structure tab={tab} />
      ) : (
        <>
          <section className="card" aria-label="Query workspace">
            <div className="card-head">
              <strong>
                {tab.console
                  ? mongo
                    ? "MongoDB command editor"
                    : "SQL editor"
                  : mongo
                    ? "Filter documents"
                    : "Filter rows"}
              </strong>
              <span className="muted">
                {tab.console
                  ? "Ctrl / ⌘ + Enter to simulate"
                  : "Enter to apply filter"}
              </span>
            </div>
            <div className="editor">
              {tab.console ? (
                <>
                  <label>{mongo ? "Native command JSON" : "Statement"}</label>
                  <Suspense fallback={<p className="muted">Loading editor…</p>}>
                    <CodeEditor
                      value={tab.draft.query}
                      language={mongo ? "json" : "sql"}
                      onChange={(query) => onDraft({ query })}
                      onRun={onRun}
                    />
                  </Suspense>
                  <p className="muted">
                    {mongo
                      ? "JSON only, not mongosh or JavaScript. Production commands require a supported-command contract."
                      : "Free-form SQL in a separate database-bound console."}{" "}
                    Editor suggestions use fixture metadata only.
                  </p>
                </>
              ) : (
                <>
                  <label htmlFor="resource-filter">
                    {mongo
                      ? "Filter documents (JSON object)"
                      : "Filter rows (SQL WHERE expression)"}
                  </label>
                  <input
                    id="resource-filter"
                    type="text"
                    spellCheck={false}
                    placeholder={
                      mongo
                        ? '{ "active": true }'
                        : "e.g. id > 10 AND name LIKE 'A%'"
                    }
                    value={tab.draft.filter}
                    onChange={(e) => onDraft({ filter: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        onRun();
                      }
                    }}
                  />
                  <p className="muted">
                    Applies to this resource only. For a free query, use its
                    database’s ⋯ → New → Query Console.
                  </p>
                  {mongo && (
                    <details>
                      <summary>Find options</summary>
                      <div className="fields">
                        <div>
                          <label htmlFor="find-projection">
                            Projection (JSON object)
                          </label>
                          <textarea
                            id="find-projection"
                            value={tab.draft.projection}
                            onChange={(e) =>
                              onDraft({ projection: e.target.value })
                            }
                          />
                        </div>
                        <div>
                          <label htmlFor="find-sort">
                            Sort (ordered JSON pairs)
                          </label>
                          <textarea
                            id="find-sort"
                            value={tab.draft.sort}
                            onChange={(e) => onDraft({ sort: e.target.value })}
                          />
                        </div>
                        <div>
                          <label htmlFor="find-limit">Maximum documents</label>
                          <input
                            id="find-limit"
                            type="number"
                            min="1"
                            max="500"
                            value={tab.draft.limit}
                            onChange={(e) =>
                              onDraft({ limit: Number(e.target.value) })
                            }
                          />
                        </div>
                      </div>
                    </details>
                  )}
                </>
              )}
            </div>
            <div className="toolbar">
              <button className="primary" disabled={running} onClick={onRun}>
                {tab.console ? "Simulate Run" : "Simulate Apply"}
              </button>
              <button disabled={!running} onClick={onCancel}>
                Cancel
              </button>
              <span className="muted">
                Preview: {tab.draft.limit} · proposed timeout: 30s
              </span>
            </div>
          </section>
          <section className="card" aria-label="Query results">
            <div className="card-head">
              <strong>Results</strong>
              <span
                role="status"
                aria-live="polite"
                className={tab.state === "failed" ? "error-text" : ""}
              >
                {tab.message}
              </span>
            </div>
            {payload.type === "sql" && (
              <div className="scroll">
                <table>
                  <thead>
                    <tr>
                      {payload.columns.map((column, index) => (
                        <th key={index}>{column}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {payload.rows.map((row, index) => (
                      <tr key={index}>
                        {row.map((cell, col) => (
                          <td key={col}>
                            <button
                              className={
                                "cell-value" +
                                (cell.text === null ? " null-value" : "")
                              }
                              aria-label={
                                "Inspect " +
                                payload.columns[col] +
                                ", row " +
                                (index + 1)
                              }
                              onClick={() =>
                                onInspect({
                                  title: payload.columns[col].split(" · ")[0],
                                  type: cell.text === null ? "NULL" : cell.type,
                                  value: cell.text ?? "NULL",
                                  source,
                                })
                              }
                            >
                              {cell.text ?? "NULL"}
                            </button>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {payload.type === "documents" &&
              payload.documents.map((doc, index) => (
                <div key={index}>
                  <pre>{doc}</pre>
                  <button
                    className="payload-open"
                    onClick={() =>
                      onInspect({
                        title: "Document details",
                        type: "MongoDB Extended JSON",
                        value: doc,
                        source,
                      })
                    }
                  >
                    Inspect document
                  </button>
                </div>
              ))}
            <p className="hint">
              Fixed fictional output. Filters and queries are validated locally
              where supported; they are not executed. Select a value to inspect
              its type and full contents.
            </p>
          </section>
        </>
      )}
    </>
  );
}

function Structure({ tab }: { tab: WorkspaceTab }) {
  const mongo = tab.target.kind === "mongo";
  const rows = mongo
    ? [
        ["_id", "ObjectID", "1 / 1"],
        ["name", "string", "1 / 1"],
        ["active", "boolean", "1 / 1"],
        ["joinedAt", "date", "1 / 1"],
        ["balance", "decimal128", "1 / 1"],
      ]
    : tab.target.name === "orders"
      ? [
          ["id", "int8", "Primary"],
          ["user_id", "int8", "Foreign → users.id"],
          ["total", "numeric", "—"],
        ]
      : [
          ["id", "int8", "Primary"],
          ["name", "text", "—"],
          ["email", "text · nullable", "—"],
        ];
  return (
    <section className="card" aria-label="Resource structure">
      <div className="card-head">
        <strong>{mongo ? "Sampled fields" : "Columns and keys"}</strong>
        <span className="muted">Illustrative metadata</span>
      </div>
      {mongo && (
        <p className="hint">
          Observed in 1 sample document. Other fields and types may exist; this
          is not a guaranteed schema.
        </p>
      )}
      <div className="scroll">
        <table>
          <thead>
            <tr>
              {(mongo
                ? ["Observed path", "Observed types", "Present in sample"]
                : ["Column", "Type", "Key"]
              ).map((label) => (
                <th key={label}>{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row[0]}>
                {row.map((value, index) => (
                  <td key={index}>{value}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
