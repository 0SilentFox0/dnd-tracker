import type { ZodType } from "zod";

import "server-only";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { deleteSpellsByLevelSchema, importUnitsSchema, reorderTracksSchema, saveSkillTreeSchema } from "@/lib/schemas";
import { OwnerKind } from "@/lib/utils/abilities/read";
import type { ActorNeed } from "@/lib/utils/api/actor";
import { NEED } from "@/lib/utils/api/need";
import { RulesetPatchSchema } from "@/lib/utils/rules/schema";

export type OperationResponse = "item" | "list" | "ok" | "object";

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
  "rules.get": { method: "GET", path: "/rules", summary: "Правила кампанії", description: "Повний набір правил кампанії (ruleset) з урахуванням значень за замовчуванням.", need: NEED.read("member"), response: "object", tag: "Кампанія" },
  "rules.update": { method: "PATCH", path: "/rules", summary: "Змінити правила", description: "Частковий патч правил; не вказані поля лишаються як були.", need: NEED.write, body: RulesetPatchSchema, response: "object", invalidBody: API_ERRORS.INVALID_RULES, tag: "Кампанія" },
  "campaign.export": { method: "GET", path: "/export", summary: "Експорт бандла", description: "Увесь контент і правила кампанії одним JSON — бекап або основа шаблону.", need: NEED.read("dm"), response: "object", tag: "Кампанія" },
  "skill-trees.list": { method: "GET", path: "/skill-trees", summary: "Дерева скілів", description: "Дерева скілів усіх рас кампанії.", need: NEED.read("member"), response: "list", tag: "Скіли" },
  "skill-trees.save": { method: "PATCH", path: "/skill-trees/{treeId}", summary: "Зберегти дерево скілів", description: "Зберігає дерево раси; створює його, якщо ще немає. Прогрес персонажів переноситься. 409 — прогрес змінився паралельно, повторіть.", need: NEED.write, body: saveSkillTreeSchema, response: "object", errors: [409], invalidBody: API_ERRORS.INVALID_SKILL_TREE, tag: "Скіли" },
  "skills.duplicate": { method: "POST", path: "/skills/{skillId}/duplicate", summary: "Дублювати скіл", description: "Копія скіла з суфіксом «(копія)».", need: NEED.write, response: "item", tag: "Скіли" },
  "spells.remove-from-group": { method: "POST", path: "/spells/{spellId}/remove-from-group", summary: "Прибрати заклинання з групи", description: "Відв'язує заклинання від школи магії.", need: NEED.write, response: "item", tag: "Заклинання" },
  "spell-groups.remove-all-spells": { method: "POST", path: "/spells/groups/{groupId}/remove-all-spells", summary: "Очистити школу", description: "Відв'язує всі заклинання від школи магії; самі заклинання лишаються.", need: NEED.write, response: "ok", tag: "Школи магії" },
  "spells.delete-by-level": { method: "DELETE", path: "/spells/delete-by-level", summary: "Видалити заклинання рівня", description: "Лише з UI.", need: NEED.writeAll, body: deleteSpellsByLevelSchema, response: "ok", tag: "Заклинання" },
  "units.import": { method: "POST", path: "/units/import", summary: "Імпорт юнітів", description: "Масове додавання/оновлення юнітів за назвою; повертає звіт.", need: NEED.write, body: importUnitsSchema, response: "object", tag: "Юніти" },
  "tracks.reorder": { method: "PUT", path: "/tracks/order", summary: "Порядок треків", description: "Повний список id треків кампанії в новому порядку.", need: NEED.write, body: reorderTracksSchema, response: "list", tag: "Музика бою" },
  "abilities.sources": { method: "GET", path: "/abilities/sources", summary: "Власники здібностей", description: "Список скілів, рас, артефактів, сетів і юнітів (kind, id, name) — джерела для копіювання здібностей.", need: NEED.read("dm"), response: "object", tag: "Кампанія" },
  "abilities.get": { method: "GET", path: "/abilities/{kind}/{ownerId}", summary: "Здібності власника", description: "Здібності одного власника; kind: skill | race | artifact | artifactSet | unit.", need: NEED.read("dm"), response: "object", pathEnums: { kind: Object.values(OwnerKind) }, tag: "Кампанія" },
} satisfies Record<string, OperationRow>;

export const CONTENT_OPERATIONS = defineOperations(OPERATION_ROWS);

export const CONTENT_OPERATION_LIST: ContentOperation[] = Object.values(CONTENT_OPERATIONS);
