export const COMPENDIUM_LIMITS = { bytes: 3 * 1024 * 1024, requestBytes: 3_000_000, depth: 32, nodes: 500_000, stringBytes: 128 * 1024, recordBytes: 256 * 1024, records: 10_000, selected: 2_000, sources: 100 } as const;
export const COMPENDIUM_KINDS = ["spell", "monster", "item", "baseitem", "race", "subrace", "background", "feat", "class", "classFeature", "subclass", "subclassFeature", "optionalfeature", "adventure", "adventureData", "book", "bookData", "table", "reward", "condition", "skill", "language", "itemProperty", "itemType"] as const;

export const COMPENDIUM_REQUEST_HEADROOM_BYTES = 8192;

export type JsonRecord = Record<string, unknown>;

const encoder = new TextEncoder();

export const byteLength = (text: string) => encoder.encode(text).byteLength;

export const COMPENDIUM_PAGE_SIZES = { graph: 30, reportRows: 50, reportActions: 50, runs: 20, notes: 50 } as const;

export const COMPENDIUM_ERROR_KEYS: Record<string, string> = {
  PREVIEW_SECRET_REQUIRED: "errors.previewSecretRequired",
  PREVIEW_STALE: "errors.previewStale",
  PREVIEW_INVALID: "errors.previewInvalid",
  REQUEST_SIZE: "errors.requestSize",
  FORBIDDEN: "errors.forbidden",
  IMPORT_FAILED: "errors.importFailed",
  FILE_SIZE: "errors.fileSize",
  PARSING_TIMEOUT: "errors.parsingTimeout",
  INVALID_JSON: "errors.invalidJson",
  RECORD_SIZE: "errors.recordSize",
};

export const COMPENDIUM_REF_KINDS: Record<string, string> = { spell: "spells", feat: "feats", class: "classes", race: "races", monster: "units", background: "backgrounds", item: "artifacts", spellSchool: "spell-groups" };

export const COMPENDIUM_CHAPTER_KINDS = ["bookData", "adventureData"] as const;

export const COMPENDIUM_MATERIAL_KINDS = ["book", "adventure", ...COMPENDIUM_CHAPTER_KINDS] as const;

export const recordSizeLimited = (kind: string) => (COMPENDIUM_KINDS as readonly string[]).includes(kind) && !(COMPENDIUM_MATERIAL_KINDS as readonly string[]).includes(kind);

export function oversizedRecordKind(root: JsonRecord, kinds: Iterable<string> = Object.keys(root)): string | undefined {
  for (const kind of kinds) {
    const rows = root[kind];

    if (recordSizeLimited(kind) && Array.isArray(rows) && rows.some((row) => byteLength(JSON.stringify(row)) > COMPENDIUM_LIMITS.recordBytes)) return kind;
  }

  return undefined;
}

export const COMPENDIUM_INFO_ISSUE_CODES: ReadonlySet<string> = new Set(["UNSUPPORTED_CATEGORY", "MEDIA_OR_FOUNDRY_SKIPPED"]);
