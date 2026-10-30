import type {
  ExplorerNode,
  Integration,
  IntegrationKind,
  Profile,
  Target,
} from "./types";

export const integrations: Integration[] = [
  {
    id: "postgres",
    name: "PostgreSQL",
    category: "database",
    stage: "0.0.1 target",
    description: "Browse schemas, filter tables, and open SQL consoles.",
    capabilities: ["sql", "query", "schemas", "tables"],
  },
  {
    id: "mongo",
    name: "MongoDB",
    category: "database",
    stage: "0.0.1 target",
    description:
      "Browse collections, find documents, and inspect sampled fields.",
    capabilities: ["find", "documents", "collections", "json"],
  },
  {
    id: "kafka",
    name: "Kafka",
    category: "messaging",
    stage: "Future integration",
    description: "Inspect topic messages and publish records.",
    capabilities: ["topics", "consume", "publish", "produce"],
  },
  {
    id: "http",
    name: "HTTP",
    category: "api",
    stage: "Future integration",
    description: "Compose API requests and inspect responses.",
    capabilities: ["api", "rest", "request", "send"],
  },
];

export const defaults: Record<IntegrationKind, Record<string, string>> = {
  postgres: {
    host: "localhost",
    port: "5432",
    database: "appdb",
    username: "viewer",
    tls: "verify-full",
  },
  mongo: { uri: "mongodb://localhost:27017", database: "shop" },
  kafka: {
    brokers: "localhost:9092",
    security: "PLAINTEXT",
    sasl: "SCRAM-SHA-256",
    username: "",
  },
  http: { baseUrl: "https://api.example.test" },
};

export const initialProfiles: Profile[] = [
  ["postgres", "Local PostgreSQL"],
  ["mongo", "Local MongoDB"],
  ["kafka", "Development Kafka"],
  ["http", "Example API"],
].map(([kind, name]) => ({
  id: kind,
  kind: kind as IntegrationKind,
  name,
  settings: { ...defaults[kind as IntegrationKind] },
  revision: 1,
}));

// Preview metadata only. Real URI parsing and credential separation belong in Go.
export function sanitizeMongoURI(value: string): string {
  const match = value.match(
    /^(mongodb(?:\+srv)?:\/\/)([^/?#]+)(\/[^?#]*)?(?:\?([^#]*))?/,
  );
  if (!match) throw new Error("Use mongodb:// or mongodb+srv:// with a host.");
  const hosts = match[2].slice(match[2].lastIndexOf("@") + 1);
  if (!hosts.trim()) throw new Error("Enter at least one MongoDB host.");
  const allowed = new Set([
    "authsource",
    "authmechanism",
    "replicaset",
    "tls",
    "ssl",
    "readpreference",
    "directconnection",
    "retrywrites",
  ]);
  const query = new URLSearchParams();
  for (const [key, val] of new URLSearchParams(match[4]))
    if (allowed.has(key.toLowerCase())) query.append(key, val);
  return match[1] + hosts + (match[3] || "") + (query.size ? "?" + query : "");
}

export function cleanSettings(
  kind: IntegrationKind,
  form: Record<string, string>,
): Record<string, string> {
  const fields = Object.keys(defaults[kind]);
  const settings = Object.fromEntries(
    fields.map((key) => [key, (form[key] ?? "").trim()]),
  );
  if (kind === "mongo") settings.uri = sanitizeMongoURI(settings.uri);
  if (kind === "http") {
    const url = new URL(settings.baseUrl);
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    ) {
      throw new Error(
        "Use an HTTP(S) base URL without credentials, query parameters, or fragments.",
      );
    }
  }
  if (kind === "kafka" && settings.security !== "SASL_SSL")
    settings.username = "";
  return settings;
}

export function createTree(profile: Profile): ExplorerNode {
  const { id, kind, settings } = profile;
  const database = settings.database || "";
  const target = (
    entity: Target["entity"],
    name: string,
    extra: Partial<Target> = {},
  ): Target => ({
    sessionId: "demo-" + id,
    profileId: id,
    kind,
    database,
    entity,
    name,
    ...extra,
  });
  const node = (
    suffix: string,
    label: string,
    entity: ExplorerNode["entity"],
    children?: ExplorerNode[],
    ref?: Target,
  ): ExplorerNode => ({
    id: id + ":" + suffix,
    profileId: id,
    kind,
    label,
    entity,
    children,
    target: ref,
  });
  let children: ExplorerNode[];
  if (kind === "postgres") {
    children = [
      node(
        "database",
        database,
        "database",
        [
          node("public", "public", "schema", [
            node(
              "users",
              "users",
              "table",
              undefined,
              target("table", "users", { schema: "public" }),
            ),
            node(
              "orders",
              "orders",
              "table",
              undefined,
              target("table", "orders", { schema: "public" }),
            ),
          ]),
        ],
        target("database", ""),
      ),
    ];
  } else if (kind === "mongo") {
    children = [
      node(
        "database",
        database,
        "database",
        [
          node(
            "customers",
            "customers",
            "collection",
            undefined,
            target("collection", "customers"),
          ),
          node(
            "orders",
            "orders",
            "collection",
            undefined,
            target("collection", "orders"),
          ),
        ],
        target("database", ""),
      ),
    ];
  } else if (kind === "kafka") {
    children = [
      node(
        "topics",
        "Topics",
        "folder",
        ["orders.created", "payments.received"].map((topic) =>
          node(topic, topic, "topic", undefined, target("topic", topic)),
        ),
      ),
    ];
  } else {
    children = [
      node(
        "requests",
        "Requests",
        "folder",
        ["health", "orders"].map((path) => {
          const method = path === "health" ? "GET" : "POST";
          return node(
            path,
            method + " /" + path,
            "request",
            undefined,
            target("request", method + " /" + path, {
              method,
              url: settings.baseUrl.replace(/\/$/, "") + "/" + path,
            }),
          );
        }),
      ),
    ];
  }
  return {
    id,
    profileId: id,
    kind,
    label: profile.name,
    entity: "profile",
    children,
  };
}

export const initialTrees = initialProfiles.map(createTree);

export function resourceKey(target: Target): string {
  return JSON.stringify([
    target.sessionId,
    target.entity,
    target.database,
    target.schema,
    target.name,
  ]);
}

export function targetName(target: Target): string {
  return [
    target.schema || (target.kind === "mongo" ? target.database : ""),
    target.name,
  ]
    .filter(Boolean)
    .join(".");
}
