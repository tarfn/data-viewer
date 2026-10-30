import type { Draft, RunAction, ValueDetail, WorkspaceTab } from "../types";

interface Props {
  tab: WorkspaceTab;
  source: string;
  onDraft: (patch: Partial<Draft>) => void;
  onRun: (action: RunAction) => void;
  onCancel: () => void;
  onInspect: (detail: ValueDetail) => void;
}

export function KafkaView({
  tab,
  source,
  onDraft,
  onRun,
  onCancel,
  onInspect,
}: Props) {
  const d = tab.draft;
  const running = tab.state === "running";
  const messages = tab.results.consume?.payload;
  const receipt = tab.results.publish?.payload;
  return (
    <section aria-label="Kafka workspace">
      <p className="hint future-hint">
        Kafka · future integration. Brokers, messages, and acknowledgements here
        are fictional.
      </p>
      <div className="switcher" role="group" aria-label="Kafka action">
        {(["consume", "publish"] as const).map((view) => (
          <button
            key={view}
            aria-pressed={d.kafkaView === view}
            onClick={() => {
              if (running) onCancel();
              onDraft({ kafkaView: view });
            }}
          >
            {view === "consume" ? "Consume" : "Publish"}
          </button>
        ))}
      </div>
      {d.kafkaView === "consume" ? (
        <>
          <section className="card">
            <div className="card-head">
              <strong>Browse topic messages</strong>
              <span className="muted">
                Inspection only · no group offset commits
              </span>
            </div>
            <div className="fields">
              <div>
                <label htmlFor="kafka-partition">Partition</label>
                <select
                  id="kafka-partition"
                  value={d.partition}
                  onChange={(e) => onDraft({ partition: e.target.value })}
                >
                  <option value="all">All partitions</option>
                  <option value="0">Partition 0</option>
                  <option value="1">Partition 1</option>
                </select>
              </div>
              <div>
                <label htmlFor="kafka-start">Start position</label>
                <select
                  id="kafka-start"
                  value={d.start}
                  onChange={(e) => onDraft({ start: e.target.value })}
                >
                  <option value="latest">Latest</option>
                  <option value="earliest">Earliest available</option>
                  <option value="offset">
                    Specific offset (one partition)
                  </option>
                </select>
              </div>
              {d.start === "offset" && (
                <div>
                  <label htmlFor="kafka-offset">Offset</label>
                  <input
                    id="kafka-offset"
                    inputMode="numeric"
                    value={d.offset}
                    onChange={(e) => onDraft({ offset: e.target.value })}
                  />
                </div>
              )}
              <div>
                <label htmlFor="kafka-limit">Maximum messages</label>
                <input
                  id="kafka-limit"
                  type="number"
                  min="1"
                  max="500"
                  value={d.limit}
                  onChange={(e) => onDraft({ limit: Number(e.target.value) })}
                />
              </div>
              <div>
                <label htmlFor="kafka-duration">
                  Maximum duration (seconds)
                </label>
                <input
                  id="kafka-duration"
                  type="number"
                  min="1"
                  max="60"
                  value={d.duration}
                  onChange={(e) =>
                    onDraft({ duration: Number(e.target.value) })
                  }
                />
              </div>
            </div>
            <div className="toolbar">
              <button
                className="primary"
                disabled={running}
                onClick={() => onRun("consume")}
              >
                Simulate consume
              </button>
              <button disabled={!running} onClick={onCancel}>
                Stop
              </button>
              <span className="muted">Proposed 10 MiB bounded buffer</span>
            </div>
          </section>
          <section className="card">
            <div className="card-head">
              <strong>Messages</strong>
              <span role="status" aria-live="polite">
                {tab.message === "Sample output · not executed"
                  ? "Idle · choose a start position"
                  : tab.message}
              </span>
            </div>
            {messages?.type === "messages" ? (
              <div className="scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Partition</th>
                      <th>Offset</th>
                      <th>Key</th>
                      <th>Value preview</th>
                    </tr>
                  </thead>
                  <tbody>
                    {messages.records.map((record, index) => (
                      <tr key={index}>
                        <td>{record.partition}</td>
                        <td>{record.offset}</td>
                        <td>{record.key}</td>
                        <td>
                          <button
                            className="cell-value"
                            onClick={() =>
                              onInspect({
                                title: "Kafka message",
                                type: "Kafka record",
                                value: JSON.stringify(record, null, 2),
                                source,
                                kafkaRecord: record,
                              })
                            }
                          >
                            {record.value}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty">
                No messages sampled. Start a bounded inspection to see sample
                records.
              </div>
            )}
          </section>
        </>
      ) : (
        <section className="card" aria-label="Publish Kafka message">
          <div className="card-head">
            <strong>Publish a message</strong>
            <span className="muted">Producer · one record per action</span>
          </div>
          <p className="hint">Target topic: {tab.target.name}</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onRun("publish");
            }}
          >
            <div className="fields">
              <div>
                <label htmlFor="publish-partition">Partition</label>
                <select
                  id="publish-partition"
                  value={d.publishPartition}
                  onChange={(e) =>
                    onDraft({ publishPartition: e.target.value })
                  }
                >
                  <option value="auto">Automatic (producer routing)</option>
                  <option value="0">Partition 0</option>
                  <option value="1">Partition 1</option>
                </select>
              </div>
              <div>
                <label htmlFor="publish-format">Payload format</label>
                <select
                  id="publish-format"
                  value={d.format}
                  onChange={(e) =>
                    onDraft({ format: e.target.value as Draft["format"] })
                  }
                >
                  <option value="json">JSON</option>
                  <option value="text">Text</option>
                </select>
              </div>
              <div className="wide">
                <label htmlFor="produce-key">Key (optional)</label>
                <input
                  id="produce-key"
                  value={d.key}
                  onChange={(e) => onDraft({ key: e.target.value })}
                />
              </div>
              <div className="wide">
                <label htmlFor="publish-headers">
                  Headers (ordered JSON array; duplicate keys allowed)
                </label>
                <textarea
                  id="publish-headers"
                  value={d.headers}
                  onChange={(e) => onDraft({ headers: e.target.value })}
                />
              </div>
              <div className="wide">
                <label htmlFor="produce-value">
                  {d.format === "json" ? "JSON payload" : "Text payload"}
                </label>
                <textarea
                  id="produce-value"
                  value={d.payload}
                  onChange={(e) => onDraft({ payload: e.target.value })}
                />
              </div>
            </div>
            <div className="toolbar">
              <button className="primary" type="submit" disabled={running}>
                Simulate Publish
              </button>
              <button type="button" disabled={!running} onClick={onCancel}>
                Cancel simulation
              </button>
              <span className="muted">Demo only · 1 MiB record cap</span>
            </div>
          </form>
          <div className="card-head">
            <strong>Publish result</strong>
            <span role="status" aria-live="polite">
              {tab.message}
            </span>
          </div>
          <pre>
            {receipt?.type === "receipt"
              ? JSON.stringify(receipt, null, 2)
              : "Publish to see a simulated topic, partition, and offset acknowledgement."}
          </pre>
          <p className="hint">
            No broker request is sent. Real delivery/cancellation semantics are
            deferred.
          </p>
        </section>
      )}
    </section>
  );
}
