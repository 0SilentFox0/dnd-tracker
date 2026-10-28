import { z } from "zod";

import { type AiToolContext, defineTool } from "./define";

import "server-only";
import { AI_LIMITS } from "@/lib/constants/ai";
import { SYNC_SCOPES } from "@/lib/constants/source-sync";
import { contentImportSchema } from "@/lib/schemas/content-import";
import { saveSkillTreeSchema } from "@/lib/schemas/skills";
import { sourceSyncApplySchema } from "@/lib/schemas/source-sync";
import { readCampaignRules, updateCampaignRules } from "@/lib/server/campaigns/rules";
import type { AnyContentResource, ContentKind } from "@/lib/server/content/define-resource";
import { ContentError, parseInput } from "@/lib/server/content/errors";
import { compactImportReport, importContent } from "@/lib/server/content/import/import-content";
import { CONTENT_RESOURCES } from "@/lib/server/content/resources";
import { EXTRA, KINDS, SCHEMA_TARGETS } from "@/lib/server/content/schema-targets";
import { createContent, getContent, listContent, removeContent, updateContent } from "@/lib/server/content/service";
import { readSkillTree, saveSkillTree } from "@/lib/server/skills/skill-tree-service";
import { applySource, getSourceDiff } from "@/lib/server/templates/sync/service";
import { type Actor, tokenActorOf } from "@/lib/utils/api/actor";
import { IMPORT_KINDS, IMPORT_MODES } from "@/lib/utils/content/import/kinds";
import { RulesetPatchSchema } from "@/lib/utils/rules/schema";
import type { SourceDiff } from "@/types/campaigns";

const kindSchema = z.enum(KINDS);

const resourceOf = (kind: ContentKind) => CONTENT_RESOURCES[kind] as AnyContentResource;

const toolActor = (ctx: AiToolContext): Actor => tokenActorOf(ctx);

const treeView = (tree: { id: string; race: string; skills: unknown }) => ({ id: tree.id, race: tree.race, skills: tree.skills });

const DEFAULT_LIMIT = 20;

function pageDiff(diff: SourceDiff, offset: number, limit: number) {
  const total = diff.items.length;

  const counts: Record<string, number> = {};

  for (const { scope } of diff.items) counts[scope] = (counts[scope] ?? 0) + 1;

  // shrink the page until the JSON fits: define.ts clipping would cut it mid-structure
  for (let n = limit; ; n = Math.max(1, Math.floor(n / 2))) {
    const end = Math.min(offset + n, total);

    const page = { ...diff, total, offset, items: diff.items.slice(offset, end), counts, nextOffset: end < total ? end : null };

    if (n === 1 || JSON.stringify(page).length <= AI_LIMITS.toolResultChars) return page;
  }
}

const OPS = ["list", "get", "create", "update", "delete"] as const;

export const contentKindsTool = defineTool({
  name: "content_kinds",
  title: "Види контенту кампанії",
  description:
    "Перелік видів контенту, якими можна керувати (юніти, раси, заклинання, скіли, артефакти…): назва, опис, поля у списку й доступні операції. Додатково: abilities (здібності), rules (правила кампанії), skill-tree (дерево скілів раси). Почни звідси.",
  scopes: ["content:read"],
  input: z.object({}),
  handler: async () => ({
    kinds: KINDS.map((kind) => {
      const r = resourceOf(kind);

      return { kind, label: r.label, description: r.description, listFields: r.listFields, ops: OPS };
    }),
    extra: EXTRA,
  }),
});

export const contentSchemaTool = defineTool({
  name: "content_schema",
  title: "JSON-схема контенту",
  description:
    'JSON-схема тіла create/update для виду контенту (або "abilities", "rules", "skill-tree"). Виклич перед content_create/content_update. Для здібностей: kind "abilities", а схему конкретного ефекту — з effectKind.',
  scopes: ["content:read"],
  input: z.object({ kind: z.enum(SCHEMA_TARGETS), op: z.enum(["create", "update"]).optional(), effectKind: z.string().optional() }),
  handler: async (_ctx, input) => (await import("@/lib/server/content/tool-schemas")).contentSchema(input),
});

