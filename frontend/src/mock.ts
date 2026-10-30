import type { Draft, Payload, RunAction, Target } from "./types";

export function defaultDraft(target: Target, consoleTab = false): Draft {
  return {
    view: "data",
    filter: target.kind === "mongo" ? "{}" : "",
    query:
      target.kind === "mongo"
        ? '{ "find": "customers", "filter": {}, "limit": 100 }'
        : "SELECT id, name, email FROM public.users;",
    projection: "{}",
    sort: "[]",
    limit: 100,
    kafkaView: "consume",
    partition: "all",
    start: "latest",
    offset: "0",
    duration: 30,
    publishPartition: "auto",
    format: "json",
    key: "order-1042",
    headers: '[{"key":"source","value":"data-viewer"}]',
    payload: '{ "event": "order.created", "id": 1042 }',
    method: target.method || "GET",
    url: target.url || "https://api.example.test/health",
    params: "",
    body: '{ "item": "sample", "quantity": 1 }',
    requestView: "params",
    responseView: "body",
    ...(consoleTab ? { view: "data" as const } : {}),
  };
}

export function sampleData(target: Target): Payload {
  if (target.kind === "mongo")
    return {
      type: "documents",
      documents: [
        JSON.stringify(
          {
            _id: { $oid: "507f1f77bcf86cd799439011" },
            name: "Maya Chen",
            active: true,
            joinedAt: { $date: "2026-10-29T09:00:00Z" },
            balance: { $numberDecimal: "49.90" },
          },
          null,
          2,
        ),
      ],
    };
  if (target.name === "orders")
    return {
      type: "sql",
      columns: ["id · int8", "user_id · int8", "total · numeric"],
      rows: [
        [
          { type: "int8", text: "101" },
          { type: "int8", text: "1" },
          { type: "numeric", text: "49.90" },
        ],
        [
          { type: "int8", text: "102" },
          { type: "int8", text: "2" },
          { type: "numeric", text: "25.00" },
        ],
      ],
    };
  return {
    type: "sql",
    columns: ["id · int8", "name · text", "email · text"],
    rows: [
      [
        { type: "int8", text: "9007199254740993" },
        { type: "text", text: "Maya Chen" },
        { type: "text", text: "maya@example.test" },
      ],
      [
        { type: "int8", text: "2" },
        { type: "text", text: "Noah Park" },
        { type: "text", text: null },
      ],
    ],
  };
}

export function jsonObject(
  value: string,
  label: string,
): Record<string, unknown> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error(label + " must be valid JSON.");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
    throw new Error(label + " must be a JSON object.");
  return parsed as Record<string, unknown>;
}

export function effectiveURL(draft: Draft): string {
  const url = new URL(draft.url);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password
  )
    throw new Error("Use an HTTP(S) URL without embedded credentials.");
  for (const line of draft.params.split("\n").filter((line) => line.trim())) {
    const i = line.indexOf("=");
    if (i < 1) throw new Error("Use name=value for each query parameter.");
    url.searchParams.append(line.slice(0, i).trim(), line.slice(i + 1));
  }
  url.hash = "";
  return url.href;
}

export function validateRun(
  target: Target,
  draft: Draft,
  action: RunAction,
  consoleTab: boolean,
): void {
  if (action === "query") {
    if (target.kind === "mongo") {
      jsonObject(
        consoleTab ? draft.query : draft.filter,
        consoleTab ? "Command" : "Filter",
      );
      if (!consoleTab) {
        jsonObject(draft.projection, "Projection");
        let sort: unknown;
        try {
          sort = JSON.parse(draft.sort);
        } catch {
          throw new Error("Sort must be an ordered JSON array.");
        }
        if (
          !Array.isArray(sort) ||
          !sort.every(
            (x) =>
              Array.isArray(x) &&
              typeof x[0] === "string" &&
              x.length === 2 &&
              [1, -1].includes(x[1]),
          )
        )
          throw new Error('Sort must use [["field", 1], ["other", -1]].');
      }
    } else if (consoleTab && !draft.query.trim())
      throw new Error("Enter a SQL statement.");
    if (!Number.isInteger(draft.limit) || draft.limit < 1 || draft.limit > 500)
      throw new Error("Preview limit must be between 1 and 500.");
  }
  if (action === "consume") {
    if (
      draft.start === "offset" &&
      (draft.partition === "all" || !/^\d+$/.test(draft.offset))
    )
      throw new Error(
        "A specific offset needs one partition and a non-negative integer offset.",
      );
    if (
      !Number.isInteger(draft.limit) ||
      draft.limit < 1 ||
      draft.limit > 500 ||
      !Number.isInteger(draft.duration) ||
      draft.duration < 1 ||
      draft.duration > 60
    )
      throw new Error("Use 1–500 messages and 1–60 seconds.");
  }
  if (action === "publish") {
    if (draft.format === "json") {
      try {
        JSON.parse(draft.payload);
      } catch {
        throw new Error("Payload must be valid JSON, or choose Text.");
      }
    }
    let headers: unknown;
    try {
      headers = JSON.parse(draft.headers);
    } catch {
      throw new Error("Headers must be a JSON array.");
    }
    if (
      !Array.isArray(headers) ||
      !headers.every(
        (h) => h && typeof h.key === "string" && typeof h.value === "string",
      )
    )
      throw new Error(
        'Headers need ordered {"key":"...","value":"..."} entries.',
      );
    if (
      new TextEncoder().encode(draft.payload + draft.headers + draft.key)
        .length >
      1024 * 1024
    )
      throw new Error("Demo record exceeds the 1 MiB cap.");
  }
  if (action === "http") {
    effectiveURL(draft);
    if (["POST", "PUT", "PATCH"].includes(draft.method)) {
      try {
        JSON.parse(draft.body);
      } catch {
        throw new Error("Body must be valid JSON.");
      }
    }
  }
}

export function simulate(
  target: Target,
  draft: Draft,
  action: RunAction,
  signal: AbortSignal,
): Promise<Payload> {
  // This service never uses fetch, drivers, storage, tokens, or raw HTTP headers.
  return new Promise((resolve, reject) => {
    const abort = () => {
      clearTimeout(timer);
      reject(new DOMException("Simulation canceled", "AbortError"));
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", abort);
      if (action === "query") resolve(sampleData(target));
      else if (action === "consume")
        resolve({
          type: "messages",
          records: [
            {
              partition:
                draft.partition === "all" ? 0 : Number(draft.partition),
              offset:
                draft.start === "offset" ? draft.offset : "9007199254740993",
              key: "order-1042",
              value: '{"event":"order.created","id":1042}',
              headers: [{ key: "source", value: "fixture" }],
            },
          ],
        });
      else if (action === "publish")
        resolve({
          type: "receipt",
          topic: target.name,
          partition:
            draft.publishPartition === "auto"
              ? 0
              : Number(draft.publishPartition),
          offset: "9007199254740994",
        });
      else
        resolve({
          type: "http",
          method: draft.method,
          url: effectiveURL(draft),
          status: 200,
          body: JSON.stringify(
            { status: "ok", source: "fictional UI fixture" },
            null,
            2,
          ),
          headers: "content-type: application/json\nx-demo: true",
        });
    }, 700);
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) abort();
  });
}
