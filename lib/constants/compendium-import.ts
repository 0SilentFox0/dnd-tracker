export const COMPENDIUM_LIMITS = { bytes: 3 * 1024 * 1024, requestBytes: 3_000_000, depth: 32, nodes: 500_000, stringBytes: 128 * 1024, recordBytes: 256 * 1024, records: 10_000, selected: 2_000, sources: 100 } as const;
export const COMPENDIUM_KINDS = ["spell", "monster", "item", "baseitem", "race", "subrace", "background", "feat", "class", "classFeature", "subclass", "subclassFeature", "optionalfeature", "adventure", "adventureData", "book", "bookData", "table", "reward", "condition", "skill", "language", "itemProperty", "itemType"] as const;

export const COMPENDIUM_REQUEST_HEADROOM_BYTES = 8192;

export type JsonRecord = Record<string, unknown>;

const encoder = new TextEncoder();

export const byteLength = (text: string) => encoder.encode(text).byteLength;

export const COMPENDIUM_PAGE_SIZES = { graph: 30, reportRows: 50, reportActions: 50, runs: 20, notes: 50 } as const;

export const COMPENDIUM_ERROR_TEXT: Record<string, string> = {
  PREVIEW_SECRET_REQUIRED: "Серверний ключ COMPENDIUM_PREVIEW_SECRET не налаштований (щонайменше 32 символи). Імпорт недоступний.",
  PREVIEW_STALE: "Кампанія або термін preview змінилися. Повторіть перевірку.",
  PREVIEW_INVALID: "Підпис preview недійсний. Повторіть перевірку.",
  REQUEST_SIZE: "Вибраний набір завеликий. Виберіть менше категорій або розділів.",
  FORBIDDEN: "Доступ має лише ДМ кампанії через сесію.",
  IMPORT_FAILED: "Не вдалося виконати імпорт. Жоден частковий запис не підтверджено; спробуйте повторити з тим самим ключем.",
};

export const COMPENDIUM_REF_KINDS: Record<string, string> = { spell: "spells", feat: "feats", class: "classes", race: "races", monster: "units", background: "backgrounds", item: "artifacts", spellSchool: "spell-groups" };

export const COMPENDIUM_CHAPTER_KINDS = ["bookData", "adventureData"] as const;
