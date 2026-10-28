import type { ImportCounts, ImportKind, ImportMode, ImportRowStatus, ImportSpec } from "@/types/content-import";

export const IMPORT_KINDS = ["units", "spells", "skills", "main-skills", "spell-groups", "races", "classes", "feats", "artifacts", "artifact-sets"] as const satisfies readonly ImportKind[];

export const IMPORT_MODES = ["create", "update", "skip"] as const satisfies readonly ImportMode[];

export const IMPORT_STATUSES = ["created", "updated", "skipped", "error"] as const satisfies readonly ImportRowStatus[];

export const emptyCounts = (): ImportCounts => ({ created: 0, updated: 0, skipped: 0, error: 0 });

export const refKindsOf = (spec: ImportSpec, types?: ReadonlyArray<ImportSpec["fields"][number]["type"]>): ImportKind[] => [
  ...new Set(spec.fields.flatMap((f) => {
    const kinds = [f.ref, f.nestedRef?.kind].filter((k): k is ImportKind => !!k);

    return !types || types.includes(f.type) ? kinds : [];
  })),
];

export const isImportKind = (v: string): v is ImportKind => (IMPORT_KINDS as readonly string[]).includes(v);

export const IMPORT_LIMITS = {
  rowsPerRequest: 500,
  writeChunkRows: 100,
  // Vercel caps request bodies at 4.5 MB
  chunkBytes: 3_000_000,
  previewRows: 50,
  aiSampleRows: 5,
  aiCellChars: 200,
  aiHeaders: 100,
} as const;
