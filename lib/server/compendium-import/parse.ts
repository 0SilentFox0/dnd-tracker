import { isRecord } from "@/lib/utils/common/is-record";

export const COMPENDIUM_LIMITS = { bytes: 3 * 1024 * 1024, requestBytes: 3_000_000, depth: 32, nodes: 500_000, stringBytes: 128 * 1024, recordBytes: 256 * 1024, records: 10_000, selected: 2_000, sources: 100 } as const;
export const COMPENDIUM_KINDS = ["spell", "monster", "item", "baseitem", "race", "subrace", "background", "feat", "class", "classFeature", "subclass", "subclassFeature", "optionalfeature", "adventure", "adventureData", "book", "bookData", "table", "reward", "condition", "skill", "language", "itemProperty", "itemType"] as const;
export type JsonRecord = Record<string, unknown>;
export type Compendium = Record<string, unknown>;

export class CompendiumError extends Error {
  constructor(public code: string, public path = "$") {
    super(`${code}: ${path}`);
  }
}

const encoder = new TextEncoder();

export const byteLength = (text: string) => encoder.encode(text).byteLength;
export const normalized = (text: string) => text.normalize("NFC").trim().toLowerCase();

const forbidden = new Set(["__proto__", "constructor", "prototype"]);

/** Tokenize before JSON.parse: bounds recursion/work and catches duplicate keys before they disappear. */
function scan(text: string) {
  let at = 0;

  let nodes = 0;

  const fail = (code: string): never => { throw new CompendiumError(code, `$@${at}`); };

  const space = () => { while (/[ \t\r\n]/.test(text[at] ?? "") && at < text.length) at++; };

  function string(): string {
    const start = at++;

    let escaped = false;

    while (at < text.length) {
      const ch = text[at++];

      if (ch === '"' && !escaped) {
        let value: string;

        try { value = JSON.parse(text.slice(start, at)) as string; } catch { return fail("INVALID_JSON"); }
        for (let i = 0; i < value.length; i++) {
          const code = value.charCodeAt(i);

          if (code === 0) fail("INVALID_TEXT");

          if (code >= 0xD800 && code <= 0xDBFF) {
            const next = value.charCodeAt(++i);

            if (!(next >= 0xDC00 && next <= 0xDFFF)) fail("INVALID_TEXT");
          } else if (code >= 0xDC00 && code <= 0xDFFF) fail("INVALID_TEXT");
        }

        if (byteLength(value) > COMPENDIUM_LIMITS.stringBytes) fail("STRING_SIZE");

        return value;
      }

      if (ch === "\\" && !escaped) escaped = true;
      else escaped = false;
    }

    return fail("INVALID_JSON");
  }

  function value(depth: number): void {
    if (depth > COMPENDIUM_LIMITS.depth) fail("DEPTH");

    if (++nodes > COMPENDIUM_LIMITS.nodes) fail("NODES");

    space();

    const ch = text[at];

    if (ch === '"') { string();

 return; }

    if (ch === "{" || ch === "[") {
      at++;

      const object = ch === "{";

      const end = object ? "}" : "]";

      const keys = new Set<string>();

      space();

      if (text[at] === end) { at++;

 return; }

      while (at < text.length) {
        space();

        if (object) {
          if (text[at] !== '"') fail("INVALID_JSON");

          const key = string();

          if (forbidden.has(key)) fail("PROTOTYPE_KEY");

          if (keys.has(key)) fail("DUPLICATE_KEY");

          keys.add(key);
          space();

          if (text[at++] !== ":") fail("INVALID_JSON");
        }

        value(depth + 1);
        space();

        const delimiter = text[at++];

        if (delimiter === end) return;

        if (delimiter !== ",") fail("INVALID_JSON");
      }
      fail("INVALID_JSON");
    }

    const match = /^(?:true|false|null|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)/.exec(text.slice(at));

    if (!match) return fail("INVALID_JSON");

    if (/^-?\d/.test(match[0]) && !Number.isFinite(Number(match[0]))) fail("NON_FINITE");

    at += match[0].length;
  }

  value(0);
  space();

  if (at !== text.length) fail("INVALID_JSON");
}

export function parseCompendium(input: string | Uint8Array): Compendium {
  if ((typeof input === "string" ? byteLength(input) : input.byteLength) > COMPENDIUM_LIMITS.bytes) throw new CompendiumError("FILE_SIZE");

  let text: string;

  try { text = typeof input === "string" ? input : new TextDecoder("utf-8", { fatal: true }).decode(input); } catch { throw new CompendiumError("INVALID_UTF8"); }
  text = text.replace(/^\uFEFF/, "");
  scan(text);

  const root: unknown = JSON.parse(text);

  if (!isRecord(root)) throw new CompendiumError("ROOT_OBJECT");

  let count = 0;

  for (const [kind, rows] of Object.entries(root)) {
    if (kind === "_meta") {
      if (!isRecord(rows)) throw new CompendiumError("META_OBJECT");

      if (rows.sources !== undefined) {
        if (!Array.isArray(rows.sources) || rows.sources.length > COMPENDIUM_LIMITS.sources) throw new CompendiumError("SOURCES");

        const ids = new Set<string>();

        for (const source of rows.sources) {
          if (!isRecord(source) || typeof source.json !== "string" || !source.json.trim() || byteLength(source.json) > 128) throw new CompendiumError("SOURCE_ID");

          const id = normalized(source.json);

          if (ids.has(id)) throw new CompendiumError("SOURCE_DUPLICATE");

          ids.add(id);
        }
      }

      continue;
    }

    if ((COMPENDIUM_KINDS as readonly string[]).includes(kind) && (!Array.isArray(rows) || !rows.every(isRecord))) throw new CompendiumError("CATEGORY_ARRAY", kind);

    if (Array.isArray(rows)) {
      count += rows.length;
      for (const row of rows) if (byteLength(JSON.stringify(row)) > COMPENDIUM_LIMITS.recordBytes) throw new CompendiumError("RECORD_SIZE", kind);
    }
  }

  if (count > COMPENDIUM_LIMITS.records) throw new CompendiumError("RECORDS");

  return root;
}

export function detectImportFormat(text: string): "csv" | "json" | "compendium" | "bundle" {
  const start = text.replace(/^\uFEFF/, "").trimStart();

  if (!/^[\[{]/.test(start)) return "csv";

  if (byteLength(text) > COMPENDIUM_LIMITS.bytes) throw new CompendiumError("FILE_SIZE");

  scan(start);

  const root: unknown = JSON.parse(start);

  if (!isRecord(root)) return "json";

  if (root.formatVersion !== undefined && root.settings !== undefined) return "bundle";

  return root._meta !== undefined || COMPENDIUM_KINDS.some((kind) => Array.isArray(root[kind])) ? "compendium" : "json";
}
