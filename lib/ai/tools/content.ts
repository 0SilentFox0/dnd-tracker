import { z } from "zod";

import { aliasHandler } from "./alias-handler";
import { defineTool } from "./define";

import { SYNC_SCOPES } from "@/lib/constants/source-sync";
import { contentImportSchema } from "@/lib/schemas/content-import";
import { saveSkillTreeSchema } from "@/lib/schemas/skills";
import { sourceSyncApplySchema } from "@/lib/schemas/source-sync";
import { KINDS, SCHEMA_TARGETS } from "@/lib/server/content/schema-targets";
import { IMPORT_KINDS, IMPORT_MODES } from "@/lib/utils/content/import/kinds";

const kindSchema = z.enum(KINDS);

const DEFAULT_LIMIT = 20;

export const contentKindsTool = defineTool({
  name: "content_kinds",
  title: "Campaign content kinds",
  description:
    "List of content kinds you can manage (units, races, spells, skills, artifacts…): name, description, list fields and available operations. Also: abilities, rules (campaign rules), skill-tree (race skill tree). Start here.",
  scopes: ["content:read"],
  input: z.object({}),
  handler: aliasHandler("content_kinds"),
});

export const contentSchemaTool = defineTool({
  name: "content_schema",
  title: "Content JSON schema",
  description:
    'JSON schema of the create/update body for a content kind (or "abilities", "rules", "skill-tree"). Call before content_create/content_update. For abilities: kind "abilities", and the schema of a specific effect comes from effectKind.',
  scopes: ["content:read"],
  input: z.object({ kind: z.enum(SCHEMA_TARGETS), op: z.enum(["create", "update"]).optional(), effectKind: z.string().optional() }),
  handler: aliasHandler("content_schema"),
});

export const contentListTool = defineTool({
  name: "content_list",
  title: "Content list",
  description:
    "A page of records of a content kind: { total, offset, items: [{ id, name, …short fields }] }. Full record data: content_get. The query filter depends on the kind (e.g. skills: { mainSkillId }). For more than 50 records use offset.",
  scopes: ["content:read"],
  input: z.object({
    kind: kindSchema,
    query: z.record(z.string(), z.string()).optional(),
    limit: z.number().int().min(1).max(50).optional(),
    offset: z.number().int().min(0).optional(),
  }),
  handler: aliasHandler("content_list"),
});

export const contentGetTool = defineTool({
  name: "content_get",
  title: "Content record",
  description: "Full record by id (take the id from content_list).",
  scopes: ["content:read"],
  input: z.object({ kind: kindSchema, id: z.string().min(1) }),
  handler: aliasHandler("content_get"),
});

export const contentCreateTool = defineTool({
  name: "content_create",
  title: "Create content record",
  description:
    'Creates a record. First get the schema via content_schema(kind, "create"). References (raceId, groupId, knownSpells…) are ids from this same campaign taken from content_list. Validation errors come back with field paths — fix and retry.',
  scopes: ["content:write"],
  input: z.object({ kind: kindSchema, data: z.record(z.string(), z.unknown()) }),
  handler: aliasHandler("content_create"),
});

export const contentUpdateTool = defineTool({
  name: "content_update",
  title: "Update content record",
  description: 'Updates a record with a partial patch: pass only changed fields. Schema: content_schema(kind, "update"). Take the id from content_list.',
  scopes: ["content:write"],
  input: z.object({ kind: kindSchema, id: z.string().min(1), patch: z.record(z.string(), z.unknown()) }),
  handler: aliasHandler("content_update"),
});

export const contentDeleteTool = defineTool({
  name: "content_delete",
  title: "Delete content record",
  description: "Deletes one record by id. Irreversible; there is no bulk delete. Before deleting make sure it is the right record (content_get).",
  scopes: ["content:write"],
  input: z.object({ kind: kindSchema, id: z.string().min(1) }),
  handler: aliasHandler("content_delete"),
});

export const getRulesTool = defineTool({
  name: "get_rules",
  title: "Campaign rules",
  description: "Full set of campaign rules (ruleset) with default values. Schema: content_schema(kind: \"rules\").",
  scopes: ["content:read"],
  input: z.object({}),
  handler: aliasHandler("get_rules"),
});

