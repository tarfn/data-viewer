import { useState } from "react";
import type { KafkaRecord, ValueDetail } from "../types";
import { Modal } from "./Modal";

export function ValueDrawer({
  detail,
  onClose,
  onPublish,
}: {
  detail: ValueDetail;
  onClose: () => void;
  onPublish: (record: KafkaRecord) => void;
}) {
  const [copied, setCopied] = useState("");
  return (
    <Modal title={detail.title} onClose={onClose} drawer>
      <p className="muted detail-source">{detail.source}</p>
      <span className="badge">{detail.type}</span>
      <label className="screen-reader-only" htmlFor="detail-value">
        Full value
      </label>
      <textarea
        id="detail-value"
        readOnly
        value={detail.value}
        spellCheck={false}
      />
      <div className="dialog-actions">
        <button
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(detail.value);
              setCopied("Copied.");
            } catch {
              document
                .querySelector<HTMLTextAreaElement>("#detail-value")
                ?.select();
              setCopied(
                "Clipboard unavailable. Copy the selected text manually.",
              );
            }
          }}
        >
          Copy value
        </button>
        {detail.kafkaRecord && (
          <button onClick={() => onPublish(detail.kafkaRecord!)}>
            Use as publish draft
          </button>
        )}
        <button onClick={onClose}>Done</button>
      </div>
      <p role="status" aria-live="polite">
        {copied}
      </p>
    </Modal>
  );
}
