import { byteLength, COMPENDIUM_CHAPTER_KINDS, type JsonRecord } from "@/lib/constants/compendium-import";
import { categoryInventory, MATERIAL_KINDS } from "@/lib/utils/compendium-import/flow";

export const NOTES_LIMIT_BYTES = 64 * 1024;

export const CATEGORY_GROUPS = [
  { id: "rules", title: "Правила й стани", kinds: ["condition"] },
  { id: "spells", title: "Заклинання", kinds: ["spell"] },
  { id: "characters", title: "Класи та персонажі", kinds: ["class", "classFeature", "subclass", "subclassFeature", "optionalfeature", "background", "race", "subrace", "feat", "reward", "skill", "language"] },
  { id: "items", title: "Предмети", kinds: ["item", "baseitem", "itemProperty", "itemType"] },
  { id: "bestiary", title: "Бестіарій", kinds: ["monster", "table"] },
  { id: "dm", title: "Матеріали ДМ", kinds: ["book", "bookData", "adventure", "adventureData"] },
] as const;

export type CategoryRow = ReturnType<typeof categoryInventory>[number];

export type CategoryGroup = { id: string; title: string; rows: CategoryRow[] };

export function groupInventory(root: JsonRecord): { groups: CategoryGroup[]; skipped: CategoryRow[] } {
  const rows = categoryInventory(root);

  const supported = rows.filter((row) => row.supported);

  const grouped = new Set<string>(CATEGORY_GROUPS.flatMap((g) => g.kinds));

  const groups = CATEGORY_GROUPS.map((g) => ({ id: g.id, title: g.title, rows: supported.filter((row) => (g.kinds as readonly string[]).includes(row.kind)) }));

  const other = supported.filter((row) => !grouped.has(row.kind));

  return { groups: [...groups, ...(other.length ? [{ id: "other", title: "Інше", rows: other }] : [])].filter((g) => g.rows.length > 0), skipped: rows.filter((row) => !row.supported) };
}

export const recommendedKinds = (root: JsonRecord) => categoryInventory(root).filter((row) => row.supported && !MATERIAL_KINDS.has(row.kind)).map((row) => row.kind);

export const allKinds = (root: JsonRecord) => categoryInventory(root).filter((row) => row.supported).map((row) => row.kind);

type Book = { id?: string; name?: string; data?: Array<{ name?: string }> };

export type ChapterBlock = { kind: string; index: number; title: string; chapters: { path: string; name: string; bytes: number; oversized: boolean }[] };

export function chapterBlocks(root: JsonRecord, kinds: string[]): ChapterBlock[] {
  return kinds.filter((kind) => (COMPENDIUM_CHAPTER_KINDS as readonly string[]).includes(kind) && Array.isArray(root[kind])).flatMap((kind) =>
    (root[kind] as Book[]).map((book, index) => ({
      kind,
      index,
      title: book.name ?? book.id ?? kind,
      chapters: (book.data ?? []).map((chapter, i) => {
        const bytes = byteLength(JSON.stringify(chapter));

        return { path: `${kind}[${index}].data[${i}]`, name: chapter.name ?? `Розділ ${i + 1}`, bytes, oversized: bytes > NOTES_LIMIT_BYTES };
      }),
    })),
  );
}

export function estimateRecords(root: JsonRecord, categories: string[], excludedChapters: string[]) {
  return categoryInventory(root).filter((row) => categories.includes(row.kind)).reduce((sum, row) => {
    if (!(COMPENDIUM_CHAPTER_KINDS as readonly string[]).includes(row.kind)) return sum + row.count;

    return sum + chapterBlocks(root, [row.kind]).reduce((n, b) => n + b.chapters.filter((c) => !excludedChapters.includes(c.path)).length, 0);
  }, 0);
}
