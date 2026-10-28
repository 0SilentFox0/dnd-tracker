import { describe, expect, it } from "vitest";

import { detectImportFormat, parseCompendium } from "../parse";

describe("bounded compendium parsing", () => {
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
