import { describe, expect, it, vi } from "vitest";

import { translateErrorBody } from "../translate-error";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/i18n/request-locale", () => ({ getRequestLocale: vi.fn() }));
vi.mock("@/lib/constants/api-errors", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/constants/api-errors")>()),
  API_ERROR_PARAMS: { "errors.limited": { max: 5, who: "default" } },
}));

const known = new Set(["errors.forbidden", "errors.limited", "validation.minLength", "errors.fields.name", "errors.fields.items"]);

const makeT = () => {
  const t = (key: string, values?: Record<string, string | number>) => (values && Object.keys(values).length ? `${key} ${JSON.stringify(values)}` : key);

  return Object.assign(t, { has: (key: string) => known.has(key), raw: () => ({}) });
};

describe("translateErrorBody", () => {
  it("translates a key and adds errorKey", () => {
    expect(translateErrorBody(makeT(), { error: "errors.forbidden" })).toEqual({ error: "errors.forbidden", errorKey: "errors.forbidden" });
  });

  it("leaves unknown text as is, without errorKey", () => {
    expect(translateErrorBody(makeT(), { error: "Сирий текст" })).toEqual({ error: "Сирий текст" });
  });

  it("explicit params override the registry and are not returned", () => {
    const result = translateErrorBody(makeT(), { error: "errors.limited", params: { who: "me" } });

    expect(result.error).toBe('errors.limited {"max":5,"who":"me"}');
    expect(result).not.toHaveProperty("params");
  });

  it("translates issues, passing minimum and params", () => {
    const result = translateErrorBody(makeT(), {
      error: "errors.forbidden",
      issues: [{ message: "validation.minLength", minimum: 3, path: ["name"] }, { message: "errors.limited", params: { who: "x" } }],
    });

    expect(result.issues).toEqual([
      { message: 'validation.minLength {"minimum":3}', minimum: 3, path: ["name"], pathLabel: "errors.fields.name" },
      { message: 'errors.limited {"max":5,"who":"x"}', params: { who: "x" } },
    ]);
  });

  it("builds pathLabel for numbers and unknown segments", () => {
    const issues = translateErrorBody(makeT(), { error: "x", issues: [{ message: "m", path: ["items", 1, "other"] }] }).issues as Array<{ pathLabel?: string }>;

    expect(issues[0].pathLabel).toBe("errors.fields.items › #2 › other");
  });

  it("no pathLabel for empty path", () => {
    const issues = translateErrorBody(makeT(), { error: "x", issues: [{ message: "m", path: [] }] }).issues as Array<Record<string, unknown>>;

    expect(issues[0]).not.toHaveProperty("pathLabel");
  });

  it("keeps non-array issues and non-object entries untouched", () => {
    expect(translateErrorBody(makeT(), { error: "x", issues: "oops" }).issues).toBe("oops");
    expect(translateErrorBody(makeT(), { error: "x", issues: ["a", 1] }).issues).toEqual(["a", 1]);
  });
});