export const contentListTool = defineTool({
  name: "content_list",
  title: "Список контенту",
  description:
    "Сторінка записів виду контенту: { total, offset, items: [{ id, name, …короткі поля }] }. Повні дані запису — content_get. Фільтр query залежить від виду (наприклад skills: { mainSkillId }). Більше 50 записів — користуйся offset.",
  scopes: ["content:read"],
  input: z.object({
    kind: kindSchema,
    query: z.record(z.string(), z.string()).optional(),
    limit: z.number().int().min(1).max(50).optional(),
    offset: z.number().int().min(0).optional(),
  }),
  handler: async (ctx, { kind, query, limit = DEFAULT_LIMIT, offset = 0 }) => {
    const r = resourceOf(kind);

    const result = await listContent(r, toolActor(ctx), new URLSearchParams(query));

    if (!Array.isArray(result)) throw new ContentError("Список має неочікуваний формат", 500);

    const rows = result as Array<Record<string, unknown>>;

    const items = rows.slice(offset, offset + limit).map((row) => ({
      id: row.id,
      name: row.name ?? row.title,
      ...Object.fromEntries(r.listFields.map((f) => [f, row[f]])),
    }));

    return { total: rows.length, offset, items };
  },
});

export const contentGetTool = defineTool({
  name: "content_get",
  title: "Запис контенту",
  description: "Повний запис за id (id бери з content_list).",
  scopes: ["content:read"],
  input: z.object({ kind: kindSchema, id: z.string().min(1) }),
  handler: (ctx, { kind, id }) => getContent(resourceOf(kind), toolActor(ctx), id),
});

export const contentCreateTool = defineTool({
  name: "content_create",
  title: "Створити запис контенту",
  description:
    'Створює запис. Спершу візьми схему через content_schema(kind, "create"). Посилання (raceId, groupId, knownSpells…) — id цієї ж кампанії з content_list. Помилки валідації повертаються зі шляхами полів — виправ і повтори.',
  scopes: ["content:write"],
  input: z.object({ kind: kindSchema, data: z.record(z.string(), z.unknown()) }),
  handler: (ctx, { kind, data }) => createContent(resourceOf(kind), toolActor(ctx), data),
});

export const contentUpdateTool = defineTool({
  name: "content_update",
  title: "Змінити запис контенту",
  description: 'Оновлює запис частковим патчем: передавай лише змінені поля. Схема — content_schema(kind, "update"). Id бери з content_list.',
  scopes: ["content:write"],
  input: z.object({ kind: kindSchema, id: z.string().min(1), patch: z.record(z.string(), z.unknown()) }),
  handler: (ctx, { kind, id, patch }) => updateContent(resourceOf(kind), toolActor(ctx), id, patch),
});

export const contentDeleteTool = defineTool({
  name: "content_delete",
  title: "Видалити запис контенту",
  description: "Видаляє один запис за id. Незворотно; масового видалення немає. Перед видаленням переконайся, що це саме той запис (content_get).",
  scopes: ["content:write"],
  input: z.object({ kind: kindSchema, id: z.string().min(1) }),
  handler: async (ctx, { kind, id }) => {
    await removeContent(resourceOf(kind), toolActor(ctx), id);

    return { ok: true };
  },
});

export const getRulesTool = defineTool({
  name: "get_rules",
  title: "Правила кампанії",
  description: "Повний набір правил кампанії (ruleset) зі значеннями за замовчуванням. Схема — content_schema(kind: \"rules\").",
  scopes: ["content:read"],
  input: z.object({}),
  handler: (ctx) => readCampaignRules(toolActor(ctx)),
});

export const updateRulesTool = defineTool({
  name: "update_rules",
  title: "Змінити правила кампанії",
  description: "Частковий патч правил: не вказані поля лишаються як були. Схема патча — content_schema(kind: \"rules\"). Повертає правила після зміни.",
  scopes: ["content:write"],
  input: z.object({ patch: z.record(z.string(), z.unknown()) }),
  handler: (ctx, { patch }) => updateCampaignRules(toolActor(ctx), parseInput(RulesetPatchSchema, patch, "Некоректний патч правил")),
});