export const updateRulesTool = defineTool({
  name: "update_rules",
  title: "Update campaign rules",
  description: "Partial rules patch: fields not given stay as they were. Patch schema: content_schema(kind: \"rules\"). Returns the rules after the change.",
  scopes: ["content:write"],
  input: z.object({ patch: z.record(z.string(), z.unknown()) }),
  handler: aliasHandler("update_rules"),
});

export const getSkillTreeTool = defineTool({
  name: "get_skill_tree",
  title: "Race skill tree",
  description: "Skill tree of a race by its name (race): { id, race, skills }. References ids of main skills and library skills. Schema: content_schema(kind: \"skill-tree\").",
  scopes: ["content:read"],
  input: z.object({ race: z.string().min(1) }),
  handler: aliasHandler("get_skill_tree"),
});

export const saveSkillTreeTool = defineTool({
  name: "save_skill_tree",
  title: "Save race skill tree",
  description:
    'Saves a race skill tree as a whole (creates it if missing): { race, skills: { mainSkills, ultimateSkill } }. An existing tree is replaced — call get_skill_tree first. Schema: content_schema(kind: "skill-tree"); ids of main skills and skills come from content_list. Tree errors are returned as a list.',
  scopes: ["content:write"],
  input: saveSkillTreeSchema,
  handler: aliasHandler("save_skill_tree"),
});

export const sourceDiffTool = defineTool({
  name: "source_diff",
  title: "Campaign source changes",
  description:
    "What changed in the template (or campaign) this campaign was created from: items with scope (table, rules or settings), key, name, status (new | updated | conflict | deletedInSource | deletedLocally), changedFields, sourceHash, requires. To apply, pass scope, key, sourceHash and status to source_apply. Paged: scope narrows, offset/limit (default 20, up to 50) page through; total is the number of items, counts is per scope, nextOffset is where to continue (null = end).",
  scopes: ["content:read"],
  input: z.object({
    scope: z.enum(SYNC_SCOPES).optional(),
    offset: z.number().int().min(0).default(0),
    limit: z.number().int().min(1).max(50).default(DEFAULT_LIMIT),
  }),
  handler: aliasHandler("source_diff"),
});

export const sourceApplyTool = defineTool({
  name: "source_apply",
  title: "Apply source changes",
  description:
    "apply — items from source_diff to take from the source (dependencies are added automatically, see autoAdded); ignore — hide items until the source changes again. A conflict in apply means taking the source version instead of your own. On a source-changed error, repeat source_diff.",
  scopes: ["content:write"],
  input: sourceSyncApplySchema,
  handler: aliasHandler("source_apply"),
});

export const contentImportTool = defineTool({
  name: "content_import",
  title: "Import content",
  description:
    "Bulk create/update of records of one kind (up to 500 rows per call) — for moving a campaign from another service. rows are objects with the fields of the create body (content_schema), but references to other records may be given by name, and numbers/lists as text, like in CSV; for skills the fields are flat: name, description, icon, image, mainSkillId, spellId, spellGroupId, grantedSpellId, abilities. mode: create (duplicate name is a row error) | update (by name: update, otherwise create) | skip (skip existing). First call with dryRun: true — validation without writing. Response: counts and up to 50 rows with errors/warnings (omitted — how many more).",
  scopes: ["content:write"],
  input: z.object({
    kind: z.enum(IMPORT_KINDS),
    rows: contentImportSchema.shape.rows,
    mode: z.enum(IMPORT_MODES).default("create"),
    dryRun: z.boolean().default(false),
  }),
  handler: aliasHandler("content_import"),
});

export const CONTENT_TOOLS = [
  contentKindsTool,
  contentSchemaTool,
  contentListTool,
  contentGetTool,
  contentCreateTool,
  contentUpdateTool,
  contentDeleteTool,
  contentImportTool,
  getRulesTool,
  updateRulesTool,
  getSkillTreeTool,
  saveSkillTreeTool,
  sourceDiffTool,
  sourceApplyTool,
];

// T14 connects these aliases together with trusted caller identity and catalog.
export { dispatchContentAlias } from "@/lib/server/assistant/actions/content-aliases";
