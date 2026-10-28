import { z } from "zod";

import type { AssistantActionDef } from "../types";
import { jsonContent } from "./content-snapshot";

import "server-only";
import { CONTENT_RESOURCES } from "@/lib/server/content/resources";
import { EXTRA, KINDS, SCHEMA_TARGETS } from "@/lib/server/content/schema-targets";
import { contentSchema } from "@/lib/server/content/tool-schemas";
import { readSkillTree } from "@/lib/server/skills/skill-tree-service";
import { NEED } from "@/lib/utils/api/need";

export function createContentReadActions(): AssistantActionDef[] {
  return [
    { id: "content.kinds", title: "Види контенту", description: "Види та доступні операції чинного контенту", need: NEED.read("dm"), input: z.object({}), effect: "read", execute: async () => ({ data: jsonContent({ kinds: KINDS.map((kind) => { const r = CONTENT_RESOURCES[kind];

 return { kind, label: r.label, description: r.description, listFields: r.listFields, ops: ["list", "get", "create", "update", "delete", ...(r.removeAll ? ["delete-all"] : [])] }; }), extra: EXTRA }), affected: [], warnings: [] }) },
    { id: "content.schema", title: "Схема контенту", description: "Чинна схема create/update або здібностей", need: NEED.read("dm"), input: z.object({ kind: z.enum(SCHEMA_TARGETS), op: z.enum(["create", "update"]).optional(), effectKind: z.string().optional() }), effect: "read", execute: async (_caller, input) => ({ data: jsonContent(contentSchema(input as Parameters<typeof contentSchema>[0])), affected: [], warnings: [] }) },
    { id: "skill-trees.get", title: "Дерево раси", description: "Чинне дерево за назвою раси", need: NEED.read("member"), input: z.object({ race: z.string().min(1) }), effect: "read", execute: async (caller, input) => {
      const row = await readSkillTree(caller.actor, (input as { race: string }).race);

      return { data: jsonContent(row ? { id: row.id, race: row.race, skills: row.skills } : null), affected: [], warnings: [] };
    } },
    { id: "content.media", title: "Додати медіа в редакторі", description: "Чинний UI для іконок і файлів музики", need: NEED.write, input: z.object({ kind: z.enum(["artifacts", "artifact-sets", "tracks"]) }), effect: "handoff", execute: async (caller, input) => ({ href: `/campaigns/${caller.actor.campaignId}/dm/${(input as { kind: string }).kind === "tracks" ? "music" : (input as { kind: string }).kind}`, reason: "Додайте іконку або файл у чинному редакторі, потім повторіть зміну інших полів без медіа." }) },
  ];
}
