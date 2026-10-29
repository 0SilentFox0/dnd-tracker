import { importContentRows } from "@/lib/api/content-import";
import type { ImportKind, ImportMode, ImportRecord, ImportReport } from "@/types/content-import";

export type ImportPart = { offset: number; report: ImportReport };

export async function postChunks(
  target: { campaignId: string; kind: ImportKind },
  chunks: ImportRecord[][],
  body: { mode: ImportMode; dryRun: boolean },
  parts: ImportPart[],
  onPart?: (done: number) => void,
) {
  let offset = 0;

  for (const rows of chunks) {
    parts.push({ offset, report: await importContentRows(target.campaignId, target.kind, { rows, ...body }) });
    offset += rows.length;
    onPart?.(parts.length);
  }
}
