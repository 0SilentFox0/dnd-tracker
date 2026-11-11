import type { PackKind } from "@/lib/utils/templates/manifest";

/** Columns the import specs do not carry; a pack row may hold only these in `extra`. */
export const EXTRA_COLUMNS: Partial<Record<PackKind, readonly string[]>> = { units: ["levelScaling"], skills: ["appearanceDescription"] };

/** Kinds without a name column: an unslugged row of the template is matched, and made unique, by this column. */
export const MATCH_COLUMN: Partial<Record<PackKind, string>> = { skillTrees: "race", tracks: "title" };
