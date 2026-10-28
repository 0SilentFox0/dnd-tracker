export const COMPENDIUM_LIMITS = { bytes: 3 * 1024 * 1024, requestBytes: 3_000_000, depth: 32, nodes: 500_000, stringBytes: 128 * 1024, recordBytes: 256 * 1024, records: 10_000, selected: 2_000, sources: 100 } as const;
export const COMPENDIUM_KINDS = ["spell", "monster", "item", "baseitem", "race", "subrace", "background", "feat", "class", "classFeature", "subclass", "subclassFeature", "optionalfeature", "adventure", "adventureData", "book", "bookData", "table", "reward", "condition", "skill", "language", "itemProperty", "itemType"] as const;

export const COMPENDIUM_REQUEST_HEADROOM_BYTES = 8192;

export type JsonRecord = Record<string, unknown>;

const encoder = new TextEncoder();

export const byteLength = (text: string) => encoder.encode(text).byteLength;