export const getSkillTreeTool = defineTool({
  name: "get_skill_tree",
  title: "Дерево скілів раси",
  description: "Дерево скілів раси за її назвою (race): { id, race, skills }. Посилається на id головних скілів і скілів з бібліотеки. Схема — content_schema(kind: \"skill-tree\").",
  scopes: ["content:read"],
  input: z.object({ race: z.string().min(1) }),
  handler: async (ctx, { race }) => {
    const tree = await readSkillTree(toolActor(ctx), race);

    return tree ? treeView(tree) : `Дерева для раси «${race}» ще немає. Створи його через save_skill_tree.`;
  },
});

export const saveSkillTreeTool = defineTool({
  name: "save_skill_tree",
  title: "Зберегти дерево скілів раси",
  description:
    'Зберігає дерево скілів раси цілком (створює, якщо ще немає): { race, skills: { mainSkills, ultimateSkill } }. Існуюче дерево замінюється — спершу get_skill_tree. Схема — content_schema(kind: "skill-tree"); id головних скілів і скілів — з content_list. Помилки дерева повертаються списком.',
  scopes: ["content:write"],
  input: saveSkillTreeSchema,
  handler: async (ctx, input) => treeView(await saveSkillTree(toolActor(ctx), input)),
});

export const sourceDiffTool = defineTool({
  name: "source_diff",
  title: "Зміни в джерелі кампанії",
  description:
    "Що змінилося в шаблоні (або кампанії), з якого створено цю кампанію: items зі scope (таблиця, rules або settings), key, name, status (new | updated | conflict | deletedInSource | deletedLocally), changedFields, sourceHash, requires. Для застосування передай scope, key, sourceHash і status у source_apply. Сторінками: scope звужує, offset/limit (за замовчуванням 20, до 50) гортають; total — усього пунктів, counts — за scope, nextOffset — з чого продовжити (null — кінець).",
  scopes: ["content:read"],
  input: z.object({
    scope: z.enum(SYNC_SCOPES).optional(),
    offset: z.number().int().min(0).default(0),
    limit: z.number().int().min(1).max(50).default(DEFAULT_LIMIT),
  }),
  handler: async (ctx, { scope, offset, limit }) => pageDiff(await getSourceDiff(toolActor(ctx), scope), offset, limit),
});

export const sourceApplyTool = defineTool({
  name: "source_apply",
  title: "Застосувати зміни джерела",
  description:
    "apply — пункти з source_diff, які взяти з джерела (залежності додаються самі, див. autoAdded); ignore — сховати пункти до наступної зміни джерела. Конфлікт у apply = взяти версію джерела замість своєї. Помилка «Джерело змінилося» — повтори source_diff.",
  scopes: ["content:write"],
  input: sourceSyncApplySchema,
  handler: (ctx, input) => applySource(toolActor(ctx), input),
});

export const contentImportTool = defineTool({
  name: "content_import",
  title: "Імпорт контенту",
  description:
    "Масове створення/оновлення записів одного виду (до 500 рядків за виклик) — для перенесення кампанії з іншого сервісу. rows — об'єкти з полями як у тілі create (content_schema), але посилання на інші записи можна давати назвами, а числа/списки — текстом, як у CSV; у skills поля плоскі: name, description, icon, image, mainSkillId, spellId, spellGroupId, grantedSpellId, abilities. mode: create (дубль назви — помилка рядка) | update (за назвою: оновити, інакше створити) | skip (наявні пропустити). Спершу виклич з dryRun: true — перевірка без запису. Відповідь: counts і до 50 рядків з помилками/попередженнями (omitted — скільки ще).",
  scopes: ["content:write"],
  input: z.object({
    kind: z.enum(IMPORT_KINDS),
    rows: contentImportSchema.shape.rows,
    mode: z.enum(IMPORT_MODES).default("create"),
    dryRun: z.boolean().default(false),
  }),
  handler: async (ctx, { kind, rows, mode, dryRun }) => compactImportReport(await importContent(toolActor(ctx), kind, { rows, mode, dryRun })),
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
