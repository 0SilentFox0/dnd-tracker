import { z } from "zod";

import type { PackRow } from "./pack";

import { saveSkillTreeSchema } from "@/lib/schemas/skills";
import type { PackKind } from "@/lib/utils/templates/manifest";

/** Columns the import specs do not carry; a pack row may hold only these in `extra`. */
export const EXTRA_COLUMNS: Partial<Record<PackKind, readonly string[]>> = { units: ["levelScaling"] };

/** Kinds without a name column: an unslugged row of the template is matched, and made unique, by this column. */
export const MATCH_COLUMN: Partial<Record<PackKind, string>> = { skillTrees: "race", tracks: "title" };

const trackRowSchema = z.object({ title: z.string().min(1), kind: z.enum(["youtube", "file"]), url: z.string().nullish(), youtubeId: z.string().nullish(), durationSec: z.number().int().nullish(), sortOrder: z.number().int().optional() });

/** Zod schemas for kinds written straight to their columns (the importer has none for them). */
const ROW_SCHEMAS: Partial<Record<PackKind, z.ZodType>> = { skillTrees: saveSkillTreeSchema, tracks: trackRowSchema };

export function rowSchemaIssues(kind: PackKind, row: Record<string, unknown>): string[] {
  const schema = ROW_SCHEMAS[kind];

  if (!schema) return [];

  const parsed = schema.safeParse(row);

  return parsed.success ? [] : parsed.error.issues.map((i) => `${i.path.join(".") || "row"} ${i.message}`);
}

/** The import treats null as an empty cell and keeps the old value, so a rerun clears dropped optional columns itself. */
export const staleColumns = (rows: readonly PackRow[], columns: readonly string[]): Array<{ column: string; slugs: string[] }> =>
  columns.map((column) => ({ column, slugs: rows.filter((r) => r[column] === undefined).map((r) => r.slug) })).filter((c) => c.slugs.length > 0);
