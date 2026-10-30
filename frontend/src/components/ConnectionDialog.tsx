import { useState, type FormEvent } from "react";
import { cleanSettings, defaults, integrations } from "../integrations";
import type { IntegrationKind, Profile } from "../types";
import { Icon } from "./Icon";
import { Modal } from "./Modal";

interface Props {
  profile?: Profile;
  onClose: () => void;
  onSave: (profile: Profile) => void;
}

export function ConnectionDialog({ profile, onClose, onSave }: Props) {
  const [kind, setKind] = useState<IntegrationKind | undefined>(profile?.kind);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const chosen = integrations.find((entry) => entry.id === kind);
  const visible = integrations.filter(
    (entry) =>
      (category === "all" || category === entry.category) &&
      [entry.name, entry.description, ...entry.capabilities]
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase().trim()),
  );
  return (
    <Modal
      title={
        chosen
          ? `${profile ? "Edit" : "Configure"} ${chosen.name} connection`
          : "Add connection"
      }
      onClose={onClose}
    >
      <p className="muted">
        UI preview only. No connection is verified. Settings stay in this
        window; passwords are discarded.
      </p>
      {!chosen ? (
        <section aria-label="Choose an integration">
          <div className="catalog-controls">
            <div>
              <label htmlFor="integration-search">Find an integration</label>
              <input
                data-autofocus
                id="integration-search"
                type="search"
                placeholder="Search name or capability…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    document
                      .querySelector<HTMLButtonElement>(".integration-option")
                      ?.focus();
                  }
                }}
              />
            </div>
            <div>
              <label htmlFor="integration-category">Category</label>
              <select
                id="integration-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="all">All categories</option>
                {[...new Set(integrations.map((entry) => entry.category))].map(
                  (cat) => (
                    <option key={cat} value={cat}>
                      {cat === "database"
                        ? "Databases"
                        : cat === "api"
                          ? "APIs"
                          : "Messaging"}
                    </option>
                  ),
                )}
              </select>
            </div>
          </div>
          <p className="muted" role="status">
            {visible.length} integrations
          </p>
          <ul
            className="integration-list"
            aria-label="Available integrations"
            onKeyDown={(e) => {
              if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key))
                return;
              const buttons = [
                ...e.currentTarget.querySelectorAll<HTMLButtonElement>(
                  "button",
                ),
              ];
              const index = buttons.indexOf(
                document.activeElement as HTMLButtonElement,
              );
              const next =
                e.key === "Home"
                  ? 0
                  : e.key === "End"
                    ? buttons.length - 1
                    : (index +
                        (e.key === "ArrowDown" ? 1 : -1) +
                        buttons.length) %
                      buttons.length;
              e.preventDefault();
              buttons[next]?.focus();
            }}
          >
            {visible.map((entry) => (
              <li key={entry.id}>
                <button
                  className="integration-option"
                  onClick={() => setKind(entry.id)}
                >
                  <strong>
                    <span className="integration-identity">
                      <Icon name={entry.id} />
                      {entry.name}
                    </span>
                    <span className="integration-stage">{entry.stage}</span>
                  </strong>
                  <small>{entry.description}</small>
                </button>
              </li>
            ))}
          </ul>
          {!visible.length && (
            <p className="empty">
              No matching integrations. Try another name or category.
            </p>
          )}
        </section>
      ) : (
        <>
          <div className="integration-summary">
            <strong className="integration-identity">
              <Icon name={chosen.id} />
              {chosen.name} · {chosen.stage}
            </strong>
            {!profile && (
              <button onClick={() => setKind(undefined)}>
                ← Back to integrations
              </button>
            )}
          </div>
          <ConnectionForm
            key={chosen.id}
            kind={chosen.id}
            profile={profile}
            onSave={onSave}
            onClose={onClose}
          />
        </>
      )}
    </Modal>
  );
}

