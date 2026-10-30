export type IntegrationKind = "postgres" | "mongo" | "kafka" | "http";
export type EntityKind =
  | "profile"
  | "database"
  | "schema"
  | "folder"
  | "table"
  | "collection"
  | "topic"
  | "request";

export interface Integration {
  id: IntegrationKind;
  name: string;
  category: string;
  stage: string;
  description: string;
  capabilities: string[];
}

// Mock profile metadata only. Form secrets are never copied into this object.
export interface Profile {
  id: string;
  kind: IntegrationKind;
  name: string;
  settings: Record<string, string>;
  revision: number;
}

export interface Target {
  sessionId: string; // Fictional preview session, never a backend connection ID.
  profileId: string;
  kind: IntegrationKind;
  database: string;
  schema?: string;
  name: string;
  entity: EntityKind;
  url?: string;
  method?: string;
}

export interface ExplorerNode {
  id: string;
  label: string;
  entity: EntityKind;
  kind: IntegrationKind;
  profileId: string;
  target?: Target;
  children?: ExplorerNode[];
}

export interface Draft {
  view: "data" | "structure";
  filter: string;
  query: string;
  projection: string;
  sort: string;
  limit: number;
  kafkaView: "consume" | "publish";
  partition: string;
  start: string;
  offset: string;
  duration: number;
  publishPartition: string;
  format: "json" | "text";
  key: string;
  headers: string; // Kafka headers only. HTTP header/token text is not a draft.
  payload: string;
  method: string;
  url: string;
  params: string;
  body: string;
  requestView: "params" | "headers" | "auth" | "body";
  responseView: "body" | "headers";
}

export interface SQLCell {
  type: string;
  text: string | null;
}
export interface KafkaRecord {
  partition: number;
  offset: string;
  key: string;
  value: string;
  headers: { key: string; value: string }[];
}
export type Payload =
  | { type: "sql"; columns: string[]; rows: SQLCell[][] }
  | { type: "documents"; documents: string[] }
  | { type: "messages"; records: KafkaRecord[] }
  | { type: "receipt"; topic: string; partition: number; offset: string }
  | {
      type: "http";
      method: string;
      url: string;
      status: number;
      body: string;
      headers: string;
    };

export interface ResultSnapshot {
  requestId: string;
  target: Target;
  action: RunAction;
  payload: Payload;
}
export type RunAction = "query" | "consume" | "publish" | "http";
export type RunState = "idle" | "running" | "succeeded" | "canceled" | "failed";
export interface WorkspaceTab {
  id: string;
  title: string;
  target: Target;
  console: boolean;
  draft: Draft;
  requestId?: string;
  state: RunState;
  message: string;
  results: Partial<Record<RunAction, ResultSnapshot>>;
}

export interface ValueDetail {
  title: string;
  type: string;
  value: string;
  source: string;
  kafkaRecord?: KafkaRecord;
}
