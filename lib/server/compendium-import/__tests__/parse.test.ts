import { describe, expect, it, vi } from "vitest";

import { byteLength, COMPENDIUM_LIMITS, CompendiumError, detectImportFormat, parseCompendium } from "../parse";
import { confirmImport, type ImportRepository } from "../service";

function rejectsWith(text: string | Uint8Array, code: string) {
  expect(() => parseCompendium(text)).toThrow(CompendiumError);
  expect(() => parseCompendium(text)).toThrow(expect.objectContaining({ code }));
}

describe("bounded compendium parsing", () => {
  it("pins independent file, transport, work and selection limits", () => {
    expect(COMPENDIUM_LIMITS).toEqual({ bytes: 3145728, requestBytes: 3000000, depth: 32, nodes: 500000, stringBytes: 131072, recordBytes: 262144, records: 10000, selected: 2000, sources: 100 });
  });

  it.each([false, true])("accepts exact file bytes and rejects one over (UTF8 input: %s)", (binary) => {
    const text = "{}" + " ".repeat(COMPENDIUM_LIMITS.bytes - 2);

    const encode = (value: string) => binary ? new TextEncoder().encode(value) : value;

    expect(parseCompendium(encode(text))).toEqual({});
    rejectsWith(encode(text + " "), "FILE_SIZE");
  });

  it("accepts exact depth and rejects one level over", () => {
    const nested = (depth: number) => '{"custom":' + "[".repeat(depth - 1) + "0" + "]".repeat(depth - 1) + "}";

    expect(() => parseCompendium(nested(COMPENDIUM_LIMITS.depth))).not.toThrow();
    rejectsWith(nested(COMPENDIUM_LIMITS.depth + 1), "DEPTH");
  });

  it("counts string bytes rather than UTF16 characters", () => {
    const text = (extra: string) => JSON.stringify({ feat: [{ name: "я".repeat(COMPENDIUM_LIMITS.stringBytes / 2) + extra }] });

    expect(() => parseCompendium(text(""))).not.toThrow();
    rejectsWith(text("x"), "STRING_SIZE");
  });

  it("accepts exact record bytes and rejects one over", () => {
    const row = { a: "x".repeat(COMPENDIUM_LIMITS.stringBytes), b: "" };

    row.b = "y".repeat(COMPENDIUM_LIMITS.recordBytes - byteLength(JSON.stringify(row)));
    expect(byteLength(JSON.stringify(row))).toBe(COMPENDIUM_LIMITS.recordBytes);
    expect(() => parseCompendium(JSON.stringify({ feat: [row] }))).not.toThrow();
    rejectsWith(JSON.stringify({ feat: [{ ...row, b: row.b + "y" }] }), "RECORD_SIZE");
  });

  it("does not apply the record limit to book/adventure material or unsupported categories", () => {
    const big = { id: "B", data: Array.from({ length: 3 }, () => ({ name: "c", entries: Array.from({ length: 2 }, () => "x".repeat(COMPENDIUM_LIMITS.stringBytes - 1)) })) };

    expect(byteLength(JSON.stringify(big))).toBeGreaterThan(COMPENDIUM_LIMITS.recordBytes);
    expect(() => parseCompendium(JSON.stringify({ bookData: [big], adventure: [big], foundryItem: [big] }))).not.toThrow();
  });

  it("can skip the record limit for the pre-selection worker pass", () => {
    const row = { a: "x".repeat(COMPENDIUM_LIMITS.stringBytes), b: "y".repeat(COMPENDIUM_LIMITS.stringBytes), c: "z".repeat(1) };

    expect(() => parseCompendium(JSON.stringify({ monster: [row] }))).toThrow(expect.objectContaining({ code: "RECORD_SIZE" }));
    expect(() => parseCompendium(JSON.stringify({ monster: [row] }), { checkRecordSize: false })).not.toThrow();
  });

  it("accepts exact node budget and rejects one over", () => {
    // root + _meta + custom array = three nodes; metadata is not a record category.
    const text = (count: number) => '{"_meta":{"custom":[' + Array(count - 3).fill("null").join(",") + "]}}";

    expect(() => parseCompendium(text(COMPENDIUM_LIMITS.nodes))).not.toThrow();
    rejectsWith(text(COMPENDIUM_LIMITS.nodes + 1), "NODES");
  });

  it("accepts exact aggregate record and source counts", () => {
    expect(() => parseCompendium(JSON.stringify({ feat: Array.from({ length: COMPENDIUM_LIMITS.records }, () => ({})), _meta: { sources: Array.from({ length: COMPENDIUM_LIMITS.sources }, (_, i) => ({ json: `S${i}` })) } }))).not.toThrow();
  });

  it.each(["__proto__", "constructor", "prototype"])("rejects forbidden key %s at any nesting", (key) => {
    rejectsWith(`{"custom":[{"nested":{"${key}":1}}]}`, "PROTOTYPE_KEY");
    rejectsWith(`{"custom":[{"nested":{"\\u${key.charCodeAt(0).toString(16).padStart(4, "0")}${key.slice(1)}":1}}]}`, "PROTOTYPE_KEY");
  });

  it.each(["\\ud800", "\\udfff", "\\ud800x", "\\u0000"])("rejects invalid text %s with the existing code", (text) => {
    rejectsWith(`{"custom":[{"name":"${text}"}]}`, "INVALID_TEXT");
  });

  it("preserves HTML and URL text as source data", () => {
    const root = { feat: [{ name: "<img src=x onerror=alert(1)>", source: "S", entries: ["<script>alert(1)</script>", "javascript:alert(1)"] }] };

    expect(parseCompendium(JSON.stringify(root))).toEqual(root);
  });

  it.each([
    ['{"spell":[],"sp\\u0065ll":[]}', "DUPLICATE_KEY"],
    ...["__proto__", "constructor", "prototype"].map(key => [`{"feat":[{"${key}":1}]}`, "PROTOTYPE_KEY"]),
    ['{"feat":[{"name":"\\udfff"}]}', "INVALID_TEXT"],
    ['{"feat":[{"name":"\\u0000"}]}', "INVALID_TEXT"],
  ])("rejects %s before opening a repository transaction (%s)", async (json, code) => {
    const repository = { authorize: vi.fn(), loadContext: vi.fn(), findRun: vi.fn(), transaction: vi.fn(), write: vi.fn(), saveEntry: vi.fn(), saveSources: vi.fn(), saveRun: vi.fn() } satisfies ImportRepository;

    await expect(confirmImport({ campaignId: "c", userId: "dm", isDM: true, via: "session", scopes: null }, { json }, "invalid", "key", "s".repeat(32), repository)).rejects.toThrow(expect.objectContaining({ code }));

    for (const method of Object.values(repository)) expect(method).not.toHaveBeenCalled();
  });
  it("accepts an aggregate without requiring metadata and preserves unknown categories", () => {
    expect(parseCompendium('{"spell":[],"custom":[]}')).toEqual({ spell: [], custom: [] });
  });

  it.each(['null', '[]', '{"spell":{}}', '{"_meta":[]}', '{"spell":[null]}', '{"spell":[{"name":"a","name":"b"}]}', '{"spell":[],"spell":[]}', '{"spell":[{"constructor":{}}]}', '{"spell":[{"n":1e999}]}'])('rejects %s before downstream writes', (text) => {
    expect(() => parseCompendium(text)).toThrow();
  });

  it("catches escaped duplicate keys and prototype keys", () => {
    expect(() => parseCompendium('{"spell":[],"sp\\u0065ll":[]}')).toThrow(/DUPLICATE_KEY/);
    expect(() => parseCompendium('{"spell":[{"\\u005f_proto__":1}]}')).toThrow(/PROTOTYPE_KEY/);
  });

  it("rejects invalid UTF8, excessive depth, oversized strings and files", () => {
    expect(() => parseCompendium('{"feat":[{"name":"\\ud800"}]}')).toThrow(/INVALID_TEXT/);
    expect(() => parseCompendium('{"feat":[{"name":"\\u0000"}]}')).toThrow(/INVALID_TEXT/);
    expect(() => parseCompendium('{"feat":[{"name":"\\ud83d\\ude00"}]}')).not.toThrow();
    expect(() => parseCompendium(new Uint8Array([0xff]))).toThrow(/UTF8/);
    expect(() => parseCompendium('{"spell":' + '['.repeat(35) + '0' + ']'.repeat(35) + '}')).toThrow(/DEPTH/);
    expect(() => parseCompendium(JSON.stringify({ spell: [{ name: 'x'.repeat(131073) }] }))).toThrow(/STRING/);
    expect(() => parseCompendium(' '.repeat(3 * 1024 * 1024 + 1))).toThrow(/FILE_SIZE/);
  });

  it("bounds record and source counts", () => {
    expect(() => parseCompendium(JSON.stringify({ feat: [], _meta: { sources: [{ json: "s".repeat(129) }] } }))).toThrow(/SOURCE_ID/);
    expect(() => parseCompendium(JSON.stringify({ spell: Array.from({ length: 10001 }, () => ({})) }))).toThrow(/RECORDS/);
    expect(() => parseCompendium(JSON.stringify({ spell: [], _meta: { sources: Array.from({ length: 101 }, (_, i) => ({ json: `s${i}` })) } }))).toThrow(/SOURCES/);
    expect(() => parseCompendium('{"spell":[],"_meta":{"sources":[{"json":"X"},{"json":"x"}]}}')).toThrow(/SOURCE_DUPLICATE/);
  });

  it("dispatches aggregate, plain JSON, CSV and bundle independently", () => {
    expect(detectImportFormat('{"spell":[]}')).toBe('compendium');
    expect(detectImportFormat('[{"name":"Test"}]')).toBe('json');
    expect(detectImportFormat('{"name":"Test"}')).toBe('json');
    expect(detectImportFormat('name;level\nTest;1')).toBe('csv');
    expect(detectImportFormat('{"formatVersion":1,"settings":{},"spells":[]}')).toBe('bundle');
  });
});