function ConnectionForm({
  kind,
  profile,
  onSave,
  onClose,
}: Props & { kind: IntegrationKind }) {
  const [name, setName] = useState(
    profile?.name ||
      "New " + integrations.find((entry) => entry.id === kind)!.name,
  );
  const [form, setForm] = useState<Record<string, string>>({
    ...defaults[kind],
    ...profile?.settings,
    password: "",
  });
  const [showURI, setShowURI] = useState(false);
  const [feedback, setFeedback] = useState(
    "No connectivity test performed. Use fictional credentials only.",
  );
  function input(key: string, value: string) {
    setForm((current) => ({
      ...current,
      [key]: value,
      ...(key === "security" && value !== "SASL_SSL"
        ? { password: "", username: "" }
        : {}),
    }));
  }
  const field = (
    key: string,
    label: string,
    opts: {
      type?: string;
      required?: boolean;
      min?: number;
      max?: number;
    } = {},
  ) => (
    <div key={key}>
      <label htmlFor={"conn-" + key}>{label}</label>
      <input
        id={"conn-" + key}
        type={opts.type || "text"}
        value={form[key] || ""}
        onChange={(e) => input(key, e.target.value)}
        autoComplete="off"
        {...opts}
      />
    </div>
  );
  const select = (key: string, label: string, options: string[][]) => (
    <div>
      <label htmlFor={"conn-" + key}>{label}</label>
      <select
        id={"conn-" + key}
        value={form[key]}
        onChange={(e) => input(key, e.target.value)}
      >
        {options.map(([value, text]) => (
          <option key={value} value={value}>
            {text || value}
          </option>
        ))}
      </select>
    </div>
  );
  function validate() {
    if (!name.trim()) throw new Error("Enter a profile name.");
    return cleanSettings(kind, form);
  }
  function save(event: FormEvent) {
    event.preventDefault();
    try {
      const settings = validate();
      const changed =
        JSON.stringify(settings) !== JSON.stringify(profile?.settings);
      onSave({
        id: profile?.id || crypto.randomUUID(),
        kind,
        name: name.trim(),
        settings,
        revision: (profile?.revision || 0) + (changed ? 1 : 0),
      });
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Invalid settings");
    }
  }
  return (
    <form onSubmit={save}>
      <p className="muted">
        {profile
          ? "Saving updates this profile only. Current sample resources and tab targets stay unchanged; no reconnect occurs."
          : "Adding a profile creates sample resources without opening a tab."}
      </p>
      <div className="field">
        <label htmlFor="profile-name">Profile name</label>
        <input
          data-autofocus
          autoFocus
          id="profile-name"
          required
          maxLength={80}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      {kind === "postgres" && (
        <div className="fields">
          {field("host", "Host", { required: true })}
          {field("port", "Port", {
            type: "number",
            min: 1,
            max: 65535,
            required: true,
          })}
          {field("database", "Database", { required: true })}
          {field("username", "Username", { required: true })}
          {field("password", "Password · not retained", { type: "password" })}
          {select("tls", "TLS mode", [
            ["verify-full"],
            ["verify-ca"],
            ["require"],
            ["disable", "Disable (local development)"],
          ])}
        </div>
      )}
      {kind === "mongo" && (
        <>
          <div className="field">
            {field("uri", "MongoDB URI · may contain credentials", {
              type: showURI ? "text" : "password",
              required: true,
            })}
            <button
              type="button"
              aria-pressed={showURI}
              onClick={() => setShowURI(!showURI)}
            >
              {showURI ? "Hide URI" : "Show URI"}
            </button>
            <p className="muted">
              Saved demo metadata removes URI credentials and unsupported query
              options. This is not a full MongoDB URI parser.
            </p>
          </div>
          <div className="field">
            {field("database", "Initial database", { required: true })}
          </div>
        </>
      )}
      {kind === "kafka" && (
        <>
          <div className="field">
            {field("brokers", "Bootstrap servers (comma separated)", {
              required: true,
            })}
          </div>
          <div className="fields">
            {select("security", "Security", [
              ["SASL_SSL", "SASL + TLS"],
              ["SSL", "TLS"],
              ["PLAINTEXT", "Plaintext (local development)"],
            ])}
            {form.security === "SASL_SSL" && (
              <>
                {select("sasl", "SASL mechanism", [
                  ["SCRAM-SHA-256"],
                  ["SCRAM-SHA-512"],
                  ["PLAIN"],
                ])}
                {field("username", "SASL username", { required: true })}
                {field("password", "SASL password · not retained", {
                  type: "password",
                  required: !profile,
                })}
              </>
            )}
          </div>
          <p className="muted">
            Future integration. CA/client certificate options and broker checks
            are not implemented.
          </p>
        </>
      )}
      {kind === "http" && (
        <div className="field">
          {field("baseUrl", "Base URL", { type: "url", required: true })}
          <p className="muted">
            Use an HTTP(S) URL without credentials, query, or fragment. Auth is
            entered per request; a profile does not open a persistent
            connection.
          </p>
        </div>
      )}
      <p role="status" aria-live="polite">
        {feedback}
      </p>
      <div className="dialog-actions">
        <button
          type="button"
          onClick={(e) => {
            if (!e.currentTarget.form?.reportValidity()) return;
            try {
              validate();
              setFeedback(
                "Form valid · no connection, authentication, or endpoint was tested.",
              );
            } catch (error) {
              setFeedback(
                error instanceof Error ? error.message : "Invalid settings",
              );
            }
          }}
        >
          Validate form (demo)
        </button>
        <button type="button" onClick={onClose}>
          Cancel
        </button>
        <button className="primary" type="submit">
          {profile ? "Save demo changes" : "Add demo profile"}
        </button>
      </div>
    </form>
  );
}
