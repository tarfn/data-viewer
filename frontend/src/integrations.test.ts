import { describe, expect, it } from "vitest";
import {
  cleanSettings,
  createTree,
  defaults,
  initialProfiles,
} from "./integrations";
import { defaultDraft, validateRun } from "./mock";

describe("preview profile boundaries", () => {
  it("never retains password/extra form fields and strips URI credential material", () => {
    expect(
      cleanSettings("postgres", {
        ...defaults.postgres,
        password: "fictional-secret",
        token: "fictional-token",
      }),
    ).not.toHaveProperty("password");
    const saved = cleanSettings("mongo", {
      uri: "mongodb://fictional:secret@host.example.test/shop?authSource=admin&tls=true&accessToken=fictional#fragment",
      database: "shop",
      password: "fictional",
    });
    expect(saved).toEqual({
      uri: "mongodb://host.example.test/shop?authSource=admin&tls=true",
      database: "shop",
    });
    expect(() =>
      cleanSettings("http", { baseUrl: "https://user:fictional@example.test" }),
    ).toThrow();
    expect(() =>
      cleanSettings("http", {
        baseUrl: "https://example.test?token=fictional",
      }),
    ).toThrow();
  });

  it("profile edits cannot change the resources or target of an existing tree", () => {
    const profile = {
      ...initialProfiles[0],
      settings: { ...defaults.postgres },
    };
    const tree = createTree(profile);
    profile.settings.database = "another-db";
    profile.name = "Renamed";
    expect(tree.children![0].target!.database).toBe("appdb");
    expect(tree.children![0].label).toBe("appdb");
    expect(createTree(profile).children![0].target!.database).toBe(
      "another-db",
    );
  });

  it("validates ordered headers, JSON, and per-partition offsets without numeric coercion", () => {
    const target = createTree(initialProfiles[2]).children![0].children![0]
      .target!;
    const draft = defaultDraft(target);
    draft.start = "offset";
    draft.offset = "9007199254740993";
    expect(() => validateRun(target, draft, "consume", false)).toThrow(
      /one partition/,
    );
    draft.partition = "0";
    expect(() => validateRun(target, draft, "consume", false)).not.toThrow();
    draft.headers = '{"source":"fixture"}';
    expect(() => validateRun(target, draft, "publish", false)).toThrow(
      /ordered/,
    );
    draft.headers = '[{"key":"x","value":"one"},{"key":"x","value":"two"}]';
    draft.payload = "not-json";
    expect(() => validateRun(target, draft, "publish", false)).toThrow(/JSON/);
    draft.format = "text";
    expect(() => validateRun(target, draft, "publish", false)).not.toThrow();
  });
});
