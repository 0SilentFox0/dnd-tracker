import type { ZodType } from "zod";

import "server-only";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { contentImportSchema, deleteSpellsByLevelSchema, importUnitsSchema, reorderTracksSchema, saveSkillTreeSchema, sourceSyncApplySchema, sourceSyncQuerySchema } from "@/lib/schemas";
import { OwnerKind } from "@/lib/utils/abilities/read";
import type { ActorNeed } from "@/lib/utils/api/actor";
import { NEED } from "@/lib/utils/api/need";
import { IMPORT_KINDS } from "@/lib/utils/content/import/kinds";
import { RulesetPatchSchema } from "@/lib/utils/rules/schema";

export type OperationResponse = "item" | "list" | "ok" | "object" | "csv";

export interface ContentOperation {
  id: string;
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  path: string;
  summary: string;
  description: string;
  tag: string;
  need: ActorNeed;
  body?: ZodType;
  invalidBody?: string;
  query?: ZodType;
  response: OperationResponse;
  errors?: readonly (409 | 422)[];
  pathEnums?: Record<string, readonly string[]>;
}

type OperationRow = Omit<ContentOperation, "id">;

const defineOperations = <T extends Record<string, OperationRow>>(rows: T) =>
  Object.fromEntries(Object.entries(rows).map(([id, row]) => [id, { ...row, id }])) as { [K in keyof T & string]: T[K] & { id: K } };

const OPERATION_ROWS = {
  "rules.get": { method: "GET", path: "/rules", summary: "Campaign rules", description: "The full campaign ruleset, defaults included.", need: NEED.read("member"), response: "object", tag: "Campaign" },
  "rules.update": { method: "PATCH", path: "/rules", summary: "Update rules", description: "Partial rules patch; fields not given stay as they were.", need: NEED.write, body: RulesetPatchSchema, response: "object", invalidBody: API_ERRORS.INVALID_RULES, tag: "Campaign" },
  "campaign.export": { method: "GET", path: "/export", summary: "Export bundle", description: "All campaign content and rules as one JSON — a backup or the base of a template.", need: NEED.read("dm"), response: "object", tag: "Campaign" },
  "source.diff": { method: "GET", path: "/source-sync", summary: "Source changes", description: "Difference between the campaign and the template (or campaign) it was created from: new, updated, conflicting and deleted records, rules by mechanic, settings. query scope limits it to one table.", need: NEED.read("dm"), query: sourceSyncQuerySchema, response: "object", tag: "Campaign" },
  "source.apply": { method: "POST", path: "/source-sync", summary: "Apply source changes", description: "apply — diff items (scope, key, sourceHash) to take from the source; dependencies are added automatically. ignore — hide items until the source changes again. 409 — the source changed, take a fresh diff.", need: NEED.write, body: sourceSyncApplySchema, response: "object", errors: [409], tag: "Campaign" },
  "skill-trees.list": { method: "GET", path: "/skill-trees", summary: "Skill trees", description: "Skill trees of all campaign races.", need: NEED.read("member"), response: "list", tag: "Skills" },
  "skill-trees.save": { method: "PATCH", path: "/skill-trees/{treeId}", summary: "Save skill tree", description: "Saves a race tree, creating it if missing. Character progress is carried over. 409 — progress changed concurrently, retry.", need: NEED.write, body: saveSkillTreeSchema, response: "object", errors: [409], invalidBody: API_ERRORS.INVALID_SKILL_TREE, tag: "Skills" },
  "skills.duplicate": { method: "POST", path: "/skills/{skillId}/duplicate", summary: "Duplicate skill", description: "A copy of the skill with a \"(copy)\" suffix in the author's language.", need: NEED.write, response: "item", tag: "Skills" },
  "spells.remove-from-group": { method: "POST", path: "/spells/{spellId}/remove-from-group", summary: "Remove spell from group", description: "Detaches the spell from its school of magic.", need: NEED.write, response: "item", tag: "Spells" },
  "spell-groups.remove-all-spells": { method: "POST", path: "/spells/groups/{groupId}/remove-all-spells", summary: "Clear school", description: "Detaches all spells from the school of magic; the spells themselves stay.", need: NEED.write, response: "ok", tag: "Schools of magic" },
  "spells.delete-by-level": { method: "DELETE", path: "/spells/delete-by-level", summary: "Delete spells of a level", description: "UI only.", need: NEED.writeAll, body: deleteSpellsByLevelSchema, response: "ok", tag: "Spells" },
  "units.import": { method: "POST", path: "/units/import", summary: "Import units", description: "Bulk add/update of units by name; returns a report.", need: NEED.write, body: importUnitsSchema, response: "object", tag: "Units" },
  "content.import": { method: "POST", path: "/content-import/{kind}", summary: "Import content", description: "Bulk import of up to 500 rows of the given kind. mode: create (duplicate name — row error) | update (update by name, otherwise create) | skip (skip existing); dryRun — validation only. References — by name or id in this campaign. Response: status and errors per row, counts. Valid rows are written, invalid ones go to the report.", need: NEED.write, body: contentImportSchema, response: "object", pathEnums: { kind: IMPORT_KINDS }, tag: "Import and export" },
  "content.import-example": { method: "GET", path: "/content-import/{kind}/example.csv", summary: "Import CSV example", description: "CSV with the field headers of the given kind and two example rows; references are filled with the name of the first existing record of the campaign.", need: NEED.read("dm"), response: "csv", pathEnums: { kind: IMPORT_KINDS }, tag: "Import and export" },
  "content.export": { method: "GET", path: "/content-export/{kind}", summary: "Export CSV", description: "All records of the given kind in import format: headers are field labels, references are names, nested data is JSON in a cell. A changed file imports back (mode update).", need: NEED.read("dm"), response: "csv", pathEnums: { kind: IMPORT_KINDS }, tag: "Import and export" },
  "tracks.reorder": { method: "PUT", path: "/tracks/order", summary: "Track order", description: "The full list of campaign track ids in the new order.", need: NEED.write, body: reorderTracksSchema, response: "list", tag: "Battle music" },
  "abilities.sources": { method: "GET", path: "/abilities/sources", summary: "Ability owners", description: "List of skills, races, artifacts, sets, units, classes and feats (kind, id, name) — sources for copying abilities.", need: NEED.read("dm"), response: "object", tag: "Campaign" },
  "abilities.get": { method: "GET", path: "/abilities/{kind}/{ownerId}", summary: "Owner abilities", description: "Abilities of one owner; kind: skill | race | artifact | artifactSet | unit | class | feat.", need: NEED.read("dm"), response: "object", pathEnums: { kind: Object.values(OwnerKind) }, tag: "Campaign" },
} satisfies Record<string, OperationRow>;

export const CONTENT_OPERATIONS = defineOperations(OPERATION_ROWS);

export const CONTENT_OPERATION_LIST: ContentOperation[] = Object.values(CONTENT_OPERATIONS);
