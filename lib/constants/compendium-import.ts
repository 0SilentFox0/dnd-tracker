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
  NOTES_SIZE: "errors.notesSize",
  REQUEST_SIZE: "errors.requestSize",
  FORBIDDEN: "errors.forbidden",
  IMPORT_FAILED: "errors.importFailed",
  FILE_SIZE: "errors.fileSize",
  PARSING_TIMEOUT: "errors.parsingTimeout",
  INVALID_JSON: "errors.invalidJson",
  RECORD_SIZE: "errors.recordSize",
  INVALID_TEXT: "errors.invalidText",
  STRING_SIZE: "errors.stringSize",
  DEPTH: "errors.depth",
  NODES: "errors.nodes",
  DUPLICATE_KEY: "errors.duplicateKey",
  PROTOTYPE_KEY: "errors.prototypeKey",
  NON_FINITE: "errors.nonFinite",
  INVALID_UTF8: "errors.invalidUtf8",
  ROOT_OBJECT: "errors.rootObject",
  META_OBJECT: "errors.metaObject",
  SOURCES: "errors.sources",
  SOURCE_ID: "errors.sourceId",
  SOURCE_DUPLICATE: "errors.sourceDuplicate",
  CATEGORY_ARRAY: "errors.categoryArray",
  RECORDS: "errors.records",
  INVALID_INPUT: "errors.invalidInput",
  CONFIRM_REQUIRED: "errors.confirmRequired",
  CONTENT_CONFLICT: "errors.contentConflict",
  IDEMPOTENCY_KEY: "errors.idempotencyKey",
  IDEMPOTENCY_CONFLICT: "errors.idempotencyConflict",
  PLAN_ERRORS: "errors.planErrors",
  PLANNING_TIMEOUT: "errors.planningTimeout",
  RULES_UNSUPPORTED: "errors.rulesUnsupported",
  BINDING_WRONG_CAMPAIGN: "errors.bindingWrongCampaign",
  TARGET_MISSING: "errors.targetMissing",
  DEPENDENCY_KIND: "errors.dependencyKind",
  DEPENDENCY_REF: "errors.dependencyRef",
  DEPENDENCY_TARGET: "errors.dependencyTarget",
  DEPENDENCY_TEMPLATE_UNAVAILABLE: "errors.dependencyTemplateUnavailable",
  MIXED_EDITION_CONFIRMATION_REQUIRED: "errors.mixedEditionConfirmationRequired",
  PROVENANCE_CONFLICT: "errors.provenanceConflict",
  PROVENANCE_TARGET: "errors.provenanceTarget",
  CREDITS_SIZE: "errors.creditsSize",
  IDENTITY_SIZE: "errors.identitySize",
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
