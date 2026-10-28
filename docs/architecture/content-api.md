# API контенту (REST, OpenAPI, MCP)

Спека: `docs/superpowers/specs/2026-10-21-constructor-stage2-open-api-design.md` (етап 2 «Конструктора кампаній»).

Контент кампанії можна змінювати з UI, через REST з токеном і через MCP. Усі три шляхи проходять через одні й ті самі Zod-схеми, сервіс і перевірки прав. До контенту належать раси, юніти, заклинання, школи магії, основні скіли, скіли, артефакти, сети, треки музики, а також правила кампанії й дерева скілів.

## Шари

- **Реєстр ресурсів** — `lib/server/content/resources/*.ts`, `CONTENT_RESOURCES`. Опис ресурсу — `ContentResource` (`define-resource.ts`):
  - `kind`, `label`, `description`, `path`, `idParam`;
  - `schemas` — `create`, `update`, а також `query?` і `apiCreate?` для документа;
  - `access` (`member` | `dm`) для `list`/`item`;
  - `invalidates` — кеш-теги;
  - `listFields` — короткі поля для `content_list`;
  - `errors?` (409/422);
  - функції `list`/`find`/`create`/`update`/`remove`/`removeAll?`/`toItem?`.
- **Нестандартні операції** — `lib/server/content/operations.ts`, `CONTENT_OPERATIONS`: правила, експорт, дерева скілів, дублювання скіла, імпорт юнітів, порядок треків, видалення заклинань за рівнем, каталог здібностей та інші. Кожна операція має `method`, `path`, `need`, `tag`, `body?`, `query?`, `response`. `id` дорівнює ключу.
- **Сервіс** — `lib/server/content/service.ts` (`listContent`/`getContent`/`createContent`/`updateContent`/`removeContent`/`removeAllContent`):
  - кожна функція спершу викликає `assertCan(actor, need)` (`access.ts`);
  - пошук завжди за `{ id, campaignId }`, запис іншої кампанії = 404;
  - відповіді `create`/`update` проходять через `toItem`, тож форма та сама, що в `GET`;
  - після запису скидаються теги `invalidates`.

  Правила (`lib/server/campaigns/rules.ts`) і дерева скілів (`lib/server/skills/skill-tree-service.ts`) — окремі сервіси з тією ж перевіркою прав.
- **Актор** — `lib/utils/api/actor.ts`: `{ campaignId, userId, isDM, via: "session" | "token", scopes }`. `scopes` = `null` для сесії, права токена для Bearer.
  - `resolveActor`: за наявності `Authorization: Bearer` діє лише токен, без відкату до cookie. Недійсний токен → 401; інша кампанія, немає права або `sessionOnly` → 403. Через токен актор = ДМ.
  - Потреби — пресети `NEED` у `lib/utils/api/need.ts`: `read(access)`, `write`, `writeAll` (лише сесія).
- **Роути** — `lib/utils/api/content-routes.ts`:
  - `collectionRoutes(r)` → `GET`/`POST`/`DELETE` (масове видалення, лише сесія);
  - `itemRoutes(r)` → `GET`/`PATCH`/`DELETE`;
  - `operationRoute(op, fn)` бере `need` з реєстру, сам парсить `op.body` і передає `{ actor, params, req, body }`.
  - `route.ts` — один рядок. `ContentError` перетворюється на `{ error, issues? }`.
- **Права токена** (`lib/constants/ai.ts`): `ai`, `content:read`, `content:write`. `content:write` включає `content:read`. Права задаються при створенні токена на `/dm/ai` і потім не змінюються. На шаблоні доступні лише права на контент.

## OpenAPI

`GET /api/openapi.json` — публічний документ OpenAPI 3.1 (~100 КБ), статичний (`force-static`, `s-maxage`).
- Його будує `lib/server/content/openapi.ts` з обох реєстрів.
- Тіла запитів — ті самі Zod-схеми через `toJsonSchemas` (`json-schema.ts`, локальний реєстр Zod). Спільні підсхеми підставляються через `$ref`: здібність, тригер, умова, кожен вид ефекту, `SpellFx`, `WeaponStats`, `RulesetPatch`.
- Помилки й успішні відповіді винесені в `components.responses`.
- Кожна операція має `x-scopes`. Операції `sessionOnly` в документ не входять.
- Тест звіряє кожен шлях документа з наявним `route.ts`.

## MCP-інструменти контенту

`lib/ai/tools/content.ts`. `/api/mcp` реєструє лише інструменти, дозволені правами токена (`toolsFor(scopes)`). Чат усередині застосунку має тільки `ai` і цих інструментів не бачить.

| Інструмент | Право |
|---|---|
| `content_kinds`, `content_schema`, `content_list`, `content_get`, `get_rules`, `get_skill_tree` | `content:read` |
| `content_create`, `content_update`, `content_delete`, `update_rules`, `save_skill_tree` | `content:write` |

- `content_schema({ kind, op, effectKind })` (`lib/server/content/tool-schemas.ts`) віддає самодостатню JSON Schema з `$defs`. Здібності й ефекти замінено заглушками з підказкою; вони запитуються окремо: `kind: "abilities"`, а потім `effectKind`. Тож кожна відповідь вміщається в `AI_LIMITS.toolResultChars` (24 000; найбільша — ефект `flag`, ~14 КБ).
- `content_list` повертає до 50 записів (`id`, `name`, `listFields`) і `total`, сторінки — через `offset`.
- Помилки валідації повертаються агентові текстом `шлях: повідомлення`. Інші помилки — загальним текстом, без сирих повідомлень БД.
- Масового видалення, імпорту й експорту бандла в MCP немає. Бекап — `GET /export` з `content:read`.

## Як додати новий вид контенту

1. Схеми в `lib/schemas/<домен>.ts`.
2. Ресурс `lib/server/content/resources/<вид>.ts` (`defineResource`) і рядок у `CONTENT_RESOURCES`.
3. `route.ts` колекції й запису: `export const { GET, POST } = collectionRoutes(r)` / `itemRoutes(r)`.
4. REST, OpenAPI і MCP (`content_*` з новим `kind`) з'являються автоматично. Тести реєстру й документа перевірять шляхи.

Нестандартна дія — рядок у `CONTENT_OPERATIONS` + `operationRoute` у `route.ts`. Для MCP за потреби — окремий інструмент у `content.ts`.

## Правила

- `campaignId` береться лише з актора або токена, ніколи з тіла запиту. Посилання в тілі (раса, група, сет, скіли, заклинання) перевіряються на належність кампанії (`assertCampaignRefs`).
- Права перевіряються в сервісі (`assertCan`), а не лише в HTTP-шарі. Новий шлях до контенту (інструмент, скрипт) ходить через сервіс.
- Окремих «API-схем» немає: UI, REST, OpenAPI і MCP використовують одні схеми з `lib/schemas`.
- Кожен запис через сервіс скидає кеш-теги свого виду. `revalidateTag` діє лише в межах життя обробника роуту: `/api/mcp` для POST дочитує SSE-відповідь `mcp-handler` до кінця перед поверненням, інакше інструмент виконується вже після повернення `Response` і скидання кешу губиться.
