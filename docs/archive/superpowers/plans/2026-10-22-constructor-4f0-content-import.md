# Етап 4f-0: імпорт контенту — план реалізації

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** будь-який тип контенту кампанії (юніти, заклинання, скіли, основні скіли, школи магії, раси, класи, артефакти, сети) імпортується з CSV/TSV/JSON через майстер з автомапінгом колонок, перевіркою по рядках і режимами створити / оновити за назвою / пропустити; кожен тип має «Завантажити приклад CSV» і «Експорт CSV» у тому ж форматі; є REST/OpenAPI-операція, MCP-інструмент `content_import`, опційний AI-мапінг ключем ДМ і JSON-перенесення дерев скілів.

**Architecture:** спільне (клієнт + сервер, без `server-only`) ядро `lib/utils/content/import/` — `parseTable` (`csv-parse`), значення полів (`parseFieldValue`), мапінг (`autoMap`/`applyMapping`/`coerceRecord`/`transformRow`), CSV-вивід (`toCsv`/`recordToCells`) і реєстр полів `IMPORT_SPECS` (по файлу на тип). Клієнт парсить файл і надсилає «сирі» клітинки під ключами полів; сервер `importContent` (`lib/server/content/import/`) перетворює їх тим самим кодом, розв'язує посилання за назвою, перевіряє кожен рядок Zod-схемою ресурсу й пише валідні через `resource.create/update` (`CONTENT_RESOURCES`). Роути — `operationRoute` (`content.import`, `content.import-example`, `content.export`) + AI-мапінг через `runContent`. UI — `ContentImportWizard` (4 кроки, `ResponsiveDialog hud`, вантажиться ліниво) і `ContentTransferButtons` на сторінках бібліотеки ДМ.

**Tech Stack:** TypeScript strict, Next.js 16 route handlers, Prisma 6, Zod 4, `csv-parse` 6 (браузерна збірка `csv-parse/browser/esm/sync`), AI SDK (`generateObject`), TanStack Query, React 19, Vitest.

**Spec:** `docs/archive/superpowers/specs/2026-10-22-constructor-stage4-5e-design.md` — розділ «4f-0. Дизайн: імпорт контенту»; «Загальні правила етапу 4» обов'язкові. Контекст: `docs/architecture/content-api.md`, `docs/architecture/ai.md`.

## Global Constraints

- Worktree `/Users/silentfox/Work/dnd-tracker-constructor`, гілка `feat/constructor`; основну папку `/Users/silentfox/Work/dnd-tracker` не чіпати. Міграцій у цьому плані немає.
- **Нульова зміна наявних шляхів:** створення/оновлення через UI, REST (`collectionRoutes`/`itemRoutes`), MCP `content_create/update` і `POST /units/import` поводяться як до плану. Наявні тести (до першого коміту плану) не редагувати; єдиний дозволений виняток — межа розміру OpenAPI `toBeLessThan(130_000)` у `lib/server/content/__tests__/openapi.test.ts`: якщо падає лише вона, підняти до найближчих +5000 і записати в звіт. Падіння будь-якого іншого наявного тесту — баг нового коду.
- Старий CSV `docs/units/units-all.csv` новим шляхом дає ті самі дані юнітів, що й старий імпорт (тест-якір у задачі 3).
- Ліміт — **500 рядків за запит** (`IMPORT_LIMITS.rowsPerRequest`); клієнт ділить файл на частини: перевірка — по 500, запис — по 100 рядків і не більше 3 000 000 байт JSON (тіло запиту Vercel ≤ 4.5 MB).
- AI-ключ ніколи не залишає сервер: не логувати, не повертати, не передавати в промпт; помилки провайдера — через `aiErrorMessage`, у лог — лише статус/ім'я помилки.
- `lib/utils/content/import/**` і `types/content-import.ts` — без `server-only`, без `@/lib/db`, без `next/*`: їх імпортують клієнт, сервер і `tsx`-скрипти. Серверне — лише в `lib/server/content/import/**` (з `import "server-only"`).
- Шари: `route.ts` — один вираз через `operationRoute`/`runContent`; клієнтські запити — лише `lib/api/content-import.ts`; стан і логіка — хуки `lib/hooks/content-import/`; компоненти не імпортують `@/lib/api/*`; ключі запитів — фабрики. Помилки — `ContentError` з текстами `API_ERRORS` (українською).
- Колонку `abilities` читати лише через `lib/utils/abilities/read.ts` (`unitAbilities`, `skillAbilities`, `raceAbilities`, `artifactAbilities`, `artifactSetAbilities`).
- Діалоги — `ResponsiveDialog hud`; сповіщення — `useNotify`; UI українською, ідентифікатори англійською; мінімум коментарів (лише неочевидне «чому»). ESLint: порожні рядки навколо `const`/`let`/`if`/`return`/блоків, `simple-import-sort`, `import/no-cycle` (maxDepth 1), `react-hooks/exhaustive-deps` = error, `no-console` лише `info/warn/error`.
- Тести: під час роботи `pnpm test:run <files>` / `pnpm test:related <files>`; повний `pnpm test:run`, `pnpm lint`, `pnpm build`, battle-sweep — лише в задачі 14. `pnpm build` тип-перевіряє й тести (`tsconfig` включає `**/*.ts(x)`), тож тестовий код має бути коректним за типами (касти `as never` / `as unknown as T` — як у сусідніх тестах).
- Коміти з трейлером `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; `.superpowers/` не комітити.

## Review Focus

1. **CSV з Excel/Google Sheets**: BOM на початку, роздільник `;`, рядки `\r\n`, клітинка в лапках з переносом рядка й подвоєними лапками, рядок з самих роздільників — заголовок «Назва» зіставляється (BOM знято), клітинка з переносом лишається однією клітинкою, порожній рядок пропускається. Тест у задачі 1.
2. **Режим «оновити» з порожніми клітинками**: рядок, що знайшов наявний запис за назвою, але має порожні клітинки (або не має колонки), не скидає ці поля до значень за замовчуванням — у `resource.update` йдуть лише надані поля. Тест у задачі 5.
3. **Експорт → зміна → імпорт** з посиланнями, назви яких містять кому («Вогонь, сильний»), здібностями й CR «1/4»: зворотний імпорт дає ті самі значення (список посилань з'єднується « | », CR — дріб). Тест у задачі 7.
4. **Обрив посеред запису частинами** (друга частина повертає помилку мережі/API): перша частина лишається записаною, майстер показує підсумок записаного й помилку «Записано частин: 1 з 2», а не «все добре» чи порожній екран; кеш списків інвалідовується. Тест у задачі 10.
5. **Посилання з іншим регістром/пробілами або за id** («  гноми » → раса «Гноми», точний id → той самий id; дві раси з однаковою назвою → перша; невідома назва → помилка рядка з полем `raceId`, рядок не записано, решта записана). Тест у задачі 5.

## Рішення щодо неоднозначностей спеку

- **Транзакція.** Ресурси пишуть через глобальний `prisma`, Storage (`persistIcon`) і каскади (`updateRaceCascade`, `syncArtifactSetMembers`) — протягнути одну транзакцію означало б переписати всі 10 ресурсів. Тому: спершу **усі** рядки перевіряються без запису (перетворення, назва, дублі, посилання, Zod), потім валідні пишуться по одному через `resource.create/update`; помилка запису рядка → статус `error` цього рядка, решта продовжує; кеш довідника скидається один раз після запису. Повторний імпорт у режимі «оновити» ідемпотентний.
- **`POST /units/import` не змінюється** (не делегує). Наявний тест `app/api/__tests__/units-import-api.test.ts` закріплює `createMany` і «юніт без раси, якщо раси немає» — вимога «наявні тести без змін» сильніша за «делегує». UI більше його не викликає (`importUnits` і `useUnitImport` прибираються), роут лишається для зовнішніх клієнтів.
- **Операції**: одна `content.import` (`POST /content-import/{kind}`, `pathEnums.kind`) замість `<kind>.import` — id `units.import` уже зайнятий, а OpenAPI-тест звіряє кожен шлях з одним `route.ts` у `[kind]`. Плюс `content.import-example` і `content.export`.
- **Шлях експорту** — `GET /content-export/[kind]` (динамічний сегмент `[kind].csv` у Next неможливий); ім'я файлу `<kind>.csv` дає `Content-Disposition`. Приклад лишається `…/[kind]/example.csv` (статичний сегмент з крапкою).
- **Ключі полів плоскі** (= ключі тіла create); `skills` вкладає `basicInfo`/`spellData`/`mainSkillData` у `ImportSpec.toBody`. Замість одного `example` — `examples: [рядок1, рядок2]` (два рядки прикладу з різними назвами).
- **Перетворення робить сервер.** Клієнт надсилає сирі клітинки під ключами полів (`applyMapping`), сервер — `coerceRecord` (та сама функція `parseFieldValue`), тож помилки рядків мають одне джерело — `dryRun`. `transformRow` = `applyMapping` + `coerceRecord` (тести, скрипти).
- **Посилання** — за назвою (без регістру й крайових пробілів) або за точним id кампанії; кілька записів з однією назвою → перший за `createdAt` (для власного виду — попередження «оновлено перший»).
- **Юніт без колонки «Майстерність» і без CR** при створенні отримує `getProficiencyBonus(рівень)` — як старий CSV-імпорт (`UNITS_IMPORT.toBody`). Колонка «Спасброски» старого формату **не** зіставляється (старий імпорт її ігнорував, значення «+2» — не ключі характеристик).
- **Невідома раса** — помилка рядка (як вимагає спек), а не «юніт без раси».
- **Дублі назв у файлі**: `create`/`update` → другий рядок — помилка; `skip` → пропущено з попередженням. Дублі між частинами ловить лише запис (частина перевірки — 500 рядків).
- **Тип `dice`** — `NdM(+K)` або ціле; «2d8 + STR» не підтримується (поле `dice` є лише в заклинаннях, бонус ігнорується).
- **AI-мапінг** — звичайний роут `…/content-import/[kind]/ai-map` (GET доступність, POST мапінг) через `runContent` з `NEED.writeAll` (лише ДМ із сесії, не в OpenAPI); LLM повертає масив пар `{ header, field }` (структурований вивід провайдерів погано тримає довільні ключі), сервер відкидає невідомі колонки й поля; без ключа — 409 `IMPORT_AI_NO_KEY`.
- **Дерева скілів** — клієнтські експорт/імпорт JSON: файл `{ format: "skill-tree/1", race, skills, names: { id: { name, kind } } }`, при імпорті чужі id замінюються за назвами, збереження — наявною операцією `skill-trees.save`. Нової серверної операції немає.
- **Приклад CSV**: клітинки посилань (`ref`) заповнюються назвою першого наявного запису кампанії (інакше порожні), тож приклад імпортується як є.
- **Експорт**: здібності — через `read.ts`; `weapon` артефакта — `weaponStatsFromRow` лише для слотів зброї; `artifactIds` сету — зі зв'язку; `raceModifiers` заклинання лишаються id (JSON), між кампаніями їх треба правити вручну.
- **Клітинка, цілком обгорнута в лапки** після розбору CSV (`"""текст"""` → `"текст"`), втрачає одну пару лапок — так робив старий парсер, і 6 юнітів `units-all.csv` інакше отримали б інші назви здібностей. Значення, що саме починається й закінчується лапкою, при експорті→імпорті втрачає їх (прийнятно).
- **Скрипт** `scripts/import/import-units.ts` переходить на `parseTable` (замість саморобного парсера); запис — як був (`importUnitsIntoCampaign`).
- **`csv-parse/browser/esm/sync`** працює і в Node (перевірено), і в браузері (вбудований поліфіл `Buffer`); ~113 КБ потрапляють лише в лінивий чанк майстра (`next/dynamic`).
- **Шаблон** — це кампанія з тими самими сторінками бібліотеки ДМ, тож кнопки «Імпорт»/«Експорт CSV» з’являються на шаблоні без окремої роботи; шаблон SRD (4f) заливається тим самим `content.import`.
- **MCP** `content_import` повертає стислий звіт: `counts` + до 50 рядків з помилками/попередженнями + `omitted` (повний звіт не вміщається в `toolResultChars`).

---

## Карта файлів

| Файл | Відповідальність |
|---|---|
| `package.json`, `pnpm-lock.yaml` | `csv-parse` → `dependencies` |
| `types/content-import.ts` (новий) | типи імпорту (поле, специфікація, звіт, таблиця) |
| `lib/utils/content/import/{kinds,table,values,mapping,wizard,index}.ts` (нові) | види/ліміти, CSV/JSON-таблиця й CSV-вивід, значення полів, мапінг, чиста логіка майстра |
| `lib/utils/content/import/fields/{common,units,spells,skills,main-skills,spell-groups,races,classes,artifacts,artifact-sets,index}.ts` (нові) | реєстр полів `IMPORT_SPECS` |
| `lib/utils/units/unit-create-data.ts` (новий), `lib/server/content/resources/units.ts` | дані створення юніта (спільні для ресурсу й тесту еквівалентності) |
| `lib/schemas/content-import.ts` (новий), `lib/schemas/index.ts` | Zod тіла імпорту й AI-мапінгу |
| `lib/constants/api-errors.ts` | `IMPORT_UNKNOWN_KIND`, `IMPORT_ROW_FAILED`, `IMPORT_AI_NO_KEY` |
| `lib/server/content/import/{names,kind,import-content,example,export,csv-response,ai-map}.ts` (нові) | серверний імпорт, приклад, експорт, AI-мапінг |
| `lib/server/content/{operations,openapi}.ts` | операції `content.import*`, `content.export`, відповідь `csv` |
| `app/api/campaigns/[id]/content-import/[kind]/{route.ts, example.csv/route.ts, ai-map/route.ts}`, `app/api/campaigns/[id]/content-export/[kind]/route.ts` (нові) | роути |
| `lib/ai/tools/content.ts` | MCP `content_import` |
| `lib/api/content-import.ts` (новий), `lib/api/units.ts` | клієнт; прибрати `importUnits` |
| `lib/hooks/content-import/{keys,useContentImport,useContentTransferUrls,index}.ts` (нові) | стан майстра, URL |
| `lib/utils/common/download-text.ts` (новий) | завантаження тексту файлом |
| `components/content-import/{ContentImportWizard,ContentTransferButtons,ImportCounts}.tsx`, `components/content-import/steps/{FileStep,ColumnsStep,PreviewStep,ResultStep}.tsx` (нові) | UI майстра й кнопки |
| `app/campaigns/[id]/dm/{units,spells,skills,main-skills,races,classes,artifacts,artifact-sets}/page-client.tsx`, `app/campaigns/[id]/dm/spell-groups/page.tsx` | кнопки «Імпорт»/«Експорт CSV» |
| `components/units/dialogs/UnitImportDialog.tsx`, `lib/hooks/units/useUnitImport.ts` (видалити), `lib/hooks/units/index.ts`, `lib/utils/common/file-import.ts` | прибрати старий UI-імпорт юнітів |
| `scripts/import/import-units.ts` | парсинг через `parseTable` |
| `lib/utils/skills/tree-transfer.ts`, `lib/hooks/skills/useSkillTreeTransfer.ts`, `lib/hooks/skills/index.ts`, `components/skill-tree/SkillTreeTransferButtons.tsx` (нові), `app/campaigns/[id]/dm/skill-trees/page-client.tsx` | JSON дерев скілів |
| `docs/architecture/content-api.md`, `docs/STATUS.md` | документи |

---

### Task 1: `csv-parse`, типи, таблиця й CSV-вивід

**Files:**
- Modify: `package.json`, `pnpm-lock.yaml` (через `pnpm add`)
- Create: `types/content-import.ts`, `lib/utils/content/import/kinds.ts`, `lib/utils/content/import/table.ts`
- Test: `lib/utils/content/import/__tests__/table.test.ts`

**Interfaces — Produces:**

```ts
// types/content-import.ts — усі типи, які споживають задачі 2–13
export type ImportKind = "units" | "spells" | "skills" | "main-skills" | "spell-groups" | "races" | "classes" | "artifacts" | "artifact-sets";
export type ImportMode = "create" | "update" | "skip";
export type ImportFieldType = "string" | "int" | "number" | "bool" | "enum" | "list" | "dice" | "cr" | "ref" | "refList" | "json" | "attacks" | "abilitiesText";
export interface ImportField { key: string; label: string; aliases: readonly string[]; type: ImportFieldType; enumValues?: readonly string[]; enumLabels?: Readonly<Record<string, readonly string[]>>; ref?: ImportKind; required?: boolean; examples: readonly [string, string] }
export type ImportRecord = Record<string, unknown>;
export interface ImportSpec { kind: ImportKind; label: string; fields: readonly ImportField[]; toBody?: (record: ImportRecord, op: "create" | "update") => ImportRecord }
export type ImportMapping = Record<string, string | null>;
export interface ImportIssue { field?: string; level: "error" | "warning"; message: string }
export type ImportRowStatus = "created" | "updated" | "skipped" | "error";
export interface ImportRowResult { row: number; status: ImportRowStatus; name?: string; issues: ImportIssue[] }
export type ImportCounts = Record<ImportRowStatus, number>;
export interface ImportReport { dryRun: boolean; results: ImportRowResult[]; counts: ImportCounts }
export interface ParsedTable { format: "csv" | "json"; headers: string[]; rows: Array<Record<string, unknown>> }
export interface AiMapResult { mapping: ImportMapping; notes: string[] }

// lib/utils/content/import/kinds.ts
export const IMPORT_KINDS: readonly ["units", "spells", "skills", "main-skills", "spell-groups", "races", "classes", "artifacts", "artifact-sets"];
export const IMPORT_MODES: readonly ["create", "update", "skip"];
export const isImportKind: (v: string) => v is ImportKind;
export const IMPORT_LIMITS: { rowsPerRequest: 500; writeChunkRows: 100; chunkBytes: 3_000_000; previewRows: 50; aiSampleRows: 5; aiCellChars: 200; aiHeaders: 100 };

// lib/utils/content/import/table.ts
export class ImportFileError extends Error {}
export function detectDelimiter(firstLine: string): string;            // ";" | "\t" | ","
export function parseTable(text: string, fileName?: string): ParsedTable; // кидає ImportFileError
export function toCsv(headers: readonly string[], rows: ReadonlyArray<readonly string[]>): string; // BOM + ";" + CRLF
export function chunkRows<T>(rows: readonly T[], maxRows: number, maxBytes: number): T[][];
```

- [ ] **Step 1: Перенести `csv-parse` у `dependencies`**

```bash
pnpm add csv-parse@^6.1.0
grep -n '"csv-parse"' package.json
pnpm install --frozen-lockfile
```

Expected: `grep` показує `csv-parse` лише в блоці `"dependencies"` (не в `"devDependencies"`); `pnpm install --frozen-lockfile` завершується без помилки. Якщо `csv-parse` лишився і в `devDependencies` — видалити той рядок вручну й повторити `pnpm install` (без `--frozen-lockfile`), потім знову `pnpm install --frozen-lockfile`.

- [ ] **Step 2: Типи й види**

```ts
// types/content-import.ts
export type ImportKind = "units" | "spells" | "skills" | "main-skills" | "spell-groups" | "races" | "classes" | "artifacts" | "artifact-sets";

export type ImportMode = "create" | "update" | "skip";

export type ImportFieldType = "string" | "int" | "number" | "bool" | "enum" | "list" | "dice" | "cr" | "ref" | "refList" | "json" | "attacks" | "abilitiesText";

export interface ImportField {
  key: string;
  label: string;
  aliases: readonly string[];
  type: ImportFieldType;
  enumValues?: readonly string[];
  /** accepted labels per enum value; the first one is shown in hints */
  enumLabels?: Readonly<Record<string, readonly string[]>>;
  ref?: ImportKind;
  required?: boolean;
  examples: readonly [string, string];
}

export type ImportRecord = Record<string, unknown>;

export interface ImportSpec {
  kind: ImportKind;
  label: string;
  fields: readonly ImportField[];
  toBody?: (record: ImportRecord, op: "create" | "update") => ImportRecord;
}

export type ImportMapping = Record<string, string | null>;

export interface ImportIssue {
  field?: string;
  level: "error" | "warning";
  message: string;
}

export type ImportRowStatus = "created" | "updated" | "skipped" | "error";

export interface ImportRowResult {
  row: number;
  status: ImportRowStatus;
  name?: string;
  issues: ImportIssue[];
}

export type ImportCounts = Record<ImportRowStatus, number>;

export interface ImportReport {
  dryRun: boolean;
  results: ImportRowResult[];
  counts: ImportCounts;
}

export interface ParsedTable {
  format: "csv" | "json";
  headers: string[];
  rows: Array<Record<string, unknown>>;
}

export interface AiMapResult {
  mapping: ImportMapping;
  notes: string[];
}
```

```ts
// lib/utils/content/import/kinds.ts
import type { ImportKind, ImportMode } from "@/types/content-import";

export const IMPORT_KINDS = ["units", "spells", "skills", "main-skills", "spell-groups", "races", "classes", "artifacts", "artifact-sets"] as const satisfies readonly ImportKind[];

export const IMPORT_MODES = ["create", "update", "skip"] as const satisfies readonly ImportMode[];

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
```

- [ ] **Step 3: Failing test**

```ts
// lib/utils/content/import/__tests__/table.test.ts
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { chunkRows, detectDelimiter, ImportFileError, parseTable, toCsv } from "../table";

describe("detectDelimiter", () => {
  it.each([
    ["a;b;c", ";"],
    ["a\tb\tc", "\t"],
    ["a,b,c", ","],
    ["a;b,c", ";"],
    ['"a;b",c,d', ","],
    ["abc", ","],
  ])("%j → %j", (line, expected) => expect(detectDelimiter(line)).toBe(expected));
});

describe("parseTable: CSV", () => {
  it("BOM, ;, CRLF, лапки з переносом і подвоєними лапками, рядок з самих роздільників", () => {
    const text = '﻿Назва;Опис\r\n"Біс";"рядок 1\nрядок 2 ""цитата"""\r\n;\r\nВовк;;\r\n';

    const table = parseTable(text, "units.csv");

    expect(table.format).toBe("csv");
    expect(table.headers).toEqual(["Назва", "Опис"]);
    expect(table.rows).toEqual([
      { Назва: "Біс", Опис: 'рядок 1\nрядок 2 "цитата"' },
      { Назва: "Вовк", Опис: "" },
    ]);
  });

  it("клітинка, цілком обгорнута в лапки (\"\"\"текст\"\"\"), втрачає одну пару — як у старому імпорті", () => {
    expect(parseTable('Назва;Опис\nА;"""Аура; Натиск"""').rows).toEqual([{ Назва: "А", Опис: "Аура; Натиск" }]);
  });

  it("кома й табуляція", () => {
    expect(parseTable("name,hp\nВовк,11").rows).toEqual([{ name: "Вовк", hp: "11" }]);
    expect(parseTable("name\thp\nВовк\t11").rows).toEqual([{ name: "Вовк", hp: "11" }]);
  });

  it("порожні й повторені заголовки отримують унікальні імена", () => {
    expect(parseTable("Назва;Назва;\nА;Б;В").headers).toEqual(["Назва", "Назва (2)", "Колонка 3"]);
  });

  it("порожній файл і лише заголовок — ImportFileError", () => {
    expect(() => parseTable("")).toThrow(ImportFileError);
    expect(() => parseTable("Назва;ХП\n")).toThrow("У файлі немає рядків з даними");
  });

  it("units-all.csv: 104 рядки по 18 колонок, ; у лапках лишається в клітинці", () => {
    const table = parseTable(fs.readFileSync(path.join(process.cwd(), "docs/units/units-all.csv"), "utf8"), "units-all.csv");

    expect(table.headers).toHaveLength(18);
    expect(table.rows).toHaveLength(104);
    expect(table.rows.find((r) => r["Назва"] === "Fire Dragon")?.["Особливості"]).toBe("Poisoned;Frightened;Charmed;Blinded, Fire;Poison");
    expect(table.rows.find((r) => r["Назва"] === "Єдинорог")?.["Навички/Здібності"]).toBe("Magic Resistance Aura; Charge");
  });
});

describe("parseTable: JSON", () => {
  it("масив об'єктів — заголовки в порядку появи", () => {
    const table = parseTable('[{"name":"Вовк","maxHp":11},{"name":"Біс","cr":0.25}]', "units.json");

    expect(table.format).toBe("json");
    expect(table.headers).toEqual(["name", "maxHp", "cr"]);
    expect(table.rows[1]).toEqual({ name: "Біс", cr: 0.25 });
  });

  it("один об'єкт і впізнавання JSON без розширення", () => {
    expect(parseTable('{"name":"Вовк"}').rows).toEqual([{ name: "Вовк" }]);
  });

  it("некоректний JSON і масив не-об'єктів — ImportFileError", () => {
    expect(() => parseTable("[1,2]", "a.json")).toThrow(ImportFileError);
    expect(() => parseTable("{oops", "a.json")).toThrow("Некоректний JSON");
  });
});

describe("toCsv", () => {
  it("BOM, ; і лапки там, де треба; читається назад тим самим", () => {
    const csv = toCsv(["Назва", "Опис"], [["Вогонь, сильний", 'лапки "тут"\nі перенос'], ["Лід", ""]]);

    expect(csv.startsWith("﻿Назва;Опис\r\n")).toBe(true);
    expect(parseTable(csv).rows).toEqual([
      { Назва: "Вогонь, сильний", Опис: 'лапки "тут"\nі перенос' },
      { Назва: "Лід", Опис: "" },
    ]);
  });
});

describe("chunkRows", () => {
  it("ділить за кількістю рядків", () => {
    const rows = Array.from({ length: 250 }, (_, i) => ({ i }));

    expect(chunkRows(rows, 100, 1_000_000).map((c) => c.length)).toEqual([100, 100, 50]);
  });

  it("ділить за розміром UTF-8, рядок більший за ліміт іде сам", () => {
    const big = { text: "ї".repeat(60) };

    expect(chunkRows([big, big, big], 100, 250).map((c) => c.length)).toEqual([1, 1, 1]);
    expect(chunkRows([], 100, 250)).toEqual([]);
  });
});
```

- [ ] **Step 4:** `pnpm test:run lib/utils/content/import/__tests__/table.test.ts` — FAIL (модуля `../table` немає).

- [ ] **Step 5: Implement**

```ts
// lib/utils/content/import/table.ts
import { parse } from "csv-parse/browser/esm/sync";

import { isRecord } from "@/lib/utils/common/is-record";
import type { ParsedTable } from "@/types/content-import";

export class ImportFileError extends Error {}

const DELIMITERS = [";", "\t", ","] as const;

const BOM = /^﻿/;

export function detectDelimiter(firstLine: string): string {
  const counts = new Map<string, number>();

  let quoted = false;

  for (const ch of firstLine) {
    if (ch === '"') quoted = !quoted;
    else if (!quoted && (DELIMITERS as readonly string[]).includes(ch)) counts.set(ch, (counts.get(ch) ?? 0) + 1);
  }

  let best = ",";

  let max = 0;

  for (const d of DELIMITERS) {
    const n = counts.get(d) ?? 0;

    if (n > max) {
      best = d;
      max = n;
    }
  }

  return best;
}

const isBlank = (v: unknown) => v === undefined || v === null || (typeof v === "string" && v.trim() === "");

// the old unit import dropped one pair of quotes around a whole cell ("""text""" from spreadsheet exports)
const unwrapQuotes = (v: string) => (v.length >= 2 && v.startsWith('"') && v.endsWith('"') ? v.slice(1, -1) : v);

function uniqueHeaders(raw: readonly string[]): string[] {
  const seen = new Map<string, number>();

  return raw.map((h, i) => {
    const base = h.trim() || `Колонка ${i + 1}`;

    const n = (seen.get(base) ?? 0) + 1;

    seen.set(base, n);

    return n === 1 ? base : `${base} (${n})`;
  });
}

function parseCsv(text: string): ParsedTable {
  const body = text.replace(BOM, "");

  const delimiter = detectDelimiter(body.split(/\r?\n/, 1)[0] ?? "");

  let records: string[][];

  try {
    records = parse(body, { delimiter, relax_column_count: true, relax_quotes: true, skip_empty_lines: true, trim: true }) as string[][];
  } catch (error) {
    throw new ImportFileError(`Не вдалося прочитати CSV: ${error instanceof Error ? error.message : "помилка формату"}`);
  }

  const [head, ...data] = records;

  if (!head) throw new ImportFileError("Файл порожній");

  const headers = uniqueHeaders(head);

  const rows = data.filter((cells) => cells.some((c) => !isBlank(c))).map((cells) => Object.fromEntries(headers.map((h, i) => [h, unwrapQuotes(cells[i] ?? "")])));

  return { format: "csv", headers, rows };
}

function parseJsonTable(text: string): ParsedTable {
  let data: unknown;

  try {
    data = JSON.parse(text.replace(BOM, ""));
  } catch {
    throw new ImportFileError("Некоректний JSON");
  }

  const list = Array.isArray(data) ? data : [data];

  if (!list.every(isRecord)) throw new ImportFileError("JSON має бути масивом об'єктів або одним об'єктом");

  const headers: string[] = [];

  for (const row of list) {
    for (const key of Object.keys(row)) if (!headers.includes(key)) headers.push(key);
  }

  return { format: "json", headers, rows: list };
}

export function parseTable(text: string, fileName = ""): ParsedTable {
  const start = text.replace(BOM, "").trimStart();

  if (start === "") throw new ImportFileError("Файл порожній");

  const table = /\.json$/i.test(fileName) || start.startsWith("[") || start.startsWith("{") ? parseJsonTable(text) : parseCsv(text);

  if (table.rows.length === 0) throw new ImportFileError("У файлі немає рядків з даними");

  return table;
}

const NEEDS_QUOTES = /[";,\t\r\n]|^\s|\s$/;

const csvCell = (v: string) => (NEEDS_QUOTES.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

export function toCsv(headers: readonly string[], rows: ReadonlyArray<readonly string[]>): string {
  return `﻿${[headers, ...rows].map((r) => r.map(csvCell).join(";")).join("\r\n")}\r\n`;
}

const encoder = new TextEncoder();

export function chunkRows<T>(rows: readonly T[], maxRows: number, maxBytes: number): T[][] {
  const chunks: T[][] = [];

  let current: T[] = [];

  let bytes = 0;

  for (const row of rows) {
    const size = encoder.encode(JSON.stringify(row)).length;

    if (current.length > 0 && (current.length >= maxRows || bytes + size > maxBytes)) {
      chunks.push(current);
      current = [];
      bytes = 0;
    }

    current.push(row);
    bytes += size;
  }

  if (current.length > 0) chunks.push(current);

  return chunks;
}
```

- [ ] **Step 6:** `pnpm test:run lib/utils/content/import/__tests__/table.test.ts` — PASS. `pnpm exec tsc --noEmit -p . 2>&1 | grep -E "content-import|content/import" || true` — без помилок у нових файлах (типи `csv-parse/browser/esm/sync` беруться з `dist/esm/sync.d.ts`).

- [ ] **Step 7: Commit**

```bash
git add package.json pnpm-lock.yaml types/content-import.ts lib/utils/content/import
git commit -m "feat(constructor): 4f-0 import table parsing and csv output

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Значення полів і мапінг колонок

**Files:**
- Create: `lib/utils/content/import/values.ts`, `lib/utils/content/import/mapping.ts`, `lib/utils/content/import/index.ts`
- Test: `lib/utils/content/import/__tests__/values.test.ts`, `lib/utils/content/import/__tests__/mapping.test.ts`

**Interfaces:**
- Consumes: типи з `@/types/content-import` (задача 1); `parseAttacks`, `parseSpecialAbilities` (`lib/utils/units/unit-parsing.ts`), `specialAbilitiesToAbilities` (`lib/utils/units/special-abilities.ts`), `isChallengeRating`, `challengeLabel` (`lib/constants/challenge.ts`).
- Produces:

```ts
// values.ts
export type ParsedValue = { value?: unknown; issue?: string };
export const isEmptyValue: (v: unknown) => boolean;
export const normalizeHeader: (h: string) => string;            // без BOM, trim, нижній регістр (uk), пробіли стиснуто
export function splitList(s: string): string[];                  // "|" > ";" > ","
export function joinList(items: readonly string[]): string;      // ", ", або " | ", якщо елемент містить кому
export function parseFieldValue(field: ImportField, raw: unknown): ParsedValue; // ідемпотентна: типізоване значення проходить як є
export function formatFieldValue(field: ImportField, value: unknown, nameOf: (kind: ImportKind, id: string) => string | undefined): string;

// mapping.ts
export const nameKey: (name: string) => string;                  // trim + toLocaleLowerCase("uk")
export function autoMap(headers: readonly string[], fields: readonly ImportField[]): ImportMapping;
export function applyMapping(row: Record<string, unknown>, mapping: ImportMapping, fields: readonly ImportField[]): { value: ImportRecord; issues: ImportIssue[] };
export function coerceRecord(record: ImportRecord, fields: readonly ImportField[]): { value: ImportRecord; issues: ImportIssue[] };
export function transformRow(row: Record<string, unknown>, mapping: ImportMapping, fields: readonly ImportField[]): { value: ImportRecord; issues: ImportIssue[] };
export function recordToCells(spec: ImportSpec, record: ImportRecord, nameOf: (kind: ImportKind, id: string) => string | undefined): string[];
export function missingRequired(fields: readonly ImportField[], mapping: ImportMapping): ImportField[];

// index.ts — barrel: kinds, mapping, table, values (задача 4 додає fields)
```

Правила (для тестів і реалізації): порожнє (`undefined`/`null`/рядок з пробілів) → поле пропускається (у create — default схеми, в update — без змін). `int` — перше ціле в рядку («18 (4к6 + 4)» → 18; число → `Math.trunc`); `number` — перше десяткове (кома = крапка); `bool` — так/ні/true/false/1/0/+/-/yes/no/да/нет/✓/x; `enum` — значення або підпис з `enumLabels` без регістру; `list`/`refList` — масив або рядок через `|`, інакше `;`, інакше `,` (для `list` з `enumValues` кожен елемент — як `enum`); `dice` — `NdM(+K)` (к/k → d, пробіли прибрано) або ціле → число; `cr` — «1/8», «0,25», «5» з перевіркою `isChallengeRating`; `json` — `JSON.parse` рядка (не-рядок — як є); `attacks`/`abilitiesText` — рядок, що починається з `[`/`{`, — JSON, інший рядок — текстова мова юнітів (`parseAttacks` / `specialAbilitiesToAbilities(parseSpecialAbilities(text))`), масив — як є; `ref` — рядок як є (розв'язує сервер). Кілька колонок на одне поле: для `abilitiesText` значення-рядки з'єднуються через `". "` у порядку колонок (як старий імпорт «Навички/Здібності» + «Особливості»), для решти береться перше непорожнє з попередженням.

- [ ] **Step 1: Failing tests**

```ts
// lib/utils/content/import/__tests__/values.test.ts
import { describe, expect, it } from "vitest";

import { formatFieldValue, joinList, normalizeHeader, parseFieldValue, splitList } from "../values";

import type { ImportField } from "@/types/content-import";

const f = (type: ImportField["type"], extra: Partial<ImportField> = {}): ImportField => ({ key: "k", label: "Поле", aliases: [], type, examples: ["", ""], ...extra });

const ENUM = f("enum", { enumValues: ["action", "bonusAction"], enumLabels: { action: ["Дія"], bonusAction: ["Бонусна дія"] } });

const names = (kind: string, id: string) => ({ "races:r1": "Гноми", "spells:s1": "Вогонь, сильний", "spells:s2": "Лід" })[`${kind}:${id}`];

describe("parseFieldValue", () => {
  it("порожнє — без значення й без помилки для будь-якого типу", () => {
    for (const type of ["string", "int", "bool", "enum", "json", "cr", "attacks"] as const) expect(parseFieldValue(f(type), "  ")).toEqual({});
    expect(parseFieldValue(f("int"), undefined)).toEqual({});
  });

  it("int — перше ціле в рядку, число обрізається, без цифр — помилка", () => {
    expect(parseFieldValue(f("int"), "18 (4к6 + 4)")).toEqual({ value: 18 });
    expect(parseFieldValue(f("int"), "8 (+1)")).toEqual({ value: 8 });
    expect(parseFieldValue(f("int"), "Walk=30")).toEqual({ value: 30 });
    expect(parseFieldValue(f("int"), -2)).toEqual({ value: -2 });
    expect(parseFieldValue(f("int"), 7.9)).toEqual({ value: 7 });
    expect(parseFieldValue(f("int"), "багато").issue).toContain("Очікується ціле число");
  });

  it("number — кома як крапка", () => {
    expect(parseFieldValue(f("number"), "0,25")).toEqual({ value: 0.25 });
  });

  it("bool — українські й англійські варіанти", () => {
    expect(parseFieldValue(f("bool"), "Так")).toEqual({ value: true });
    expect(parseFieldValue(f("bool"), "no")).toEqual({ value: false });
    expect(parseFieldValue(f("bool"), true)).toEqual({ value: true });
    expect(parseFieldValue(f("bool"), "можливо").issue).toContain("так/ні");
  });

  it("enum — значення або підпис без регістру; невідоме — помилка з переліком підписів", () => {
    expect(parseFieldValue(ENUM, "бонусна ДІЯ")).toEqual({ value: "bonusAction" });
    expect(parseFieldValue(ENUM, "action")).toEqual({ value: "action" });
    expect(parseFieldValue(ENUM, "реакція").issue).toBe("Невідоме значення «реакція»; можливі: Дія, Бонусна дія");
  });

  it("list — роздільники | ; , і масив; enum-список перевіряє кожен елемент", () => {
    expect(parseFieldValue(f("list"), "a | b, c")).toEqual({ value: ["a", "b, c"] });
    expect(parseFieldValue(f("list"), "a; b")).toEqual({ value: ["a", "b"] });
    expect(parseFieldValue(f("refList"), "a, b")).toEqual({ value: ["a", "b"] });
    expect(parseFieldValue(f("list"), [" a ", ""])).toEqual({ value: ["a"] });
    expect(parseFieldValue({ ...ENUM, type: "list" }, "Дія, bonusAction")).toEqual({ value: ["action", "bonusAction"] });
    expect(parseFieldValue({ ...ENUM, type: "list" }, "Дія, політ").issue).toContain("Невідомі значення: політ");
  });

  it("dice — к/k/пробіли, ціле → число", () => {
    expect(parseFieldValue(f("dice"), "2 к6 + 1")).toEqual({ value: "2d6+1" });
    expect(parseFieldValue(f("dice"), "8D6")).toEqual({ value: "8d6" });
    expect(parseFieldValue(f("dice"), "3")).toEqual({ value: 3 });
    expect(parseFieldValue(f("dice"), 4)).toEqual({ value: 4 });
    expect(parseFieldValue(f("dice"), "2d8 + STR").issue).toContain("2d6+1");
  });

  it("cr — дроби, кома, ціле; не з таблиці — помилка", () => {
    expect(parseFieldValue(f("cr"), "1/8")).toEqual({ value: 0.125 });
    expect(parseFieldValue(f("cr"), "0,5")).toEqual({ value: 0.5 });
    expect(parseFieldValue(f("cr"), "5")).toEqual({ value: 5 });
    expect(parseFieldValue(f("cr"), 0.25)).toEqual({ value: 0.25 });
    expect(parseFieldValue(f("cr"), "1/3").issue).toContain("CR");
  });

  it("json — рядок парситься, об'єкт проходить, зламаний — помилка", () => {
    expect(parseFieldValue(f("json"), '{"kind":"auto"}')).toEqual({ value: { kind: "auto" } });
    expect(parseFieldValue(f("json"), { kind: "auto" })).toEqual({ value: { kind: "auto" } });
    expect(parseFieldValue(f("json"), "{kind").issue).toBe("Некоректний JSON у клітинці");
  });

  it("attacks — текстова мова юнітів або JSON", () => {
    expect(parseFieldValue(f("attacks"), "Укус +5, 1к6 колючий")).toEqual({ value: [{ name: "Укус", attackBonus: 5, damageType: "piercing", damageDice: "1d6" }] });
    expect(parseFieldValue(f("attacks"), "Відсутні")).toEqual({ value: [] });
    expect(parseFieldValue(f("attacks"), '[{"name":"Лук"}]')).toEqual({ value: [{ name: "Лук" }] });
  });

  it("abilitiesText — текст стає вміннями-нотатками, JSON-масив — як є", () => {
    const { value } = parseFieldValue(f("abilitiesText"), "Втеча: відходить бонусною дією");

    expect(value).toEqual([{ id: "sa0", name: "Втеча", description: "відходить бонусною дією", trigger: { event: "passive" }, effects: [{ kind: "note", text: "відходить бонусною дією" }] }]);
    expect(parseFieldValue(f("abilitiesText"), "[]")).toEqual({ value: [] });
  });
});

describe("formatFieldValue ↔ parseFieldValue", () => {
  it("посилання — назви; список з комою в назві — через « | » і читається назад", () => {
    const refList = f("refList", { ref: "spells" });

    const cell = formatFieldValue(refList, ["s1", "s2"], names);

    expect(cell).toBe("Вогонь, сильний | Лід");
    expect(parseFieldValue(refList, cell)).toEqual({ value: ["Вогонь, сильний", "Лід"] });
    expect(formatFieldValue(f("ref", { ref: "races" }), "r1", names)).toBe("Гноми");
    expect(formatFieldValue(f("ref", { ref: "races" }), "r9", names)).toBe("r9");
  });

  it("cr, bool, json і порожні значення", () => {
    expect(formatFieldValue(f("cr"), 0.25, names)).toBe("1/4");
    expect(formatFieldValue(f("bool"), false, names)).toBe("ні");
    expect(formatFieldValue(f("json"), { kind: "auto" }, names)).toBe('{"kind":"auto"}');
    expect(formatFieldValue(f("abilitiesText"), [], names)).toBe("");
    expect(formatFieldValue(f("int"), null, names)).toBe("");
  });
});

describe("helpers", () => {
  it("normalizeHeader знімає BOM, регістр і зайві пробіли", () => expect(normalizeHeader("﻿  Клас   Броні ")).toBe("клас броні"));
  it("splitList / joinList", () => {
    expect(splitList("a|b;c")).toEqual(["a", "b;c"]);
    expect(joinList(["a", "b"])).toBe("a, b");
    expect(joinList(["a, b", "c"])).toBe("a, b | c");
  });
});
```

```ts
// lib/utils/content/import/__tests__/mapping.test.ts
import { describe, expect, it } from "vitest";

import { applyMapping, autoMap, coerceRecord, missingRequired, nameKey, recordToCells, transformRow } from "../mapping";

import type { ImportField, ImportSpec } from "@/types/content-import";

const FIELDS: ImportField[] = [
  { key: "name", label: "Назва", aliases: ["name"], type: "string", required: true, examples: ["", ""] },
  { key: "maxHp", label: "ХП", aliases: ["hp", "хіти"], type: "int", examples: ["", ""] },
  { key: "abilities", label: "Навички/Здібності", aliases: ["особливості"], type: "abilitiesText", examples: ["", ""] },
  { key: "raceId", label: "Раса", aliases: ["група"], type: "ref", ref: "races", examples: ["", ""] },
];

const SPEC: ImportSpec = { kind: "units", label: "Юніти", fields: FIELDS };

describe("autoMap", () => {
  it("ключ, підпис і синоніми без регістру й пробілів; невідомі — null", () => {
    expect(autoMap(["NAME", " хп ", "Хіти", "Група", "Зайве"], FIELDS)).toEqual({ NAME: "name", " хп ": "maxHp", Хіти: "maxHp", Група: "raceId", Зайве: null });
  });
});

describe("applyMapping", () => {
  it("кілька колонок здібностей з'єднуються через «. », як у старому імпорті", () => {
    const row = { Назва: "Біс", "Навички/Здібності": "А: перша", Особливості: "Б" };

    expect(applyMapping(row, autoMap(Object.keys(row), FIELDS), FIELDS).value).toEqual({ name: "Біс", abilities: "А: перша. Б" });
  });

  it("для інших полів — перша непорожня колонка й попередження", () => {
    const row = { hp: "", ХП: "7", Хіти: "9" };

    const { value, issues } = applyMapping(row, autoMap(Object.keys(row), FIELDS), FIELDS);

    expect(value).toEqual({ maxHp: "7" });
    expect(issues).toEqual([{ field: "maxHp", level: "warning", message: "Кілька колонок для «ХП» — взято першу непорожню" }]);
  });

  it("колонка з null у мапінгу ігнорується", () => {
    expect(applyMapping({ Назва: "А", ХП: "5" }, { Назва: "name", ХП: null }, FIELDS).value).toEqual({ name: "А" });
  });
});

describe("coerceRecord / transformRow", () => {
  it("перетворює значення, невідомі ключі — попередження, погані значення — помилка поля", () => {
    const { value, issues } = coerceRecord({ name: " Біс ", maxHp: "18 (4к6)", extra: 1, raceId: "Гноми" }, FIELDS);

    expect(value).toEqual({ name: "Біс", maxHp: 18, raceId: "Гноми" });
    expect(issues).toEqual([{ field: "extra", level: "warning", message: "Невідоме поле «extra» — пропущено" }]);
    expect(coerceRecord({ maxHp: "багато" }, FIELDS).issues[0]).toMatchObject({ field: "maxHp", level: "error" });
  });

  it("ідемпотентна: повторне перетворення не змінює значення", () => {
    const once = transformRow({ Назва: "Біс", ХП: "18", Особливості: "Втеча: геть" }, { Назва: "name", ХП: "maxHp", Особливості: "abilities" }, FIELDS).value;

    expect(coerceRecord(once, FIELDS)).toEqual({ value: once, issues: [] });
  });
});

describe("recordToCells / missingRequired / nameKey", () => {
  it("клітинки в порядку полів, посилання — назвою", () => {
    expect(recordToCells(SPEC, { name: "Біс", maxHp: 18, raceId: "r1" }, (_k, id) => (id === "r1" ? "Гноми" : undefined))).toEqual(["Біс", "18", "", "Гноми"]);
  });

  it("незіставлені обов'язкові поля", () => {
    expect(missingRequired(FIELDS, { ХП: "maxHp" }).map((f) => f.key)).toEqual(["name"]);
    expect(missingRequired(FIELDS, { Назва: "name" })).toEqual([]);
  });

  it("nameKey", () => expect(nameKey("  Гноми ")).toBe(nameKey("гноми")));
});
```

- [ ] **Step 2:** `pnpm test:run lib/utils/content/import/__tests__/values.test.ts lib/utils/content/import/__tests__/mapping.test.ts` — FAIL (модулів немає).

- [ ] **Step 3: Implement**

```ts
// lib/utils/content/import/values.ts
import { challengeLabel, isChallengeRating } from "@/lib/constants/challenge";
import { specialAbilitiesToAbilities } from "@/lib/utils/units/special-abilities";
import { parseAttacks, parseSpecialAbilities } from "@/lib/utils/units/unit-parsing";
import type { ImportField, ImportKind } from "@/types/content-import";

export type ParsedValue = { value?: unknown; issue?: string };

export const isEmptyValue = (v: unknown) => v === undefined || v === null || (typeof v === "string" && v.trim() === "");

export const normalizeHeader = (h: string) => h.replace(/^﻿/, "").trim().toLocaleLowerCase("uk").replace(/\s+/g, " ");

const TRUE = new Set(["так", "true", "1", "+", "yes", "y", "да", "✓", "x"]);

const FALSE = new Set(["ні", "false", "0", "-", "no", "n", "нет"]);

function parseInteger(raw: unknown): ParsedValue {
  if (typeof raw === "number") return Number.isFinite(raw) ? { value: Math.trunc(raw) } : { issue: "Очікується ціле число" };

  const s = String(raw);

  const m = /[+-]?\d+/.exec(s);

  return m ? { value: parseInt(m[0], 10) } : { issue: `Очікується ціле число, отримано «${s}»` };
}

function parseDecimal(raw: unknown): ParsedValue {
  if (typeof raw === "number") return Number.isFinite(raw) ? { value: raw } : { issue: "Очікується число" };

  const s = String(raw);

  const m = /[+-]?\d+(\.\d+)?/.exec(s.replace(",", "."));

  return m ? { value: parseFloat(m[0]) } : { issue: `Очікується число, отримано «${s}»` };
}

function parseBoolean(raw: unknown): ParsedValue {
  if (typeof raw === "boolean") return { value: raw };

  const s = normalizeHeader(String(raw));

  if (TRUE.has(s)) return { value: true };

  if (FALSE.has(s)) return { value: false };

  return { issue: `Очікується так/ні, отримано «${String(raw)}»` };
}

function matchEnum(field: ImportField, raw: string): string | null {
  const s = normalizeHeader(raw);

  for (const v of field.enumValues ?? []) {
    if (normalizeHeader(v) === s || (field.enumLabels?.[v] ?? []).some((l) => normalizeHeader(l) === s)) return v;
  }

  return null;
}

const enumHint = (field: ImportField) => (field.enumValues ?? []).map((v) => field.enumLabels?.[v]?.[0] ?? v).join(", ");

function parseEnum(field: ImportField, raw: unknown): ParsedValue {
  const value = matchEnum(field, String(raw));

  return value ? { value } : { issue: `Невідоме значення «${String(raw)}»; можливі: ${enumHint(field)}` };
}

export function splitList(s: string): string[] {
  const sep = s.includes("|") ? "|" : s.includes(";") ? ";" : ",";

  return s.split(sep).map((x) => x.trim()).filter(Boolean);
}

export const joinList = (items: readonly string[]) => (items.some((i) => i.includes(",")) ? items.join(" | ") : items.join(", "));

function parseList(field: ImportField, raw: unknown): ParsedValue {
  const items = Array.isArray(raw) ? raw.map((x) => String(x).trim()).filter(Boolean) : splitList(String(raw));

  if (!field.enumValues) return { value: items };

  const out: string[] = [];

  const bad: string[] = [];

  for (const item of items) {
    const v = matchEnum(field, item);

    if (v) out.push(v);
    else bad.push(item);
  }

  return bad.length > 0 ? { issue: `Невідомі значення: ${bad.join(", ")}; можливі: ${enumHint(field)}` } : { value: out };
}

const DICE = /^\d*d\d+([+-]\d+)?$/;

function parseDice(raw: unknown): ParsedValue {
  if (typeof raw === "number") return Number.isInteger(raw) && raw >= 0 ? { value: raw } : { issue: "Очікується ціла кількість кісток" };

  const s = String(raw).toLowerCase().replace(/\s+/g, "").replace(/[кk]/g, "d");

  if (/^\d+$/.test(s)) return { value: Number(s) };

  return DICE.test(s) ? { value: s } : { issue: `Очікуються кістки на кшталт «2d6+1», отримано «${String(raw)}»` };
}

function parseCr(raw: unknown): ParsedValue {
  let n: number;

  if (typeof raw === "number") n = raw;
  else {
    const s = String(raw).trim().replace(",", ".");

    const frac = /^(\d+)\s*\/\s*(\d+)$/.exec(s);

    n = frac ? Number(frac[1]) / Number(frac[2]) : Number(s);
  }

  return Number.isFinite(n) && isChallengeRating(n) ? { value: n } : { issue: `CR: 0, 1/8, 1/4, 1/2 або ціле 1–30, отримано «${String(raw)}»` };
}

function parseJsonCell(raw: unknown): ParsedValue {
  if (typeof raw !== "string") return { value: raw };

  try {
    return { value: JSON.parse(raw) };
  } catch {
    return { issue: "Некоректний JSON у клітинці" };
  }
}

const looksJson = (s: string) => /^\s*[[{]/.test(s);

export function parseFieldValue(field: ImportField, raw: unknown): ParsedValue {
  if (isEmptyValue(raw)) return {};

  switch (field.type) {
    case "string":
    case "ref":
      return { value: String(raw).trim() };
    case "int":
      return parseInteger(raw);
    case "number":
      return parseDecimal(raw);
    case "bool":
      return parseBoolean(raw);
    case "enum":
      return parseEnum(field, raw);
    case "list":
    case "refList":
      return parseList(field, raw);
    case "dice":
      return parseDice(raw);
    case "cr":
      return parseCr(raw);
    case "json":
      return parseJsonCell(raw);
    case "attacks":
      return typeof raw === "string" && !looksJson(raw) ? { value: parseAttacks(raw) } : parseJsonCell(raw);
    case "abilitiesText":
      return typeof raw === "string" && !looksJson(raw) ? { value: specialAbilitiesToAbilities(parseSpecialAbilities(raw)) } : parseJsonCell(raw);
  }
}

export function formatFieldValue(field: ImportField, value: unknown, nameOf: (kind: ImportKind, id: string) => string | undefined): string {
  if (value === undefined || value === null) return "";

  const nameFor = (id: unknown) => (field.ref && nameOf(field.ref, String(id))) || String(id);

  switch (field.type) {
    case "ref":
      return nameFor(value);
    case "refList":
      return Array.isArray(value) ? joinList(value.map(nameFor)) : "";
    case "list":
      return Array.isArray(value) ? joinList(value.map(String)) : String(value);
    case "bool":
      return value ? "так" : "ні";
    case "cr":
      return typeof value === "number" ? challengeLabel(value) : String(value);
    case "json":
    case "attacks":
    case "abilitiesText":
      return Array.isArray(value) && value.length === 0 ? "" : JSON.stringify(value);
    default:
      return String(value);
  }
}
```

```ts
// lib/utils/content/import/mapping.ts
import { formatFieldValue, isEmptyValue, normalizeHeader, parseFieldValue } from "./values";

import type { ImportField, ImportIssue, ImportKind, ImportMapping, ImportRecord, ImportSpec } from "@/types/content-import";

type Converted = { value: ImportRecord; issues: ImportIssue[] };

export const nameKey = (name: string) => name.trim().toLocaleLowerCase("uk");

export function autoMap(headers: readonly string[], fields: readonly ImportField[]): ImportMapping {
  const index = new Map<string, string>();

  for (const field of fields) {
    for (const alias of [field.key, field.label, ...field.aliases]) {
      const key = normalizeHeader(alias);

      if (!index.has(key)) index.set(key, field.key);
    }
  }

  return Object.fromEntries(headers.map((h) => [h, index.get(normalizeHeader(h)) ?? null]));
}

export function applyMapping(row: Record<string, unknown>, mapping: ImportMapping, fields: readonly ImportField[]): Converted {
  const byKey = new Map(fields.map((f) => [f.key, f]));

  const value: ImportRecord = {};

  const issues: ImportIssue[] = [];

  for (const [header, key] of Object.entries(mapping)) {
    const field = key ? byKey.get(key) : undefined;

    const cell = row[header];

    if (!field || isEmptyValue(cell)) continue;

    const prev = value[field.key];

    if (prev === undefined) value[field.key] = cell;
    else if (field.type === "abilitiesText" && typeof prev === "string" && typeof cell === "string") value[field.key] = `${prev}. ${cell}`;
    else issues.push({ field: field.key, level: "warning", message: `Кілька колонок для «${field.label}» — взято першу непорожню` });
  }

  return { value, issues };
}

export function coerceRecord(record: ImportRecord, fields: readonly ImportField[]): Converted {
  const byKey = new Map(fields.map((f) => [f.key, f]));

  const value: ImportRecord = {};

  const issues: ImportIssue[] = [];

  for (const [key, raw] of Object.entries(record)) {
    const field = byKey.get(key);

    if (!field) {
      issues.push({ field: key, level: "warning", message: `Невідоме поле «${key}» — пропущено` });
      continue;
    }

    const parsed = parseFieldValue(field, raw);

    if (parsed.issue) issues.push({ field: key, level: "error", message: `${field.label}: ${parsed.issue}` });
    else if (parsed.value !== undefined) value[key] = parsed.value;
  }

  return { value, issues };
}

export function transformRow(row: Record<string, unknown>, mapping: ImportMapping, fields: readonly ImportField[]): Converted {
  const mapped = applyMapping(row, mapping, fields);

  const coerced = coerceRecord(mapped.value, fields);

  return { value: coerced.value, issues: [...mapped.issues, ...coerced.issues] };
}

export function recordToCells(spec: ImportSpec, record: ImportRecord, nameOf: (kind: ImportKind, id: string) => string | undefined): string[] {
  return spec.fields.map((f) => formatFieldValue(f, record[f.key], nameOf));
}

export function missingRequired(fields: readonly ImportField[], mapping: ImportMapping): ImportField[] {
  const mapped = new Set(Object.values(mapping));

  return fields.filter((f) => f.required && !mapped.has(f.key));
}
```

> Увага до тесту `coerceRecord … issues[0]`: повідомлення помилки має префікс підпису поля («ХП: Очікується ціле число…»), тест перевіряє лише `field`/`level`.

```ts
// lib/utils/content/import/index.ts
export * from "./kinds";
export * from "./mapping";
export * from "./table";
export * from "./values";
```

- [ ] **Step 4:** `pnpm test:run lib/utils/content/import/__tests__` — PASS. Якщо тест `attacks` показує інший `damageType` — перевірити `parseAttacks` (`колючий` → `piercing`) і не змінювати `unit-parsing.ts`: тест має відповідати наявній поведінці.

- [ ] **Step 5: Commit**

```bash
git add lib/utils/content/import
git commit -m "feat(constructor): 4f-0 import field values and column mapping

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 3: Реєстр полів юнітів і еквівалентність старому CSV

**Files:**
- Create: `lib/utils/content/import/fields/common.ts`, `lib/utils/content/import/fields/units.ts`, `lib/utils/units/unit-create-data.ts`
- Modify: `lib/server/content/resources/units.ts` (`create` бере дані з `unitCreateData`)
- Test: `lib/utils/content/import/__tests__/units-fields.test.ts`

**Interfaces:**
- Consumes: `autoMap`, `transformRow`, `parseTable` (задачі 1–2).
- Produces:

```ts
// fields/common.ts
export const ABILITY_ENUM: { enumValues: readonly AbilityKey[]; enumLabels: Record<string, string[]> };
export const optionLabels: (options: ReadonlyArray<{ value: string; label: string }>) => Record<string, string[]>;
export const recordLabels: (labels: Readonly<Record<string, string>>) => Record<string, string[]>;
export const nameField: (examples: readonly [string, string]) => ImportField;      // key "name", label "Назва", required
export const textField: (key: string, label: string, aliases: readonly string[], examples?: readonly [string, string]) => ImportField;
export const jsonField: (key: string, label: string, aliases: readonly string[], examples?: readonly [string, string]) => ImportField;
export const abilitiesField: (examples?: readonly [string, string]) => ImportField; // key "abilities", label "Здібності"

// fields/units.ts
export const UNITS_IMPORT: ImportSpec; // kind "units", label "Юніти", toBody — майстерність з рівня для create без колонки й без CR

// lib/utils/units/unit-create-data.ts
export type CreateUnitData = z.infer<typeof createUnitSchema>;
export function unitCreateData(campaignId: string, data: CreateUnitData): Prisma.UnitUncheckedCreateInput;
```

- [ ] **Step 1: Failing test**

```ts
// lib/utils/content/import/__tests__/units-fields.test.ts
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { createUnitSchema, importUnitSchema } from "@/lib/schemas/units";
import { AbilitiesSchema } from "@/lib/utils/abilities/schema";
import { UNITS_IMPORT } from "@/lib/utils/content/import/fields/units";
import { autoMap, transformRow } from "@/lib/utils/content/import/mapping";
import { parseTable } from "@/lib/utils/content/import/table";
import { resolveImportRaces, toUnitCreateData } from "@/lib/utils/units/import-units";
import { unitCreateData } from "@/lib/utils/units/unit-create-data";
import { convertCSVRowToUnit } from "@/lib/utils/units/unit-parsing";
import type { CSVUnitRow } from "@/types/import";

const csv = fs.readFileSync(path.join(process.cwd(), "docs/units/units-all.csv"), "utf8");

const races = ["Демони", "Гноми", "Ельфи", "Нежить", "Академія"].map((name, i) => ({ id: `r${i}`, name }));

// columns createMany left to DB defaults in the old import
const LEGACY_DEFAULTS = { immunities: [], morale: 0, minTargets: 1, maxTargets: 1 };

const normalize = (data: Record<string, unknown>) => ({ ...data, abilities: data.abilities === undefined ? [] : AbilitiesSchema.parse(data.abilities) });

describe("units: старі заголовки CSV", () => {
  it.each([
    ["Tier", "level"], ["tier", "level"], ["Назва", "name"], ["name", "name"], ["Name", "name"],
    ["КД", "armorClass"], ["ac", "armorClass"], ["AC", "armorClass"], ["ХП", "maxHp"], ["hp", "maxHp"], ["HP", "maxHp"],
    ["Швидкість", "speed"], ["speed", "speed"], ["Speed", "speed"], ["СИЛ", "strength"], ["str", "strength"], ["STR", "strength"],
    ["ЛОВ", "dexterity"], ["dex", "dexterity"], ["DEX", "dexterity"], ["ТІЛ", "constitution"], ["con", "constitution"], ["CON", "constitution"],
    ["ІНТ", "intelligence"], ["int", "intelligence"], ["INT", "intelligence"], ["МДР", "wisdom"], ["wis", "wisdom"], ["WIS", "wisdom"],
    ["ХАР", "charisma"], ["cha", "charisma"], ["CHA", "charisma"], ["Навички/Здібності", "abilities"], ["abilities", "abilities"], ["Abilities", "abilities"],
    ["Атаки", "attacks"], ["attacks", "attacks"], ["Attacks", "attacks"], ["Особливості", "abilities"], ["features", "abilities"], ["Features", "abilities"],
    ["Група", "raceId"], ["group", "raceId"], ["Group", "raceId"], ["Initiative", "initiative"], ["initiative", "initiative"],
    ["Image", "avatar"], ["image", "avatar"], ["URL", "avatar"],
  ])("%s → %s", (header, key) => expect(autoMap([header], UNITS_IMPORT.fields)[header]).toBe(key));

  it("«Спасброски» не зіставляється (старий імпорт її ігнорував)", () => expect(autoMap(["Спасброски"], UNITS_IMPORT.fields)).toEqual({ Спасброски: null }));
});

describe("units: units-all.csv новим шляхом", () => {
  const table = parseTable(csv, "units-all.csv");

  const mapping = autoMap(table.headers, UNITS_IMPORT.fields);

  it("кожен рядок дає ті самі дані юніта, що й старий імпорт", () => {
    const { raceIdOf } = resolveImportRaces([], races);

    const raceIdByName = new Map(races.map((r) => [r.name, r.id]));

    expect(table.rows).toHaveLength(104);

    for (const row of table.rows) {
      const legacyUnit = importUnitSchema.parse(convertCSVRowToUnit(row as CSVUnitRow));

      const legacy = toUnitCreateData("c1", legacyUnit, raceIdOf(legacyUnit.raceName));

      const { value, issues } = transformRow(row, mapping, UNITS_IMPORT.fields);

      expect(issues.filter((i) => i.level === "error")).toEqual([]);

      const body = UNITS_IMPORT.toBody ? UNITS_IMPORT.toBody(value, "create") : value;

      const withRace = { ...body, raceId: typeof body.raceId === "string" ? raceIdByName.get(body.raceId) : undefined };

      const next = unitCreateData("c1", createUnitSchema.parse(withRace));

      expect(normalize(next as Record<string, unknown>), String(row["Назва"])).toEqual(normalize({ ...LEGACY_DEFAULTS, ...(legacy as Record<string, unknown>) }));
    }
  });
});

describe("units: toBody", () => {
  it("create без майстерності й CR — майстерність за рівнем; з CR або в update — без змін", () => {
    expect(UNITS_IMPORT.toBody?.({ name: "А", level: 9 }, "create")).toEqual({ name: "А", level: 9, proficiencyBonus: 4 });
    expect(UNITS_IMPORT.toBody?.({ name: "А", level: 9, cr: 2 }, "create")).toEqual({ name: "А", level: 9, cr: 2 });
    expect(UNITS_IMPORT.toBody?.({ name: "А", level: 9 }, "update")).toEqual({ name: "А", level: 9 });
  });
});
```

- [ ] **Step 2:** `pnpm test:run lib/utils/content/import/__tests__/units-fields.test.ts` — FAIL (модулів немає).

- [ ] **Step 3: Implement `unitCreateData` і переведення ресурсу на нього (без зміни поведінки)**

```ts
// lib/utils/units/unit-create-data.ts
import type { Prisma } from "@prisma/client";
import type { z } from "zod";

import type { createUnitSchema } from "@/lib/schemas/units";
import { abilitiesJson } from "@/lib/utils/abilities/read";
import { resolveUnitProficiency } from "@/lib/utils/units/monster";

export type CreateUnitData = z.infer<typeof createUnitSchema>;

export function unitCreateData(campaignId: string, data: CreateUnitData): Prisma.UnitUncheckedCreateInput {
  return {
    campaignId,
    name: data.name,
    raceId: data.raceId ?? null,
    level: data.level,
    strength: data.strength,
    dexterity: data.dexterity,
    constitution: data.constitution,
    intelligence: data.intelligence,
    wisdom: data.wisdom,
    charisma: data.charisma,
    armorClass: data.armorClass,
    initiative: data.initiative,
    speed: data.speed,
    gridSize: data.gridSize,
    maxHp: data.maxHp,
    proficiencyBonus: resolveUnitProficiency(data),
    minTargets: data.minTargets,
    maxTargets: data.maxTargets,
    attacks: data.attacks as Prisma.InputJsonValue,
    ...(data.abilities && { abilities: abilitiesJson(data.abilities) }),
    immunities: data.immunities as Prisma.InputJsonValue,
    knownSpells: data.knownSpells,
    morale: data.morale,
    avatar: data.avatar ?? null,
    cr: data.cr ?? null,
    xp: data.xp ?? null,
    multiattack: data.multiattack,
    legendaryActions: data.legendaryActions,
    legendaryResistances: data.legendaryResistances,
    saveProficiencies: data.saveProficiencies as Prisma.InputJsonValue,
  };
}
```

У `lib/server/content/resources/units.ts` замінити весь об'єкт `data: { campaignId: actor.campaignId, name: data.name, … saveProficiencies: … }` у `create` на виклик (поля ті самі, порядок не важливий):

```ts
  async create(actor, data) {
    await assertCampaignRefs(actor.campaignId, { race: data.raceId, spell: data.knownSpells });

    return prisma.unit.create({ data: unitCreateData(actor.campaignId, data) });
  },
```

і додати `import { unitCreateData } from "@/lib/utils/units/unit-create-data";`; імпорт `resolveUnitProficiency` прибрати, якщо він більше не використовується у файлі (у `update` його немає). `Prisma` лишається (використовується в `update` через `toJsonInput`? — якщо ESLint/TS скаже, що `Prisma` більше не використовується, змінити імпорт на `import type { Unit as UnitRow } from "@prisma/client";`).

- [ ] **Step 4: Implement спільні поля й реєстр юнітів**

```ts
// lib/utils/content/import/fields/common.ts
import { ABILITY_KEYS, ABILITY_LABELS, ABILITY_SHORT_LABELS, CORE_ABILITY_SCORES } from "@/lib/constants/abilities";
import type { ImportField } from "@/types/content-import";

// short labels of the old unit CSV
const LEGACY_SHORT: Record<string, string[]> = { dexterity: ["ЛОВ"], wisdom: ["МДР"] };

export const ABILITY_ENUM = {
  enumValues: ABILITY_KEYS,
  enumLabels: Object.fromEntries(CORE_ABILITY_SCORES.map((a) => [a.key, [ABILITY_LABELS[a.key], ABILITY_SHORT_LABELS[a.key], a.abbreviation, ...(LEGACY_SHORT[a.key] ?? [])]])) as Record<string, string[]>,
};

export const optionLabels = (options: ReadonlyArray<{ value: string; label: string }>): Record<string, string[]> => Object.fromEntries(options.map((o) => [o.value, [o.label]]));

export const recordLabels = (labels: Readonly<Record<string, string>>): Record<string, string[]> => Object.fromEntries(Object.entries(labels).map(([value, label]) => [value, [label]]));

const EMPTY: readonly [string, string] = ["", ""];

export const nameField = (examples: readonly [string, string]): ImportField => ({ key: "name", label: "Назва", aliases: ["назва", "name", "ім'я"], type: "string", required: true, examples });

export const textField = (key: string, label: string, aliases: readonly string[], examples: readonly [string, string] = EMPTY): ImportField => ({ key, label, aliases, type: "string", examples });

export const jsonField = (key: string, label: string, aliases: readonly string[], examples: readonly [string, string] = EMPTY): ImportField => ({ key, label, aliases, type: "json", examples });

export const abilitiesField = (examples: readonly [string, string] = EMPTY): ImportField => ({ key: "abilities", label: "Здібності", aliases: ["abilities"], type: "abilitiesText", examples });
```

```ts
// lib/utils/content/import/fields/units.ts
import { ABILITY_ENUM, nameField } from "./common";

import { getProficiencyBonus } from "@/lib/utils/common/calculations";
import type { ImportField, ImportSpec } from "@/types/content-import";

const int = (key: string, label: string, aliases: readonly string[], examples: readonly [string, string]): ImportField => ({ key, label, aliases, type: "int", examples });

const fields: ImportField[] = [
  nameField(["Гоблін-лучник", "Вовк"]),
  int("level", "Рівень", ["tier", "тір"], ["1", "2"]),
  { key: "raceId", label: "Раса", aliases: ["група", "group", "race"], type: "ref", ref: "races", examples: ["", ""] },
  { key: "avatar", label: "Аватар", aliases: ["image", "url", "зображення"], type: "string", examples: ["", ""] },
  int("initiative", "Ініціатива", ["init"], ["2", "3"]),
  int("armorClass", "КД", ["ac", "клас броні", "armor class"], ["13", "13"]),
  int("maxHp", "ХП", ["hp", "хіти", "hit points", "hp_avg"], ["7 (2к6)", "11 (2к8 + 2)"]),
  int("speed", "Швидкість", [], ["30", "40"]),
  int("strength", "СИЛ", ["str", "сила"], ["8 (-1)", "12"]),
  int("dexterity", "ЛОВ", ["спр", "dex", "спритність"], ["14", "15"]),
  int("constitution", "ТІЛ", ["con", "статура"], ["10", "12"]),
  int("intelligence", "ІНТ", ["int", "інтелект"], ["10", "3"]),
  int("wisdom", "МДР", ["муд", "wis", "мудрість"], ["8", "12"]),
  int("charisma", "ХАР", ["cha", "харизма"], ["8", "6"]),
  { key: "attacks", label: "Атаки", aliases: ["атака"], type: "attacks", examples: ["Короткий лук +4, 1к6+2 колючий", "Укус +4, 2к4+2 колючий"] },
  { key: "abilities", label: "Навички/Здібності", aliases: ["особливості", "features", "здібності", "traits"], type: "abilitiesText", examples: ["Втеча: бонусною дією відходить або ховається", "Зграя: перевага на атаку, якщо поруч союзник"] },
  { key: "immunities", label: "Імунітети", aliases: ["імунітет"], type: "list", examples: ["", "poison"] },
  { key: "knownSpells", label: "Заклинання", aliases: ["spells", "known spells"], type: "refList", ref: "spells", examples: ["", ""] },
  int("proficiencyBonus", "Майстерність", ["proficiency", "бонус майстерності"], ["", ""]),
  int("gridSize", "Розмір на мапі", ["клітинок"], ["1", "1"]),
  int("morale", "Мораль", [], ["0", "1"]),
  int("minTargets", "Мін. цілей", [], ["1", "1"]),
  int("maxTargets", "Макс. цілей", [], ["1", "1"]),
  { key: "cr", label: "CR", aliases: ["небезпека", "рівень небезпеки", "challenge"], type: "cr", examples: ["1/4", "1/4"] },
  int("xp", "XP", ["досвід"], ["", ""]),
  int("multiattack", "Мультиатака", ["атак за дію"], ["1", "1"]),
  int("legendaryActions", "Легендарні дії", ["legendary actions"], ["0", "0"]),
  int("legendaryResistances", "Легендарний опір", ["legendary resistance", "legendary resistances"], ["0", "0"]),
  { key: "saveProficiencies", label: "Рятівні кидки", aliases: ["save proficiencies", "saving throw proficiencies"], type: "list", ...ABILITY_ENUM, examples: ["", "dexterity, wisdom"] },
];

export const UNITS_IMPORT: ImportSpec = {
  kind: "units",
  label: "Юніти",
  fields,
  // the old CSV import derived proficiency from the tier; files without the column keep that
  toBody: (record, op) =>
    op === "create" && record.proficiencyBonus === undefined && record.cr === undefined
      ? { ...record, proficiencyBonus: getProficiencyBonus(typeof record.level === "number" ? record.level : 1) }
      : record,
};
```

- [ ] **Step 5:** `pnpm test:run lib/utils/content/import/__tests__/units-fields.test.ts` + `pnpm test:related lib/server/content/resources/units.ts lib/utils/units/unit-create-data.ts` — PASS (наявні `units-resource*.test.ts` без змін). Якщо еквівалентність падає на конкретному юніті — порівняти поле з повідомлення: розбіжність виправляється в реєстрі (синонім/тип/`toBody`), **не** в `unit-parsing.ts`/`import-units.ts`.

- [ ] **Step 6: Commit**

```bash
git add lib/utils/content/import/fields lib/utils/content/import/__tests__/units-fields.test.ts lib/utils/units/unit-create-data.ts lib/server/content/resources/units.ts
git commit -m "feat(constructor): 4f-0 unit import fields compatible with the old CSV

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Реєстр полів решти видів і `IMPORT_SPECS`

**Files:**
- Create: `lib/utils/content/import/fields/{spells,skills,main-skills,spell-groups,races,classes,artifacts,artifact-sets,index}.ts`
- Modify: `lib/utils/content/import/index.ts` (додати `export * from "./fields";`)
- Test: `lib/utils/content/import/__tests__/fields.test.ts`

**Interfaces:**
- Consumes: `fields/common.ts`, `UNITS_IMPORT` (задача 3); `SPELL_COSTS` (`lib/utils/spells/model/schema.ts`), `MAIN_SKILL_ROLES`/`MAIN_SKILL_ROLE_LABELS`, `SPELL_GROUP_ICON_KEYS`, `CLASS_CASTERS`/`CLASS_CASTER_LABELS`, `ARTIFACT_RARITY_VALUES`/`ARTIFACT_RARITY_OPTIONS`/`ARTIFACT_SLOT_VALUES`/`ARTIFACT_SLOT_OPTIONS`.
- Produces: `export const IMPORT_SPECS: Record<ImportKind, ImportSpec>` (з `@/lib/utils/content/import` і `@/lib/utils/content/import/fields`); `SPELLS_IMPORT`, `SKILLS_IMPORT`, `MAIN_SKILLS_IMPORT`, `SPELL_GROUPS_IMPORT`, `RACES_IMPORT`, `CLASSES_IMPORT`, `ARTIFACTS_IMPORT`, `ARTIFACT_SETS_IMPORT`. Кожна специфікація має поле `name` (обов'язкове); ключі полів = ключі тіла create, крім `skills` (плоскі `name`, `description`, `icon`, `image`, `mainSkillId`, `spellId`, `spellGroupId`, `grantedSpellId`, `abilities` → `toBody` вкладає в `basicInfo`/`spellData`/`mainSkillData`).

- [ ] **Step 1: Failing test**

```ts
// lib/utils/content/import/__tests__/fields.test.ts
import { describe, expect, it } from "vitest";
import type { ZodType } from "zod";

import { createArtifactSchema, createArtifactSetSchema, createClassSchema, createMainSkillSchema, createRaceSchema, createSkillSchema, createSpellGroupSchema, createSpellSchema, createUnitSchema } from "@/lib/schemas";
import { autoMap, IMPORT_KINDS, IMPORT_SPECS, normalizeHeader, transformRow } from "@/lib/utils/content/import";
import type { ImportKind } from "@/types/content-import";

const CREATE: Record<ImportKind, ZodType> = {
  units: createUnitSchema,
  spells: createSpellSchema,
  skills: createSkillSchema,
  "main-skills": createMainSkillSchema,
  "spell-groups": createSpellGroupSchema,
  races: createRaceSchema,
  classes: createClassSchema,
  artifacts: createArtifactSchema,
  "artifact-sets": createArtifactSetSchema,
};

const exampleRow = (kind: ImportKind, i: 0 | 1) => Object.fromEntries(IMPORT_SPECS[kind].fields.map((f) => [f.label, f.examples[i]]));

describe("IMPORT_SPECS", () => {
  it("є специфікація для кожного виду імпорту", () => expect(Object.keys(IMPORT_SPECS).sort()).toEqual([...IMPORT_KINDS].sort()));

  it.each(IMPORT_KINDS)("%s: одне обов'язкове поле name", (kind) => {
    const { fields } = IMPORT_SPECS[kind];

    expect(fields.filter((f) => f.key === "name")).toHaveLength(1);
    expect(fields.find((f) => f.key === "name")?.required).toBe(true);
  });

  it.each(IMPORT_KINDS)("%s: ключ, підпис і синоніми не перетинаються між полями", (kind) => {
    const owner = new Map<string, string>();

    for (const f of IMPORT_SPECS[kind].fields) {
      for (const alias of [f.key, f.label, ...f.aliases]) {
        const k = normalizeHeader(alias);

        expect(owner.get(k) ?? f.key, `${kind}: «${alias}»`).toBe(f.key);
        owner.set(k, f.key);
      }
    }
  });

  it.each(IMPORT_KINDS)("%s: посилання ведуть на відомі види", (kind) => {
    for (const f of IMPORT_SPECS[kind].fields) if (f.type === "ref" || f.type === "refList") expect(IMPORT_KINDS).toContain(f.ref);
  });

  it.each(IMPORT_KINDS)("%s: обидва рядки прикладу проходять схему створення", (kind) => {
    const spec = IMPORT_SPECS[kind];

    for (const i of [0, 1] as const) {
      const row = exampleRow(kind, i);

      const { value, issues } = transformRow(row, autoMap(Object.keys(row), spec.fields), spec.fields);

      expect(issues).toEqual([]);

      const parsed = CREATE[kind].safeParse(spec.toBody ? spec.toBody(value, "create") : value);

      expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true);
    }
  });

  it("skills: create вкладає групи завжди, update — лише надані", () => {
    expect(IMPORT_SPECS.skills.toBody?.({ name: "А" }, "create")).toEqual({ basicInfo: { name: "А" }, spellData: {}, mainSkillData: {} });
    expect(IMPORT_SPECS.skills.toBody?.({ name: "А", mainSkillId: "m1", abilities: [] }, "update")).toEqual({ abilities: [], basicInfo: { name: "А" }, mainSkillData: { mainSkillId: "m1" } });
  });

  it("spells: «8d6» → 8 кісток і грань 6; явна грань лишається; число — як є", () => {
    expect(IMPORT_SPECS.spells.toBody?.({ name: "А", dice: "8d6" }, "create")).toEqual({ name: "А", dice: 8, dieSides: 6 });
    expect(IMPORT_SPECS.spells.toBody?.({ name: "А", dice: "2d8", dieSides: 10 }, "create")).toEqual({ name: "А", dice: 2, dieSides: 10 });
    expect(IMPORT_SPECS.spells.toBody?.({ name: "А", dice: 3 }, "create")).toEqual({ name: "А", dice: 3 });
  });

  it("enum-підписи: слот артефакта, роль, тип заклинача, характеристики класу", () => {
    const row = { Назва: "Меч", Слот: "зброя" };

    expect(transformRow(row, autoMap(Object.keys(row), IMPORT_SPECS.artifacts.fields), IMPORT_SPECS.artifacts.fields).value).toEqual({ name: "Меч", slot: "weapon" });

    const cls = { Назва: "Жрець", "Тип заклинача": "Повний заклинач", "Рятівні кидки": "Мудрість, ХАР" };

    expect(transformRow(cls, autoMap(Object.keys(cls), IMPORT_SPECS.classes.fields), IMPORT_SPECS.classes.fields).value).toEqual({ name: "Жрець", caster: "full", savingThrows: ["wisdom", "charisma"] });
  });
});
```

- [ ] **Step 2:** `pnpm test:run lib/utils/content/import/__tests__/fields.test.ts` — FAIL (`IMPORT_SPECS` немає).

- [ ] **Step 3: Implement**

```ts
// lib/utils/content/import/fields/spells.ts
import { jsonField, nameField, textField } from "./common";

import { SPELL_COSTS } from "@/lib/utils/spells/model/schema";
import type { ImportField, ImportSpec } from "@/types/content-import";

const fields: ImportField[] = [
  nameField(["Вогняна куля", "Лікування ран"]),
  { key: "level", label: "Коло", aliases: ["рівень", "круг"], type: "int", examples: ["3", "1"] },
  { key: "groupId", label: "Школа", aliases: ["школа магії", "school", "група", "group"], type: "ref", ref: "spell-groups", examples: ["", ""] },
  textField("description", "Опис", ["description"], ["Вибух полум'я радіусом 20 футів", "Відновлює хіти дотиком"]),
  textField("appearanceDescription", "Опис вигляду", ["appearance"]),
  textField("icon", "Іконка", ["icon"]),
  { key: "cost", label: "Вартість", aliases: ["дія", "casting time", "час накладання"], type: "enum", enumValues: SPELL_COSTS, enumLabels: { action: ["Дія", "1 дія"], bonusAction: ["Бонусна дія", "bonus action", "бонус"] }, examples: ["Дія", "Бонусна дія"] },
  { key: "dice", label: "Кістки", aliases: ["кубики", "damage", "шкода"], type: "dice", examples: ["8d6", "1d8"] },
  { key: "dieSides", label: "Грань кубика", aliases: ["die", "грань"], type: "int", examples: ["", ""] },
  { key: "concentration", label: "Концентрація", aliases: [], type: "bool", examples: ["ні", "ні"] },
  { key: "stackable", label: "Стакається", aliases: [], type: "bool", examples: ["ні", "ні"] },
  { key: "maxStacks", label: "Макс. стаків", aliases: [], type: "int", examples: ["", ""] },
  { key: "upcastDice", label: "Кістки за коло", aliases: ["upcast"], type: "int", examples: ["1", "1"] },
  { key: "upcastTargets", label: "Цілі за коло", aliases: [], type: "int", examples: ["", ""] },
  { key: "addAbilityMod", label: "Додавати модифікатор", aliases: [], type: "bool", examples: ["ні", "так"] },
  jsonField("targeting", "Ціль (JSON)", ["ціль", "target"], ['{"kind":"template","shape":"circle","size":20,"side":"enemy","maxTargets":6}', '{"kind":"ally","range":5}']),
  jsonField("resolution", "Кидок (JSON)", ["кидок"], ['{"kind":"save","ability":"dexterity","onSuccess":"half"}', '{"kind":"auto"}']),
  jsonField("spellEffects", "Ефекти (JSON)", ["ефекти", "effects"], ["[]", "[]"]),
  jsonField("raceModifiers", "Модифікатори рас (JSON)", []),
  jsonField("fx", "Візуальний ефект (JSON)", []),
];

const DICE = /^(\d*)d(\d+)/;

export const SPELLS_IMPORT: ImportSpec = {
  kind: "spells",
  label: "Заклинання",
  fields,
  toBody: (record) => {
    const m = typeof record.dice === "string" ? DICE.exec(record.dice) : null;

    if (!m) return record;

    return { ...record, dice: Number(m[1] || 1), ...(record.dieSides === undefined && { dieSides: Number(m[2]) }) };
  },
};
```

```ts
// lib/utils/content/import/fields/skills.ts
import { abilitiesField, nameField, textField } from "./common";

import type { ImportField, ImportRecord, ImportSpec } from "@/types/content-import";

const fields: ImportField[] = [
  nameField(["Стійкість", "Майстер меча"]),
  textField("description", "Опис", ["description"], ["+1 до КД", "Додаткова атака мечем"]),
  textField("icon", "Іконка", ["icon"]),
  textField("image", "Зображення", ["image"]),
  { key: "mainSkillId", label: "Основний скіл", aliases: ["гілка", "main skill"], type: "ref", ref: "main-skills", examples: ["", ""] },
  { key: "spellId", label: "Заклинання", aliases: ["spell"], type: "ref", ref: "spells", examples: ["", ""] },
  { key: "spellGroupId", label: "Школа магії", aliases: ["школа", "spell group"], type: "ref", ref: "spell-groups", examples: ["", ""] },
  { key: "grantedSpellId", label: "Дає заклинання", aliases: ["granted spell"], type: "ref", ref: "spells", examples: ["", ""] },
  abilitiesField(["Стійкість: +1 до КД", ""]),
];

const pick = (record: ImportRecord, keys: readonly string[]): ImportRecord => Object.fromEntries(keys.filter((k) => record[k] !== undefined).map((k) => [k, record[k]]));

export const SKILLS_IMPORT: ImportSpec = {
  kind: "skills",
  label: "Скіли",
  fields,
  toBody: (record, op) => {
    const groups = {
      basicInfo: pick(record, ["name", "description", "icon"]),
      spellData: pick(record, ["spellId", "spellGroupId", "grantedSpellId"]),
      mainSkillData: pick(record, ["mainSkillId"]),
    };

    const body = pick(record, ["abilities", "image"]);

    for (const [key, group] of Object.entries(groups)) if (op === "create" || Object.keys(group).length > 0) body[key] = group;

    return body;
  },
};
```

```ts
// lib/utils/content/import/fields/main-skills.ts
import { nameField, recordLabels, textField } from "./common";

import { MAIN_SKILL_ROLE_LABELS, MAIN_SKILL_ROLES } from "@/lib/constants/main-skills";
import type { ImportSpec } from "@/types/content-import";

export const MAIN_SKILLS_IMPORT: ImportSpec = {
  kind: "main-skills",
  label: "Основні скіли",
  fields: [
    nameField(["Напад", "Магія Світла"]),
    { key: "color", label: "Колір", aliases: ["color"], type: "string", required: true, examples: ["#c0392b", "#f1c40f"] },
    textField("icon", "Іконка", ["icon"]),
    { key: "isEnableInSkillTree", label: "У дереві скілів", aliases: ["в дереві", "enabled"], type: "bool", examples: ["так", "так"] },
    { key: "spellGroupId", label: "Школа магії", aliases: ["школа", "spell group"], type: "ref", ref: "spell-groups", examples: ["", ""] },
    { key: "role", label: "Роль", aliases: ["role"], type: "enum", enumValues: MAIN_SKILL_ROLES, enumLabels: recordLabels(MAIN_SKILL_ROLE_LABELS), examples: ["Напад", "Магія"] },
  ],
};
```

```ts
// lib/utils/content/import/fields/spell-groups.ts
import { nameField, textField } from "./common";

import { SPELL_GROUP_ICON_KEYS } from "@/lib/constants/spell-groups";
import type { ImportSpec } from "@/types/content-import";

export const SPELL_GROUPS_IMPORT: ImportSpec = {
  kind: "spell-groups",
  label: "Школи магії",
  fields: [
    nameField(["Магія Хаосу", "Магія Світла"]),
    textField("color", "Колір", ["color"], ["#e25822", "#f5d76e"]),
    { key: "icon", label: "Іконка", aliases: ["icon"], type: "enum", enumValues: SPELL_GROUP_ICON_KEYS, examples: ["flame", "sun"] },
  ],
};
```

```ts
// lib/utils/content/import/fields/races.ts
import { abilitiesField, jsonField, nameField, textField } from "./common";

import type { ImportSpec } from "@/types/content-import";

export const RACES_IMPORT: ImportSpec = {
  kind: "races",
  label: "Раси",
  fields: [
    nameField(["Ельфи", "Гноми"]),
    textField("icon", "Іконка", ["icon"]),
    textField("color", "Колір", ["color"], ["#2e8b57", "#b8860b"]),
    { key: "availableSkills", label: "Доступні основні скіли", aliases: ["available skills", "основні скіли"], type: "refList", ref: "main-skills", examples: ["", ""] },
    { key: "disabledSkills", label: "Заборонені скіли", aliases: ["disabled skills"], type: "refList", ref: "skills", examples: ["", ""] },
    jsonField("passiveAbility", "Пасивна здібність (JSON)", ["passive ability"], ['{"name":"Лісова стежка","description":"Швидкість +10 у лісі"}', ""]),
    jsonField("spellSlotProgression", "Слоти заклинань (JSON)", ["слоти"], ['[{"level":1,"slots":2}]', ""]),
    abilitiesField(),
  ],
};
```

```ts
// lib/utils/content/import/fields/classes.ts
import { ABILITY_ENUM, jsonField, nameField, recordLabels, textField } from "./common";

import { CLASS_CASTER_LABELS, CLASS_CASTERS } from "@/lib/constants/classes";
import type { ImportSpec } from "@/types/content-import";

export const CLASSES_IMPORT: ImportSpec = {
  kind: "classes",
  label: "Класи",
  fields: [
    nameField(["Воїн", "Чарівник"]),
    textField("icon", "Іконка", ["icon"]),
    textField("color", "Колір", ["color"], ["#8b0000", "#1e3a8a"]),
    { key: "hitDie", label: "Кістка хітів", aliases: ["hit die", "hd", "кістка"], type: "int", examples: ["10", "6"] },
    { key: "savingThrows", label: "Рятівні кидки", aliases: ["saving throws", "saves"], type: "list", ...ABILITY_ENUM, examples: ["strength, constitution", "intelligence, wisdom"] },
    jsonField("proficiencies", "Майстерності (JSON)", ["proficiencies"], ['{"armor":["усі обладунки","щити"],"weapons":["прості","бойові"],"tools":[]}', '{"armor":[],"weapons":["кинджали"],"tools":[]}']),
    jsonField("skillChoices", "Вибір навичок (JSON)", ["skill choices"], ['{"count":2,"from":["athletics","perception"]}', '{"count":2,"from":["arcana","history"]}']),
    { key: "caster", label: "Тип заклинача", aliases: ["caster", "заклинач"], type: "enum", enumValues: CLASS_CASTERS, enumLabels: recordLabels(CLASS_CASTER_LABELS), examples: ["Не заклинач", "Повний заклинач"] },
    { key: "spellcastingAbility", label: "Характеристика заклинань", aliases: ["spellcasting ability"], type: "enum", ...ABILITY_ENUM, examples: ["", "intelligence"] },
    jsonField("features", "Вміння за рівнями (JSON)", ["features", "вміння"], ["[]", "[]"]),
    { key: "subclassLevel", label: "Рівень підкласу", aliases: ["subclass level"], type: "int", examples: ["3", "2"] },
    jsonField("subclasses", "Підкласи (JSON)", ["subclasses"], ["[]", "[]"]),
  ],
};
```

```ts
// lib/utils/content/import/fields/artifacts.ts
import { abilitiesField, jsonField, nameField, optionLabels, textField } from "./common";

import { ARTIFACT_RARITY_OPTIONS, ARTIFACT_RARITY_VALUES, ARTIFACT_SLOT_OPTIONS, ARTIFACT_SLOT_VALUES } from "@/lib/constants/artifacts";
import type { ImportSpec } from "@/types/content-import";

export const ARTIFACTS_IMPORT: ImportSpec = {
  kind: "artifacts",
  label: "Артефакти",
  fields: [
    nameField(["Меч Дракона", "Кільце захисту"]),
    textField("description", "Опис", ["description"], ["Старовинний меч", "+1 до КД"]),
    { key: "rarity", label: "Рідкість", aliases: ["rarity"], type: "enum", enumValues: ARTIFACT_RARITY_VALUES, enumLabels: optionLabels(ARTIFACT_RARITY_OPTIONS), examples: ["Рідкісний", "Незвичайний"] },
    { key: "slot", label: "Слот", aliases: ["slot", "тип"], type: "enum", required: true, enumValues: ARTIFACT_SLOT_VALUES, enumLabels: optionLabels(ARTIFACT_SLOT_OPTIONS), examples: ["Зброя", "Кільце"] },
    { key: "setId", label: "Сет", aliases: ["set", "комплект"], type: "ref", ref: "artifact-sets", examples: ["", ""] },
    textField("icon", "Іконка", ["icon"]),
    jsonField("weapon", "Зброя (JSON)", ["weapon"], ['{"damageDice":"1d8","damageType":"slashing","attackType":"melee"}', ""]),
    abilitiesField(),
  ],
};
```

```ts
// lib/utils/content/import/fields/artifact-sets.ts
import { abilitiesField, jsonField, nameField, textField } from "./common";

import type { ImportSpec } from "@/types/content-import";

export const ARTIFACT_SETS_IMPORT: ImportSpec = {
  kind: "artifact-sets",
  label: "Сети артефактів",
  fields: [
    nameField(["Обладунки Дракона", "Регалії Мага"]),
    textField("description", "Опис", ["description"]),
    jsonField("setBonus", "Бонус сету (JSON)", ["set bonus", "бонус"], ['{"name":"Драконяча кров","description":"+2 до КД за повний комплект"}', ""]),
    abilitiesField(),
    { key: "artifactIds", label: "Артефакти", aliases: ["artifacts"], type: "refList", ref: "artifacts", examples: ["", ""] },
    textField("icon", "Іконка", ["icon"]),
  ],
};
```

```ts
// lib/utils/content/import/fields/index.ts
import { ARTIFACT_SETS_IMPORT } from "./artifact-sets";
import { ARTIFACTS_IMPORT } from "./artifacts";
import { CLASSES_IMPORT } from "./classes";
import { MAIN_SKILLS_IMPORT } from "./main-skills";
import { RACES_IMPORT } from "./races";
import { SKILLS_IMPORT } from "./skills";
import { SPELL_GROUPS_IMPORT } from "./spell-groups";
import { SPELLS_IMPORT } from "./spells";
import { UNITS_IMPORT } from "./units";

import type { ImportKind, ImportSpec } from "@/types/content-import";

export const IMPORT_SPECS: Record<ImportKind, ImportSpec> = {
  units: UNITS_IMPORT,
  spells: SPELLS_IMPORT,
  skills: SKILLS_IMPORT,
  "main-skills": MAIN_SKILLS_IMPORT,
  "spell-groups": SPELL_GROUPS_IMPORT,
  races: RACES_IMPORT,
  classes: CLASSES_IMPORT,
  artifacts: ARTIFACTS_IMPORT,
  "artifact-sets": ARTIFACT_SETS_IMPORT,
};
```

У `lib/utils/content/import/index.ts` додати рядок `export * from "./fields";` (після `./kinds`, порядок — як вимагає `simple-import-sort`, `pnpm lint --fix` упорядкує).

- [ ] **Step 4:** `pnpm test:run lib/utils/content/import/__tests__` — PASS. Якщо падає «приклад проходить схему» — виправити **приклад або тип поля** в реєстрі (не схему ресурсу); якщо перетинаються синоніми — прибрати дубль із поля, де він менш очевидний.

- [ ] **Step 5: Commit**

```bash
git add lib/utils/content/import
git commit -m "feat(constructor): 4f-0 import field registry for all content kinds

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Сервер — `importContent` (режими, посилання, dryRun, звіт)

**Files:**
- Create: `lib/schemas/content-import.ts`, `lib/server/content/import/names.ts`, `lib/server/content/import/kind.ts`, `lib/server/content/import/import-content.ts`
- Modify: `lib/schemas/index.ts` (`export * from "./content-import";`), `lib/constants/api-errors.ts` (три ключі в кінець об'єкта `API_ERRORS`, перед `} as const;`)
- Test: `lib/server/content/__tests__/import-content.test.ts`, `lib/schemas/__tests__/content-import.test.ts`

**Interfaces:**
- Consumes: `IMPORT_SPECS`, `coerceRecord`, `nameKey`, `IMPORT_KINDS`, `IMPORT_MODES`, `IMPORT_LIMITS`, `isImportKind` (задачі 1–4); `CONTENT_RESOURCES`, `AnyContentResource`, `assertCan`, `ContentError`, `NEED`, `invalidateReference`.
- Produces:

```ts
// lib/schemas/content-import.ts
export const contentImportSchema: z.ZodObject<{ rows: z.ZodArray<z.ZodRecord<z.ZodString, z.ZodUnknown>>; mode: z.ZodDefault<z.ZodEnum<...>>; dryRun: z.ZodDefault<z.ZodBoolean> }>;
export type ContentImportInput = z.infer<typeof contentImportSchema>; // { rows: Record<string, unknown>[]; mode: ImportMode; dryRun: boolean }
export const aiMapRequestSchema: z.ZodObject<{ headers: z.ZodArray<z.ZodString>; sample: z.ZodArray<z.ZodRecord<z.ZodString, z.ZodString>> }>;
export type AiMapRequest = z.infer<typeof aiMapRequestSchema>;

// lib/server/content/import/names.ts
export function loadNames(campaignId: string, kind: ImportKind): Promise<IdName[]>; // за createdAt, id

// lib/server/content/import/kind.ts
export function importKindOf(value: string | undefined): ImportKind; // інакше ContentError 404 IMPORT_UNKNOWN_KIND

// lib/server/content/import/import-content.ts
export interface ImportDeps { resource(kind: ImportKind): AnyContentResource; loadNames(campaignId: string, kind: ImportKind): Promise<IdName[]> }
export async function importContent(actor: Actor, kind: ImportKind, input: ContentImportInput, deps?: ImportDeps): Promise<ImportReport>;
export function compactImportReport(report: ImportReport, limit?: number): { dryRun: boolean; counts: ImportCounts; rows: ImportRowResult[]; omitted: number };

// API_ERRORS
IMPORT_UNKNOWN_KIND: "Невідомий вид контенту для імпорту",
IMPORT_ROW_FAILED: "Не вдалося записати рядок",
IMPORT_AI_NO_KEY: "AI-ключ ДМ не налаштовано — зіставте колонки вручну",
```

Алгоритм (для реалізації й рев'ю): `assertCan(actor, NEED.write)` → назви власного виду й усіх видів-посилань одним `Promise.all` → для кожного рядка (`row` = індекс + 1): `coerceRecord`; немає `name` → помилка «Немає назви»; дубль назви у файлі → `skip`: пропущено з попередженням, інакше помилка; наявний запис з тією ж назвою: `create` → помилка «вже є в кампанії», `skip` → пропущено, `update` → оновлення першого (кілька — попередження); посилання (`ref`/`refList`) — точний id кампанії або назва без регістру → id, інакше помилка поля; `toBody`; `safeParse` схемою `create` або `update` ресурсу. Якщо `dryRun` — звіт без запису (`created`/`updated` = заплановано). Інакше валідні рядки по черзі: `resource.create(actor, body)` або `resource.update(actor, await resource.find(actor, id, "write"), body)`; `ContentError` → помилка рядка з повідомленням і `issues`; інша помилка → `console.error` (лише ім'я помилки) і `IMPORT_ROW_FAILED`. Після запису хоча б одного рядка — `invalidateReference(resource.invalidates, campaignId)` один раз (якщо список непорожній).

- [ ] **Step 1: Failing tests**

```ts
// lib/schemas/__tests__/content-import.test.ts
import { describe, expect, it } from "vitest";

import { aiMapRequestSchema, contentImportSchema } from "@/lib/schemas/content-import";

describe("contentImportSchema", () => {
  it("режим за замовчуванням create, dryRun false", () => {
    expect(contentImportSchema.parse({ rows: [{ name: "А" }] })).toEqual({ rows: [{ name: "А" }], mode: "create", dryRun: false });
  });

  it("0 і 501 рядок — помилка; 500 — гаразд", () => {
    expect(contentImportSchema.safeParse({ rows: [] }).success).toBe(false);
    expect(contentImportSchema.safeParse({ rows: Array.from({ length: 501 }, () => ({ name: "А" })) }).success).toBe(false);
    expect(contentImportSchema.safeParse({ rows: Array.from({ length: 500 }, () => ({ name: "А" })) }).success).toBe(true);
  });

  it("невідомий режим — помилка", () => expect(contentImportSchema.safeParse({ rows: [{}], mode: "merge" }).success).toBe(false));
});

describe("aiMapRequestSchema", () => {
  it("до 5 рядків прикладу, клітинки до 200 символів", () => {
    expect(aiMapRequestSchema.safeParse({ headers: ["A"], sample: Array.from({ length: 6 }, () => ({ A: "1" })) }).success).toBe(false);
    expect(aiMapRequestSchema.safeParse({ headers: ["A"], sample: [{ A: "x".repeat(201) }] }).success).toBe(false);
    expect(aiMapRequestSchema.safeParse({ headers: ["A"], sample: [{ A: "1" }] }).success).toBe(true);
  });
});
```

```ts
// lib/server/content/__tests__/import-content.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const invalidateReference = vi.hoisted(() => vi.fn());

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ prisma: {} }));
vi.mock("@/lib/cache/tags", () => ({ invalidateReference }));
vi.mock("@/lib/server/content/resources", () => ({ CONTENT_RESOURCES: {} }));

import type { ZodType } from "zod";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { createArtifactSchema, createArtifactSetSchema, createClassSchema, createMainSkillSchema, createRaceSchema, createSkillSchema, createSpellGroupSchema, createSpellSchema } from "@/lib/schemas";
import { createUnitSchema, updateUnitSchema } from "@/lib/schemas/units";
import { type AnyContentResource, defineResource } from "@/lib/server/content/define-resource";
import { ContentError } from "@/lib/server/content/errors";
import { compactImportReport, importContent, type ImportDeps } from "@/lib/server/content/import/import-content";
import type { Actor } from "@/lib/utils/api/actor";
import { IMPORT_KINDS, IMPORT_SPECS } from "@/lib/utils/content/import";
import type { IdName } from "@/types/common";
import type { ImportKind, ImportMode } from "@/types/content-import";

const actor: Actor = { campaignId: "c1", userId: "u", isDM: true, via: "session", scopes: null };

let names: Record<string, IdName[]>;

const create = vi.fn(async (_a: unknown, input: Record<string, unknown>) => ({ id: "new", name: String(input.name) }));

const update = vi.fn(async (_a: unknown, existing: { id: string }, input: Record<string, unknown>) => ({ ...existing, ...input }));

const find = vi.fn(async (_a: unknown, id: string) => ({ id, name: "наявний" }));

const resource = defineResource({
  kind: "units",
  listFields: [],
  idParam: "unitId",
  label: "Юніти",
  description: "",
  path: "/units",
  schemas: { create: createUnitSchema, update: updateUnitSchema },
  access: { list: "member", item: "member" },
  invalidates: ["units"],
  notFound: "Немає",
  list: async () => [],
  find: find as never,
  create: create as never,
  update: update as never,
  remove: async () => {},
});

const deps: ImportDeps = { resource: () => resource, loadNames: async (_c, kind) => names[kind] ?? [] };

const run = (rows: Record<string, unknown>[], mode: ImportMode = "create", dryRun = false, who: Actor = actor) => importContent(who, "units", { rows, mode, dryRun }, deps);

describe("importContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    names = {
      units: [{ id: "u1", name: "Вовк" }],
      races: [{ id: "r1", name: "Гноми" }, { id: "r2", name: "Гноми" }],
      spells: [{ id: "s1", name: "Вогонь" }],
    };
  });

  it("create: новий запис створюється, наявна назва — помилка рядка; лічильники", async () => {
    const report = await run([{ name: "Біс", maxHp: "18 (4к6)" }, { name: "  вовк " }]);

    expect(create).toHaveBeenCalledTimes(1);
    expect(create.mock.calls[0][1]).toMatchObject({ name: "Біс", maxHp: 18, level: 1 });
    expect(report.results.map((r) => r.status)).toEqual(["created", "error"]);
    expect(report.results[1].issues[0].message).toBe("«вовк» вже є в кампанії");
    expect(report.counts).toEqual({ created: 1, updated: 0, skipped: 0, error: 1 });
    expect(invalidateReference).toHaveBeenCalledWith(["units"], "c1");
  });

  it("update: наявний — оновлення лише наданими полями (порожні клітинки не скидають); відсутній — створення", async () => {
    const report = await run([{ name: "Вовк", maxHp: "20", speed: "" }, { name: "Біс" }], "update");

    expect(find).toHaveBeenCalledWith(actor, "u1", "write");
    expect(update.mock.calls[0][2]).toEqual({ name: "Вовк", maxHp: 20 });
    expect(create).toHaveBeenCalledTimes(1);
    expect(report.results.map((r) => r.status)).toEqual(["updated", "created"]);
  });

  it("update: кілька наявних з однією назвою — перший і попередження", async () => {
    names.units = [{ id: "u1", name: "Вовк" }, { id: "u2", name: "вовк" }];

    const report = await run([{ name: "Вовк" }], "update");

    expect(find).toHaveBeenCalledWith(actor, "u1", "write");
    expect(report.results[0].issues).toEqual([{ level: "warning", message: "Кілька записів «Вовк» — оновлено перший" }]);
  });

  it("skip: наявні пропускаються без запису", async () => {
    const report = await run([{ name: "Вовк" }, { name: "Біс" }], "skip");

    expect(report.results.map((r) => r.status)).toEqual(["skipped", "created"]);
    expect(update).not.toHaveBeenCalled();
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("посилання: назва без регістру й пробілів, точний id, кілька однакових — перша; невідома — помилка поля, рядок не записано", async () => {
    const report = await run([
      { name: "А", raceId: "  гноми ", knownSpells: "вогонь" },
      { name: "Б", raceId: "r2" },
      { name: "В", raceId: "Ельфи", knownSpells: ["Вогонь", "Лід"] },
    ]);

    expect(create.mock.calls.map((c) => [c[1].raceId, c[1].knownSpells])).toEqual([["r1", ["s1"]], ["r2", []]]);
    expect(report.results[2].status).toBe("error");
    expect(report.results[2].issues).toEqual([
      { field: "raceId", level: "error", message: "Раса: не знайдено «Ельфи» (Раси)" },
      { field: "knownSpells", level: "error", message: "Заклинання: не знайдено «Лід» (Заклинання)" },
    ]);
  });

  it("частковий успіх: погане значення й помилка схеми — помилки рядків, валідний записано", async () => {
    const report = await run([{ name: "А", maxHp: "багато" }, { name: "Б", level: "50" }, { name: "В" }, {}]);

    expect(report.results.map((r) => r.status)).toEqual(["error", "error", "created", "error"]);
    expect(report.results[0].issues[0]).toMatchObject({ field: "maxHp", level: "error" });
    expect(report.results[1].issues[0]).toMatchObject({ field: "level", level: "error" });
    expect(report.results[3].issues).toEqual([{ field: "name", level: "error", message: "Немає назви" }]);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("dryRun: нічого не пише й не скидає кеш, статуси — заплановані", async () => {
    const report = await run([{ name: "Вовк" }, { name: "Біс" }], "update", true);

    expect(report.dryRun).toBe(true);
    expect(report.results.map((r) => r.status)).toEqual(["updated", "created"]);
    expect(create).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
    expect(invalidateReference).not.toHaveBeenCalled();
  });

  it("дублі назв у файлі: create — помилка другого, skip — пропуск другого", async () => {
    expect((await run([{ name: "Біс" }, { name: "БІС" }])).results.map((r) => r.status)).toEqual(["created", "error"]);
    expect((await run([{ name: "Біс" }, { name: "біс" }], "skip")).results.map((r) => r.status)).toEqual(["created", "skipped"]);
  });

  it("права: гравець і токен лише з content:read — 403, нічого не читається", async () => {
    await expect(run([{ name: "А" }], "create", false, { ...actor, isDM: false })).rejects.toMatchObject({ status: 403 });
    await expect(run([{ name: "А" }], "create", false, { ...actor, via: "token", scopes: ["content:read"] })).rejects.toBeInstanceOf(ContentError);
    expect(create).not.toHaveBeenCalled();
  });

  it("помилка запису: ContentError — її текст; інша — загальний текст; решта рядків пишеться", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    create.mockRejectedValueOnce(new ContentError("Раса «А» уже є в кампанії", 409)).mockRejectedValueOnce(new Error("db down"));

    const report = await run([{ name: "А" }, { name: "Б" }, { name: "В" }]);

    expect(report.results.map((r) => [r.status, r.issues[0]?.message])).toEqual([["error", "Раса «А» уже є в кампанії"], ["error", API_ERRORS.IMPORT_ROW_FAILED], ["created", undefined]]);
    expect(error).toHaveBeenCalledWith("[content import]", "units", "Error");
    error.mockRestore();
  });

  it("нічого не записано — кеш не скидається", async () => {
    await run([{ name: "Вовк" }]);

    expect(invalidateReference).not.toHaveBeenCalled();
  });
});

const CREATE: Record<ImportKind, ZodType> = {
  units: createUnitSchema,
  spells: createSpellSchema,
  skills: createSkillSchema,
  "main-skills": createMainSkillSchema,
  "spell-groups": createSpellGroupSchema,
  races: createRaceSchema,
  classes: createClassSchema,
  artifacts: createArtifactSchema,
  "artifact-sets": createArtifactSetSchema,
};

describe("importContent: кожен вид", () => {
  it.each(IMPORT_KINDS)("%s: перший рядок прикладу (сирі клітинки під ключами полів) проходить серверний шлях", async (kind) => {
    const row = Object.fromEntries(IMPORT_SPECS[kind].fields.map((f) => [f.key, f.examples[0]]));

    const kindResource: AnyContentResource = { ...resource, schemas: { create: CREATE[kind], update: CREATE[kind] } };

    const report = await importContent(actor, kind, { rows: [row], mode: "create", dryRun: true }, { resource: () => kindResource, loadNames: async () => [] });

    expect(report.results[0]).toMatchObject({ status: "created", issues: [] });
  });
});

describe("compactImportReport", () => {
  it("лише рядки з помилками/попередженнями, до ліміту, решта — omitted", () => {
    const results = [
      { row: 1, status: "created" as const, issues: [] },
      ...Array.from({ length: 3 }, (_, i) => ({ row: i + 2, status: "error" as const, issues: [{ level: "error" as const, message: "x" }] })),
    ];

    const compact = compactImportReport({ dryRun: false, results, counts: { created: 1, updated: 0, skipped: 0, error: 3 } }, 2);

    expect(compact.rows.map((r) => r.row)).toEqual([2, 3]);
    expect(compact.omitted).toBe(1);
    expect(compact.counts.error).toBe(3);
  });
});
```

- [ ] **Step 2:** `pnpm test:run lib/schemas/__tests__/content-import.test.ts lib/server/content/__tests__/import-content.test.ts` — FAIL (модулів немає).

- [ ] **Step 3: Implement**

```ts
// lib/schemas/content-import.ts
import { z } from "zod";

import { IMPORT_LIMITS, IMPORT_MODES } from "@/lib/utils/content/import/kinds";

export const contentImportSchema = z.object({
  rows: z
    .array(z.record(z.string(), z.unknown()))
    .min(1)
    .max(IMPORT_LIMITS.rowsPerRequest)
    .describe("Рядки: ключі — поля імпорту виду (як у тілі create; у skills — плоскі name, description, icon, image, mainSkillId, spellId, spellGroupId, grantedSpellId, abilities); посилання — назвою або id цієї кампанії; значення можна давати текстом, як у CSV"),
  mode: z.enum(IMPORT_MODES).default("create").describe("create — дубль назви = помилка рядка; update — оновити за назвою, інакше створити; skip — наявні пропустити"),
  dryRun: z.boolean().default(false).describe("Лише перевірка, без запису"),
});

export type ContentImportInput = z.infer<typeof contentImportSchema>;

export const aiMapRequestSchema = z.object({
  headers: z.array(z.string().max(200)).min(1).max(IMPORT_LIMITS.aiHeaders),
  sample: z.array(z.record(z.string(), z.string().max(IMPORT_LIMITS.aiCellChars))).max(IMPORT_LIMITS.aiSampleRows),
});

export type AiMapRequest = z.infer<typeof aiMapRequestSchema>;
```

```ts
// lib/server/content/import/names.ts
import "server-only";
import { prisma } from "@/lib/db";
import type { IdName } from "@/types/common";
import type { ImportKind } from "@/types/content-import";

const args = (campaignId: string) => ({
  where: { campaignId },
  select: { id: true, name: true },
  orderBy: [{ createdAt: "asc" as const }, { id: "asc" as const }],
});

const LOADERS: Record<ImportKind, (campaignId: string) => Promise<IdName[]>> = {
  units: (c) => prisma.unit.findMany(args(c)),
  spells: (c) => prisma.spell.findMany(args(c)),
  skills: (c) => prisma.skill.findMany(args(c)),
  "main-skills": (c) => prisma.mainSkill.findMany(args(c)),
  "spell-groups": (c) => prisma.spellGroup.findMany(args(c)),
  races: (c) => prisma.race.findMany(args(c)),
  classes: (c) => prisma.gameClass.findMany(args(c)),
  artifacts: (c) => prisma.artifact.findMany(args(c)),
  "artifact-sets": (c) => prisma.artifactSet.findMany(args(c)),
};

export const loadNames = (campaignId: string, kind: ImportKind) => LOADERS[kind](campaignId);
```

```ts
// lib/server/content/import/kind.ts
import "server-only";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { ContentError } from "@/lib/server/content/errors";
import { isImportKind } from "@/lib/utils/content/import/kinds";
import type { ImportKind } from "@/types/content-import";

export function importKindOf(value: string | undefined): ImportKind {
  if (!value || !isImportKind(value)) throw new ContentError(API_ERRORS.IMPORT_UNKNOWN_KIND, 404);

  return value;
}
```

```ts
// lib/server/content/import/import-content.ts
import "server-only";
import { invalidateReference } from "@/lib/cache/tags";
import { API_ERRORS } from "@/lib/constants/api-errors";
import type { ContentImportInput } from "@/lib/schemas/content-import";
import { assertCan } from "@/lib/server/content/access";
import type { AnyContentResource } from "@/lib/server/content/define-resource";
import { ContentError } from "@/lib/server/content/errors";
import { loadNames } from "@/lib/server/content/import/names";
import { CONTENT_RESOURCES } from "@/lib/server/content/resources";
import type { Actor } from "@/lib/utils/api/actor";
import { NEED } from "@/lib/utils/api/need";
import { isRecord } from "@/lib/utils/common/is-record";
import { IMPORT_SPECS } from "@/lib/utils/content/import/fields";
import { coerceRecord, nameKey } from "@/lib/utils/content/import/mapping";
import type { IdName } from "@/types/common";
import type { ImportCounts, ImportField, ImportIssue, ImportKind, ImportMode, ImportRecord, ImportReport, ImportRowResult, ImportSpec } from "@/types/content-import";

export interface ImportDeps {
  resource(kind: ImportKind): AnyContentResource;
  loadNames(campaignId: string, kind: ImportKind): Promise<IdName[]>;
}

const DEFAULT_DEPS: ImportDeps = { resource: (kind) => CONTENT_RESOURCES[kind] as AnyContentResource, loadNames };

type NameIndex = { byName: Map<string, string[]>; ids: Set<string> };

type Plan = { row: number; name?: string; status: ImportRowResult["status"] | "pending"; op?: "create" | "update"; existingId?: string; body?: unknown; issues: ImportIssue[] };

function indexNames(rows: IdName[]): NameIndex {
  const byName = new Map<string, string[]>();

  for (const r of rows) byName.set(nameKey(r.name), [...(byName.get(nameKey(r.name)) ?? []), r.id]);

  return { byName, ids: new Set(rows.map((r) => r.id)) };
}

const err = (message: string, field?: string): ImportIssue => ({ ...(field && { field }), level: "error", message });

const hasError = (issues: ImportIssue[]) => issues.some((i) => i.level === "error");

function resolveRefs(record: ImportRecord, fields: readonly ImportField[], refs: Map<ImportKind, NameIndex>, issues: ImportIssue[]) {
  for (const field of fields) {
    const value = record[field.key];

    if (!field.ref || value === undefined) continue;

    const index = refs.get(field.ref);

    const kindLabel = IMPORT_SPECS[field.ref].label;

    const resolve = (v: unknown) => {
      const s = String(v);

      const id = index?.ids.has(s) ? s : index?.byName.get(nameKey(s))?.[0];

      if (!id) issues.push(err(`${field.label}: не знайдено «${s}» (${kindLabel})`, field.key));

      return id;
    };

    if (field.type === "refList" && Array.isArray(value)) record[field.key] = value.map(resolve).filter((id): id is string => !!id);
    else record[field.key] = resolve(value);
  }
}

function zodIssues(error: { issues: Array<{ path: PropertyKey[]; message: string }> }): ImportIssue[] {
  return error.issues.map((i) => err(i.message, i.path.map(String).join(".") || undefined));
}

type PlanCtx = { spec: ImportSpec; resource: AnyContentResource; mode: ImportMode; existing: NameIndex; refs: Map<ImportKind, NameIndex>; seen: Set<string> };

function planRow(raw: Record<string, unknown>, row: number, ctx: PlanCtx): Plan {
  const { value: record, issues } = coerceRecord(raw, ctx.spec.fields);

  const name = typeof record.name === "string" ? record.name : undefined;

  if (!name) return { row, status: "error", issues: [...issues, err("Немає назви", "name")] };

  const key = nameKey(name);

  if (ctx.seen.has(key)) {
    const message = "Назва повторюється у файлі";

    return ctx.mode === "skip" ? { row, name, status: "skipped", issues: [...issues, { level: "warning", message }] } : { row, name, status: "error", issues: [...issues, err(message, "name")] };
  }

  ctx.seen.add(key);

  const matches = ctx.existing.byName.get(key) ?? [];

  if (matches.length > 0 && ctx.mode === "create") return { row, name, status: "error", issues: [...issues, err(`«${name}» вже є в кампанії`, "name")] };

  if (matches.length > 0 && ctx.mode === "skip") return { row, name, status: "skipped", issues };

  const op = matches.length > 0 ? "update" : "create";

  if (matches.length > 1) issues.push({ level: "warning", message: `Кілька записів «${name}» — оновлено перший` });

  resolveRefs(record, ctx.spec.fields, ctx.refs, issues);

  if (hasError(issues)) return { row, name, status: "error", issues };

  const body = ctx.spec.toBody ? ctx.spec.toBody(record, op) : record;

  const parsed = (op === "create" ? ctx.resource.schemas.create : ctx.resource.schemas.update).safeParse(body);

  if (!parsed.success) return { row, name, status: "error", issues: [...issues, ...zodIssues(parsed.error)] };

  return { row, name, status: "pending", op, existingId: matches[0], body: parsed.data, issues };
}

function contentErrorIssues(error: ContentError): ImportIssue[] {
  const extra = Array.isArray(error.issues)
    ? error.issues.map((i) =>
        isRecord(i) && typeof i.message === "string" ? err(i.message, Array.isArray(i.path) ? i.path.map(String).join(".") || undefined : undefined) : err(typeof i === "string" ? i : JSON.stringify(i)),
      )
    : [];

  return [err(error.message), ...extra];
}

async function writePlan(resource: AnyContentResource, actor: Actor, plan: Plan) {
  if (plan.op === "create") return resource.create(actor, plan.body);

  const existing = await resource.find(actor, plan.existingId as string, "write");

  if (!existing) throw new ContentError(resource.notFound, 404);

  return resource.update(actor, existing, plan.body);
}

const toResult = ({ row, name, status, op, issues }: Plan): ImportRowResult => ({
  row,
  ...(name && { name }),
  status: status === "pending" ? (op === "update" ? "updated" : "created") : status,
  issues,
});

function report(dryRun: boolean, results: ImportRowResult[]): ImportReport {
  const counts: ImportCounts = { created: 0, updated: 0, skipped: 0, error: 0 };

  for (const r of results) counts[r.status] += 1;

  return { dryRun, results, counts };
}

export async function importContent(actor: Actor, kind: ImportKind, input: ContentImportInput, deps: ImportDeps = DEFAULT_DEPS): Promise<ImportReport> {
  assertCan(actor, NEED.write);

  const spec = IMPORT_SPECS[kind];

  const resource = deps.resource(kind);

  const refKinds = [...new Set(spec.fields.flatMap((f) => (f.ref ? [f.ref] : [])))];

  const [own, ...refLists] = await Promise.all([deps.loadNames(actor.campaignId, kind), ...refKinds.map((k) => deps.loadNames(actor.campaignId, k))]);

  const ctx: PlanCtx = { spec, resource, mode: input.mode, existing: indexNames(own), refs: new Map(refKinds.map((k, i) => [k, indexNames(refLists[i])])), seen: new Set() };

  const plans = input.rows.map((raw, i) => planRow(raw, i + 1, ctx));

  if (input.dryRun) return report(true, plans.map(toResult));

  const results: ImportRowResult[] = [];

  let wrote = false;

  for (const plan of plans) {
    if (plan.status !== "pending") {
      results.push(toResult(plan));
      continue;
    }

    try {
      await writePlan(resource, actor, plan);
      wrote = true;
      results.push(toResult(plan));
    } catch (error) {
      if (!(error instanceof ContentError)) console.error("[content import]", kind, error instanceof Error ? error.name : "unknown");

      results.push({ ...toResult(plan), status: "error", issues: [...plan.issues, ...(error instanceof ContentError ? contentErrorIssues(error) : [err(API_ERRORS.IMPORT_ROW_FAILED)])] });
    }
  }

  if (wrote && resource.invalidates.length > 0) invalidateReference(resource.invalidates, actor.campaignId);

  return report(false, results);
}

export function compactImportReport(r: ImportReport, limit = 50) {
  const notable = r.results.filter((x) => x.status === "error" || x.issues.length > 0);

  return { dryRun: r.dryRun, counts: r.counts, rows: notable.slice(0, limit), omitted: Math.max(0, notable.length - limit) };
}
```

> Примітка: `op` завжди заданий у плані зі статусом `pending`. Тест «помилка запису» очікує, що для `ContentError` першим іде саме її повідомлення: `plan.issues` для валідного рядка порожні, тож `issues[0]` — повідомлення помилки.

`API_ERRORS` (`lib/constants/api-errors.ts`) — додати перед `} as const;`:

```ts
  IMPORT_UNKNOWN_KIND: "Невідомий вид контенту для імпорту",
  IMPORT_ROW_FAILED: "Не вдалося записати рядок",
  IMPORT_AI_NO_KEY: "AI-ключ ДМ не налаштовано — зіставте колонки вручну",
```

- [ ] **Step 4:** `pnpm test:run lib/schemas/__tests__/content-import.test.ts lib/server/content/__tests__/import-content.test.ts` + `pnpm test:related lib/schemas/index.ts lib/constants/api-errors.ts` — PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/schemas lib/server/content/import lib/server/content/__tests__/import-content.test.ts lib/constants/api-errors.ts
git commit -m "feat(constructor): 4f-0 server content import with modes, refs and dry run

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 6: Роут і операція `content.import`

**Files:**
- Modify: `lib/server/content/operations.ts` (рядок `content.import`, імпорти `contentImportSchema`, `IMPORT_KINDS`)
- Create: `app/api/campaigns/[id]/content-import/[kind]/route.ts`
- Test: `app/api/__tests__/content-import-route.test.ts`; наявний `lib/server/content/__tests__/openapi.test.ts` (без змін, перевіряє шлях → `route.ts`)

**Interfaces:**
- Consumes: `importContent`, `importKindOf`, `contentImportSchema` (задача 5); `operationRoute`, `CONTENT_OPERATIONS`.
- Produces: `CONTENT_OPERATIONS["content.import"]` — `POST /content-import/{kind}`, `NEED.write`, тіло `contentImportSchema`, відповідь `ImportReport` (`response: "object"`), `pathEnums.kind = IMPORT_KINDS`, тег «Імпорт і експорт». Роут: `POST /api/campaigns/[id]/content-import/[kind]` (`maxDuration = 120`).

- [ ] **Step 1: Failing test**

```ts
// app/api/__tests__/content-import-route.test.ts
import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getResponseJson } from "./helpers";

const state = vi.hoisted(() => ({ actor: null as unknown }));

const importContent = vi.hoisted(() => vi.fn());

vi.mock("server-only", () => ({}));
vi.mock("@/lib/utils/api/actor", () => ({ resolveActor: vi.fn(async () => state.actor) }));
vi.mock("@/lib/server/content/import/import-content", () => ({ importContent }));

import { POST } from "@/app/api/campaigns/[id]/content-import/[kind]/route";
import { resolveActor } from "@/lib/utils/api/actor";

const actor = { campaignId: "c1", userId: "u", isDM: true, via: "session", scopes: null };

const REPORT = { dryRun: true, results: [], counts: { created: 0, updated: 0, skipped: 0, error: 0 } };

const post = (kind: string, body: unknown) =>
  POST(new Request("http://x", { method: "POST", body: JSON.stringify(body) }), { params: Promise.resolve({ id: "c1", kind }) }) as Promise<NextResponse>;

describe("POST /content-import/[kind]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.actor = actor;
    importContent.mockResolvedValue(REPORT);
  });

  it("права: ДМ + content:write через resolveActor", async () => {
    state.actor = NextResponse.json({ error: "stop" }, { status: 418 });

    expect((await post("units", { rows: [{ name: "А" }] })).status).toBe(418);
    expect(resolveActor).toHaveBeenCalledWith(expect.any(Request), "c1", { access: "dm", scope: "content:write" });
  });

  it("тіло з defaults іде в importContent, відповідь — звіт", async () => {
    const res = await post("spells", { rows: [{ name: "А" }], dryRun: true });

    expect(res.status).toBe(200);
    expect(await getResponseJson(res)).toEqual(REPORT);
    expect(importContent).toHaveBeenCalledWith(actor, "spells", { rows: [{ name: "А" }], mode: "create", dryRun: true });
  });

  it("вид поза імпортом (tracks) — 404", async () => {
    const res = await post("tracks", { rows: [{ name: "А" }] });

    expect(res.status).toBe(404);
    expect(importContent).not.toHaveBeenCalled();
  });

  it("501 рядок — 400 без виклику", async () => {
    const res = await post("units", { rows: Array.from({ length: 501 }, () => ({ name: "А" })) });

    expect(res.status).toBe(400);
    expect(importContent).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2:** `pnpm test:run app/api/__tests__/content-import-route.test.ts` — FAIL (роуту немає).

- [ ] **Step 3: Implement**

`lib/server/content/operations.ts`: додати `contentImportSchema` у наявний імпорт з `"@/lib/schemas"`, новий імпорт `import { IMPORT_KINDS } from "@/lib/utils/content/import/kinds";` і рядок у `OPERATION_ROWS` (після `"units.import"`):

```ts
  "content.import": { method: "POST", path: "/content-import/{kind}", summary: "Імпорт контенту", description: "Масовий імпорт до 500 рядків виду kind. mode: create (дубль назви — помилка рядка) | update (оновити за назвою, інакше створити) | skip (наявні пропустити); dryRun — лише перевірка. Посилання — назвою або id цієї кампанії. Відповідь: статус і помилки кожного рядка, counts. Валідні рядки записуються, невалідні — у звіті.", need: NEED.write, body: contentImportSchema, response: "object", pathEnums: { kind: IMPORT_KINDS }, tag: "Імпорт і експорт" },
```

```ts
// app/api/campaigns/[id]/content-import/[kind]/route.ts
import { NextResponse } from "next/server";

import { importContent } from "@/lib/server/content/import/import-content";
import { importKindOf } from "@/lib/server/content/import/kind";
import { CONTENT_OPERATIONS } from "@/lib/server/content/operations";
import { operationRoute } from "@/lib/utils/api/content-routes";

export const maxDuration = 120;

export const POST = operationRoute(CONTENT_OPERATIONS["content.import"], async ({ actor, params, body }) => NextResponse.json(await importContent(actor, importKindOf(params.kind), body)));
```

- [ ] **Step 4:** `pnpm test:run app/api/__tests__/content-import-route.test.ts lib/server/content/__tests__/openapi.test.ts lib/server/content/__tests__/operations.test.ts app/api/__tests__/content-token-needs.test.ts` — PASS (якщо падає лише межа розміру OpenAPI — див. Global Constraints).

- [ ] **Step 5: Commit**

```bash
git add lib/server/content/operations.ts "app/api/campaigns/[id]/content-import" app/api/__tests__/content-import-route.test.ts
git commit -m "feat(constructor): 4f-0 content import route and openapi operation

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Приклад CSV і експорт CSV

**Files:**
- Create: `lib/server/content/import/csv-response.ts`, `lib/server/content/import/example.ts`, `lib/server/content/import/export.ts`, `app/api/campaigns/[id]/content-import/[kind]/example.csv/route.ts`, `app/api/campaigns/[id]/content-export/[kind]/route.ts`
- Modify: `lib/server/content/operations.ts` (`OperationResponse` += `"csv"`, два рядки), `lib/server/content/openapi.ts` (`SUCCESS_RESPONSES.csv`, тип вмісту відповіді)
- Test: `lib/server/content/__tests__/import-export.test.ts`, `app/api/__tests__/content-export-routes.test.ts`

**Interfaces:**
- Consumes: `IMPORT_SPECS`, `recordToCells`, `toCsv`, `parseTable`, `autoMap`, `transformRow` (задачі 1–4); `loadNames`, `importKindOf` (задача 5).
- Produces:

```ts
export function csvResponse(fileName: string, csv: string): NextResponse; // text/csv; charset=utf-8, attachment, private no-store
export async function exampleCsv(actor: Actor, kind: ImportKind, deps?: { loadNames(campaignId: string, kind: ImportKind): Promise<IdName[]> }): Promise<string>;
export type ExportDeps = { loadRecords(campaignId: string, kind: ImportKind): Promise<ImportRecord[]>; loadNames(campaignId: string, kind: ImportKind): Promise<IdName[]> };
export const EXPORT_LOADERS: Record<ImportKind, (campaignId: string) => Promise<ImportRecord[]>>;
export async function exportCsv(actor: Actor, kind: ImportKind, deps?: ExportDeps): Promise<string>;
// операції: "content.import-example" (GET /content-import/{kind}/example.csv), "content.export" (GET /content-export/{kind}); обидві NEED.read("dm"), response "csv"
```

- [ ] **Step 1: Failing tests**

```ts
// lib/server/content/__tests__/import-export.test.ts
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ prisma: {} }));
vi.mock("@/lib/utils/api/actor", () => ({ resolveActor: vi.fn() }));

import { exampleCsv } from "@/lib/server/content/import/example";
import { exportCsv } from "@/lib/server/content/import/export";
import { buildOpenApi } from "@/lib/server/content/openapi";
import type { Actor } from "@/lib/utils/api/actor";
import { autoMap, IMPORT_SPECS, parseTable, transformRow } from "@/lib/utils/content/import";
import type { IdName } from "@/types/common";
import type { ImportKind } from "@/types/content-import";

const actor: Actor = { campaignId: "c1", userId: "u", isDM: true, via: "session", scopes: null };

const NAMES: Partial<Record<ImportKind, IdName[]>> = {
  races: [{ id: "r1", name: "Гноми" }, { id: "r2", name: "Ельфи" }],
  spells: [{ id: "s1", name: "Вогонь, сильний" }, { id: "s2", name: "Лід" }],
};

const loadNames = async (_c: string, kind: ImportKind) => NAMES[kind] ?? [];

const readBack = (csv: string, kind: ImportKind) => {
  const table = parseTable(csv);

  const mapping = autoMap(table.headers, IMPORT_SPECS[kind].fields);

  return { table, mapping, rows: table.rows.map((row) => transformRow(row, mapping, IMPORT_SPECS[kind].fields)) };
};

describe("exampleCsv", () => {
  it("заголовки — підписи полів, посилання — назва першого запису кампанії; читається без помилок", async () => {
    const csv = await exampleCsv(actor, "units", { loadNames });

    const { table, mapping, rows } = readBack(csv, "units");

    expect(table.headers).toEqual(IMPORT_SPECS.units.fields.map((f) => f.label));
    expect(Object.values(mapping).every(Boolean)).toBe(true);
    expect(rows.map((r) => r.value.raceId)).toEqual(["Гноми", "Гноми"]);
    expect(rows.map((r) => r.value.name)).toEqual(["Гоблін-лучник", "Вовк"]);
    expect(rows.flatMap((r) => r.issues)).toEqual([]);
  });

  it("гравець — 403", async () => {
    await expect(exampleCsv({ ...actor, isDM: false }, "units", { loadNames })).rejects.toMatchObject({ status: 403 });
  });
});

describe("exportCsv", () => {
  it("експорт → імпорт дає ті самі значення (кома в назві, CR-дріб, здібності, атаки)", async () => {
    const abilities = [{ id: "a1", name: "Лють", trigger: { event: "passive" }, effects: [{ kind: "note", text: "Лють" }] }];

    const attacks = [{ name: "Укус", attackBonus: 4, damageType: "piercing", damageDice: "1d6" }];

    const record = { id: "u1", campaignId: "c1", name: "Вогняний, лютий", level: 3, raceId: "r1", knownSpells: ["s1", "s2"], cr: 0.25, xp: null, avatar: null, abilities, attacks, saveProficiencies: ["dexterity"] };

    const csv = await exportCsv(actor, "units", { loadRecords: async () => [record], loadNames });

    const { mapping, rows } = readBack(csv, "units");

    expect(Object.values(mapping).every(Boolean)).toBe(true);
    expect(rows[0].issues).toEqual([]);
    expect(rows[0].value).toEqual({ name: "Вогняний, лютий", level: 3, raceId: "Гноми", knownSpells: ["Вогонь, сильний", "Лід"], cr: 0.25, abilities, attacks, saveProficiencies: ["dexterity"] });
  });

  it("заклинання: кістки й грань окремими колонками повертаються числами", async () => {
    const csv = await exportCsv(actor, "spells", { loadRecords: async () => [{ name: "Куля", level: 3, dice: 8, dieSides: 6, cost: "action", concentration: false, targeting: { kind: "enemy" } }], loadNames });

    expect(readBack(csv, "spells").rows[0].value).toEqual({ name: "Куля", level: 3, dice: 8, dieSides: 6, cost: "action", concentration: false, targeting: { kind: "enemy" } });
  });

  it("токен без content:read — 403", async () => {
    await expect(exportCsv({ ...actor, via: "token", scopes: ["ai"] }, "units", { loadRecords: async () => [], loadNames })).rejects.toMatchObject({ status: 403 });
  });
});

describe("OpenAPI", () => {
  const doc = buildOpenApi();

  const op = (id: string) => Object.values(doc.paths).flatMap((methods) => Object.values(methods)).find((o) => o.operationId === id);

  it("content.import має тіло; приклад і експорт віддають text/csv з правом content:read", () => {
    expect(op("content.import")?.requestBody).toBeDefined();
    expect(op("content.export")?.responses["200"]).toEqual({ $ref: "#/components/responses/CsvOk" });
    expect(op("content.import-example")?.["x-scopes"]).toEqual(["content:read"]);
    expect(doc.components.responses.CsvOk).toEqual({ description: "Успіх", content: { "text/csv": { schema: { type: "string" } } } });
  });
});
```

```ts
// app/api/__tests__/content-export-routes.test.ts
import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ actor: null as unknown }));

const exampleCsv = vi.hoisted(() => vi.fn(async () => "﻿Назва\r\nА\r\n"));

const exportCsv = vi.hoisted(() => vi.fn(async () => "﻿Назва\r\nБ\r\n"));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/utils/api/actor", () => ({ resolveActor: vi.fn(async () => state.actor) }));
vi.mock("@/lib/server/content/import/example", () => ({ exampleCsv }));
vi.mock("@/lib/server/content/import/export", () => ({ exportCsv }));

import { GET as getExport } from "@/app/api/campaigns/[id]/content-export/[kind]/route";
import { GET as getExample } from "@/app/api/campaigns/[id]/content-import/[kind]/example.csv/route";
import { resolveActor } from "@/lib/utils/api/actor";

const actor = { campaignId: "c1", userId: "u", isDM: true, via: "session", scopes: null };

const call = (handler: typeof getExport, kind: string) => handler(new Request("http://x"), { params: Promise.resolve({ id: "c1", kind }) }) as Promise<NextResponse>;

describe("CSV-роути", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.actor = actor;
  });

  it.each([
    ["example", getExample, "units-example.csv", "﻿Назва\r\nА\r\n"],
    ["export", getExport, "units.csv", "﻿Назва\r\nБ\r\n"],
  ] as const)("%s: text/csv, attachment, право content:read ДМ", async (_name, handler, fileName, body) => {
    const res = await call(handler, "units");

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/csv; charset=utf-8");
    expect(res.headers.get("content-disposition")).toBe(`attachment; filename="${fileName}"`);
    expect(await res.text()).toBe(body);
    expect(resolveActor).toHaveBeenCalledWith(expect.any(Request), "c1", { access: "dm", scope: "content:read" });
  });

  it("невідомий вид — 404", async () => {
    expect((await call(getExport, "tracks")).status).toBe(404);
    expect(exportCsv).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2:** `pnpm test:run lib/server/content/__tests__/import-export.test.ts app/api/__tests__/content-export-routes.test.ts` — FAIL.

- [ ] **Step 3: Implement**

```ts
// lib/server/content/import/csv-response.ts
import { NextResponse } from "next/server";

import "server-only";
import { PRIVATE_NO_STORE_HEADERS } from "@/lib/utils/api/cache-headers";

export const csvResponse = (fileName: string, csv: string) =>
  new NextResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${fileName}"`, ...PRIVATE_NO_STORE_HEADERS } });
```

```ts
// lib/server/content/import/example.ts
import "server-only";
import { assertCan } from "@/lib/server/content/access";
import { loadNames } from "@/lib/server/content/import/names";
import type { Actor } from "@/lib/utils/api/actor";
import { NEED } from "@/lib/utils/api/need";
import { IMPORT_SPECS } from "@/lib/utils/content/import/fields";
import { toCsv } from "@/lib/utils/content/import/table";
import type { IdName } from "@/types/common";
import type { ImportKind } from "@/types/content-import";

type ExampleDeps = { loadNames(campaignId: string, kind: ImportKind): Promise<IdName[]> };

export async function exampleCsv(actor: Actor, kind: ImportKind, deps: ExampleDeps = { loadNames }): Promise<string> {
  assertCan(actor, NEED.read("dm"));

  const spec = IMPORT_SPECS[kind];

  const refKinds = [...new Set(spec.fields.flatMap((f) => (f.type === "ref" && f.ref ? [f.ref] : [])))];

  const firstName = new Map(await Promise.all(refKinds.map(async (k) => [k, (await deps.loadNames(actor.campaignId, k))[0]?.name ?? ""] as const)));

  const rows = ([0, 1] as const).map((i) => spec.fields.map((f) => (f.type === "ref" && f.ref ? (firstName.get(f.ref) ?? "") : f.examples[i])));

  return toCsv(spec.fields.map((f) => f.label), rows);
}
```

```ts
// lib/server/content/import/export.ts
import "server-only";
import { prisma } from "@/lib/db";
import { assertCan } from "@/lib/server/content/access";
import { loadNames } from "@/lib/server/content/import/names";
import { artifactAbilities, artifactSetAbilities, raceAbilities, skillAbilities, unitAbilities } from "@/lib/utils/abilities/read";
import type { Actor } from "@/lib/utils/api/actor";
import { NEED } from "@/lib/utils/api/need";
import { isWeaponSlot, weaponStatsFromRow } from "@/lib/utils/artifacts/weapon-stats";
import { IMPORT_SPECS } from "@/lib/utils/content/import/fields";
import { recordToCells } from "@/lib/utils/content/import/mapping";
import { toCsv } from "@/lib/utils/content/import/table";
import type { IdName } from "@/types/common";
import type { ImportKind, ImportRecord } from "@/types/content-import";

export type ExportDeps = {
  loadRecords(campaignId: string, kind: ImportKind): Promise<ImportRecord[]>;
  loadNames(campaignId: string, kind: ImportKind): Promise<IdName[]>;
};

const query = (campaignId: string) => ({ where: { campaignId }, orderBy: [{ createdAt: "asc" as const }, { id: "asc" as const }] });

const asRecords = (rows: object[]) => rows as ImportRecord[];

export const EXPORT_LOADERS: Record<ImportKind, (campaignId: string) => Promise<ImportRecord[]>> = {
  units: async (c) => asRecords((await prisma.unit.findMany(query(c))).map((r) => ({ ...r, abilities: unitAbilities(r) }))),
  spells: async (c) => asRecords(await prisma.spell.findMany(query(c))),
  skills: async (c) => asRecords((await prisma.skill.findMany(query(c))).map((r) => ({ ...r, abilities: skillAbilities(r) }))),
  "main-skills": async (c) => asRecords(await prisma.mainSkill.findMany(query(c))),
  "spell-groups": async (c) => asRecords(await prisma.spellGroup.findMany(query(c))),
  races: async (c) => asRecords((await prisma.race.findMany(query(c))).map((r) => ({ ...r, abilities: raceAbilities(r) }))),
  classes: async (c) => asRecords(await prisma.gameClass.findMany(query(c))),
  artifacts: async (c) =>
    asRecords((await prisma.artifact.findMany(query(c))).map((r) => ({ ...r, abilities: artifactAbilities(r), weapon: isWeaponSlot(r.slot) ? weaponStatsFromRow(r) : undefined }))),
  "artifact-sets": async (c) =>
    asRecords(
      (await prisma.artifactSet.findMany({ ...query(c), include: { artifacts: { select: { id: true }, orderBy: { createdAt: "asc" } } } })).map(({ artifacts, ...r }) => ({
        ...r,
        abilities: artifactSetAbilities(r),
        artifactIds: artifacts.map((a) => a.id),
      })),
    ),
};

const DEFAULT_DEPS: ExportDeps = { loadRecords: (c, k) => EXPORT_LOADERS[k](c), loadNames };

export async function exportCsv(actor: Actor, kind: ImportKind, deps: ExportDeps = DEFAULT_DEPS): Promise<string> {
  assertCan(actor, NEED.read("dm"));

  const spec = IMPORT_SPECS[kind];

  const refKinds = [...new Set(spec.fields.flatMap((f) => (f.ref ? [f.ref] : [])))];

  const [records, ...refLists] = await Promise.all([deps.loadRecords(actor.campaignId, kind), ...refKinds.map((k) => deps.loadNames(actor.campaignId, k))]);

  const names = new Map(refKinds.map((k, i) => [k, new Map((refLists[i] as IdName[]).map((r) => [r.id, r.name]))]));

  const nameOf = (k: ImportKind, id: string) => names.get(k)?.get(id);

  return toCsv(spec.fields.map((f) => f.label), records.map((r) => recordToCells(spec, r, nameOf)));
}
```

`lib/server/content/operations.ts`: `export type OperationResponse = "item" | "list" | "ok" | "object" | "csv";` і два рядки після `"content.import"`:

```ts
  "content.import-example": { method: "GET", path: "/content-import/{kind}/example.csv", summary: "Приклад CSV для імпорту", description: "CSV із заголовками полів виду kind і двома рядками прикладу; посилання заповнені назвою першого наявного запису кампанії.", need: NEED.read("dm"), response: "csv", pathEnums: { kind: IMPORT_KINDS }, tag: "Імпорт і експорт" },
  "content.export": { method: "GET", path: "/content-export/{kind}", summary: "Експорт CSV", description: "Усі записи виду kind у форматі імпорту: заголовки — підписи полів, посилання — назвами, вкладене — JSON у клітинці. Змінений файл імпортується назад (mode update).", need: NEED.read("dm"), response: "csv", pathEnums: { kind: IMPORT_KINDS }, tag: "Імпорт і експорт" },
```

`lib/server/content/openapi.ts`: тип і рядок `SUCCESS_RESPONSES` та формування `components.responses`:

```ts
const SUCCESS_RESPONSES: Record<OperationResponse, { id: string; schema: object; contentType?: string }> = {
  item: { id: "ItemOk", schema: ref("ContentItem") },
  list: { id: "ListOk", schema: { type: "array", items: { type: "object", additionalProperties: true } } },
  ok: { id: "OkOk", schema: ref("Ok") },
  object: { id: "ObjectOk", schema: { type: "object", additionalProperties: true } },
  csv: { id: "CsvOk", schema: { type: "string" }, contentType: "text/csv" },
};
```

```ts
        ...Object.fromEntries(Object.values(SUCCESS_RESPONSES).map(({ id, schema, contentType = "application/json" }) => [id, { description: "Успіх", content: { [contentType]: { schema } } }])),
```

```ts
// app/api/campaigns/[id]/content-import/[kind]/example.csv/route.ts
import { csvResponse } from "@/lib/server/content/import/csv-response";
import { exampleCsv } from "@/lib/server/content/import/example";
import { importKindOf } from "@/lib/server/content/import/kind";
import { CONTENT_OPERATIONS } from "@/lib/server/content/operations";
import { operationRoute } from "@/lib/utils/api/content-routes";

export const GET = operationRoute(CONTENT_OPERATIONS["content.import-example"], async ({ actor, params }) => {
  const kind = importKindOf(params.kind);

  return csvResponse(`${kind}-example.csv`, await exampleCsv(actor, kind));
});
```

```ts
// app/api/campaigns/[id]/content-export/[kind]/route.ts
import { csvResponse } from "@/lib/server/content/import/csv-response";
import { exportCsv } from "@/lib/server/content/import/export";
import { importKindOf } from "@/lib/server/content/import/kind";
import { CONTENT_OPERATIONS } from "@/lib/server/content/operations";
import { operationRoute } from "@/lib/utils/api/content-routes";

export const GET = operationRoute(CONTENT_OPERATIONS["content.export"], async ({ actor, params }) => {
  const kind = importKindOf(params.kind);

  return csvResponse(`${kind}.csv`, await exportCsv(actor, kind));
});
```

- [ ] **Step 4:** `pnpm test:run lib/server/content/__tests__/import-export.test.ts app/api/__tests__/content-export-routes.test.ts lib/server/content/__tests__/openapi.test.ts lib/server/content/__tests__/operations.test.ts` — PASS (межа OpenAPI — див. Global Constraints). Якщо тип `prisma.artifactSet.findMany({...query(c), include })` не виводиться — винести `orderBy` у змінну з тим самим значенням; поведінку не змінювати.

- [ ] **Step 5: Commit**

```bash
git add lib/server/content "app/api/campaigns/[id]/content-import" "app/api/campaigns/[id]/content-export" app/api/__tests__/content-export-routes.test.ts
git commit -m "feat(constructor): 4f-0 example and export csv for every content kind

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: MCP-інструмент `content_import`

**Files:**
- Modify: `lib/ai/tools/content.ts` (новий `contentImportTool`, рядок у `CONTENT_TOOLS` після `contentDeleteTool`)
- Test: `lib/ai/tools/__tests__/content-import-tool.test.ts`

**Interfaces:**
- Consumes: `importContent`, `compactImportReport` (задача 5), `contentImportSchema`, `IMPORT_KINDS`, `IMPORT_MODES`.
- Produces: інструмент `content_import` (scope `content:write`), вхід `{ kind: ImportKind; rows: Record<string, unknown>[] (1–500); mode?: ImportMode = "create"; dryRun?: boolean = false }`, результат — `compactImportReport(report)` як JSON. Потрапляє в `AI_TOOLS` через `CONTENT_TOOLS` (і `/api/mcp`, і `toolsFor`).

- [ ] **Step 1: Failing test**

```ts
// lib/ai/tools/__tests__/content-import-tool.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const importContent = vi.hoisted(() => vi.fn());

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ prisma: {} }));
vi.mock("@/lib/server/content/import/import-content", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/server/content/import/import-content")>()),
  importContent,
}));

import { toolsFor } from "@/lib/ai/tools";
import { contentImportTool } from "@/lib/ai/tools/content";
import { runTool } from "@/lib/ai/tools/define";

const ctx = { campaignId: "c1", userId: "u1", scopes: ["content:write"] as const, threadId: null };

describe("content_import", () => {
  beforeEach(() => vi.clearAllMocks());

  it("кличе importContent від імені токена з defaults і повертає стислий звіт", async () => {
    importContent.mockResolvedValue({
      dryRun: true,
      counts: { created: 1, updated: 0, skipped: 0, error: 60 },
      results: [{ row: 1, status: "created", issues: [] }, ...Array.from({ length: 60 }, (_, i) => ({ row: i + 2, status: "error", issues: [{ level: "error", message: "x" }] }))],
    });

    const text = await runTool(contentImportTool, ctx, { kind: "units", rows: [{ name: "А" }], dryRun: true });

    expect(importContent).toHaveBeenCalledWith(expect.objectContaining({ campaignId: "c1", userId: "u1", isDM: true, via: "token" }), "units", { rows: [{ name: "А" }], mode: "create", dryRun: true });

    const out = JSON.parse(text);

    expect(out.rows).toHaveLength(50);
    expect(out.rows[0].row).toBe(2);
    expect(out.omitted).toBe(10);
    expect(out.counts.error).toBe(60);
  });

  it("вид поза імпортом і 501 рядок — помилка параметрів без виклику", async () => {
    expect(await runTool(contentImportTool, ctx, { kind: "tracks", rows: [{ name: "А" }] })).toContain("некоректні параметри");
    expect(await runTool(contentImportTool, ctx, { kind: "units", rows: Array.from({ length: 501 }, () => ({})) })).toContain("некоректні параметри");
    expect(importContent).not.toHaveBeenCalled();
  });

  it("доступний лише з content:write", () => {
    expect(toolsFor(["content:read"]).map((t) => t.name)).not.toContain("content_import");
    expect(toolsFor(["content:write"]).map((t) => t.name)).toContain("content_import");
  });
});
```

- [ ] **Step 2:** `pnpm test:run lib/ai/tools/__tests__/content-import-tool.test.ts` — FAIL (`contentImportTool` немає).

- [ ] **Step 3: Implement** — у `lib/ai/tools/content.ts` додати імпорти й інструмент:

```ts
import { contentImportSchema } from "@/lib/schemas/content-import";
import { compactImportReport, importContent } from "@/lib/server/content/import/import-content";
import { IMPORT_KINDS, IMPORT_MODES } from "@/lib/utils/content/import/kinds";
```

```ts
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
```

і `contentImportTool,` у `CONTENT_TOOLS` одразу після `contentDeleteTool,`.

- [ ] **Step 4:** `pnpm test:run lib/ai/tools/__tests__` — PASS (наявні `registry.test.ts`, `content.test.ts` без змін).

- [ ] **Step 5: Commit**

```bash
git add lib/ai/tools/content.ts lib/ai/tools/__tests__/content-import-tool.test.ts
git commit -m "feat(constructor): 4f-0 mcp content_import tool

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: AI-мапінг колонок

**Files:**
- Create: `lib/server/content/import/ai-map.ts`, `app/api/campaigns/[id]/content-import/[kind]/ai-map/route.ts`
- Test: `app/api/__tests__/content-import-ai-map.test.ts`

**Interfaces:**
- Consumes: `aiMapRequestSchema`, `AiMapRequest`, `importKindOf`, `IMPORT_SPECS`, `IMPORT_LIMITS`; `pickDmTextModel`, `readDmAiAvailability` (`lib/ai/dm-model.ts`), `aiErrorMessage` (`lib/ai/errors.ts`), `checkRateLimit`, `rateLimitResponse`, `AI_PLAYER_RATE_LIMIT`, `runContent`, `NEED.writeAll`.
- Produces:

```ts
export const aiMapResultSchema: z.ZodObject<{ mapping: z.ZodArray<z.ZodObject<{ header: z.ZodString; field: z.ZodNullable<z.ZodString> }>>; notes: z.ZodArray<z.ZodString> }>;
export function sanitizeAiMapping(raw: z.infer<typeof aiMapResultSchema>, headers: readonly string[], fields: readonly ImportField[]): AiMapResult;
export function aiMapPrompt(spec: ImportSpec, headers: readonly string[], sample: ReadonlyArray<Record<string, string>>): string;
export async function aiMapAvailability(actor: Actor): Promise<NextResponse>;            // { available: boolean }
export async function aiMapResponse(actor: Actor, kind: ImportKind, body: AiMapRequest): Promise<NextResponse>; // AiMapResult | 409 | 429 | 502
// роут: GET/POST /api/campaigns/[id]/content-import/[kind]/ai-map — лише ДМ із сесії (NEED.writeAll), не в OpenAPI
```

- [ ] **Step 1: Failing test**

```ts
// app/api/__tests__/content-import-ai-map.test.ts
import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getResponseJson } from "./helpers";

const state = vi.hoisted(() => ({ actor: null as unknown }));

const generateObject = vi.hoisted(() => vi.fn());

const pickDmTextModel = vi.hoisted(() => vi.fn());

const readDmAiAvailability = vi.hoisted(() => vi.fn());

const checkRateLimit = vi.hoisted(() => vi.fn());

vi.mock("server-only", () => ({}));
vi.mock("ai", () => ({ generateObject, APICallError: { isInstance: () => false }, RetryError: { isInstance: () => false } }));
vi.mock("@/lib/ai/dm-model", () => ({ pickDmTextModel, readDmAiAvailability }));
vi.mock("@/lib/utils/api/rate-limit", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/lib/utils/api/rate-limit")>()), checkRateLimit }));
vi.mock("@/lib/utils/api/actor", () => ({ resolveActor: vi.fn(async () => state.actor) }));

import { GET, POST } from "@/app/api/campaigns/[id]/content-import/[kind]/ai-map/route";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { resolveActor } from "@/lib/utils/api/actor";

const actor = { campaignId: "c1", userId: "u", isDM: true, via: "session", scopes: null };

const ctx = (kind = "units") => ({ params: Promise.resolve({ id: "c1", kind }) });

const post = (body: unknown, kind = "units") => POST(new Request("http://x", { method: "POST", body: JSON.stringify(body) }), ctx(kind)) as Promise<NextResponse>;

const BODY = { headers: ["Ім'я", "HP", "AC"], sample: [{ "Ім'я": "Вовк", HP: "11", AC: "13" }] };

describe("AI-мапінг імпорту", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.actor = actor;
    checkRateLimit.mockResolvedValue({ allowed: true, count: 1, limit: 10, retryAfterSeconds: 0 });
    pickDmTextModel.mockResolvedValue({ id: "model" });
    readDmAiAvailability.mockResolvedValue({ text: true, image: false });
  });

  it("GET: доступність за ключем ДМ; лише ДМ із сесії", async () => {
    const res = (await GET(new Request("http://x"), ctx())) as NextResponse;

    expect(await getResponseJson(res)).toEqual({ available: true });
    expect(resolveActor).toHaveBeenCalledWith(expect.any(Request), "c1", { access: "dm", scope: "content:write", sessionOnly: true });
  });

  it("POST без ключа — 409, модель не кличеться", async () => {
    pickDmTextModel.mockResolvedValue(null);

    const res = await post(BODY);

    expect(res.status).toBe(409);
    expect(await getResponseJson(res)).toEqual({ error: API_ERRORS.IMPORT_AI_NO_KEY });
    expect(generateObject).not.toHaveBeenCalled();
  });

  it("POST: лише відомі колонки й поля; решта — null", async () => {
    generateObject.mockResolvedValue({
      object: { mapping: [{ header: "Ім'я", field: "name" }, { header: "HP", field: "hitPoints" }, { header: "Чуже", field: "name" }], notes: ["Перевірте ХП"] },
    });

    const res = await post(BODY);

    expect(await getResponseJson(res)).toEqual({ mapping: { "Ім'я": "name", HP: null, AC: null }, notes: ["Перевірте ХП"] });

    const call = generateObject.mock.calls[0][0] as { model: unknown; prompt: string };

    expect(call.model).toEqual({ id: "model" });
    expect(call.prompt).toContain("- maxHp — ХП");
    expect(call.prompt).toContain('"Ім\'я"');
  });

  it("помилка провайдера — 502 без тексту помилки (ключ не виходить назовні)", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    generateObject.mockRejectedValue(new Error("invalid key sk-secret-123"));

    const res = await post(BODY);

    expect(res.status).toBe(502);
    expect(JSON.stringify(await getResponseJson(res))).not.toContain("sk-secret");
    expect(JSON.stringify(error.mock.calls)).not.toContain("sk-secret");
    error.mockRestore();
  });

  it("ліміт запитів — 429", async () => {
    checkRateLimit.mockResolvedValue({ allowed: false, count: 11, limit: 10, retryAfterSeconds: 60 });

    expect((await post(BODY)).status).toBe(429);
    expect(pickDmTextModel).not.toHaveBeenCalled();
  });

  it("невідомий вид — 404; погане тіло — 400", async () => {
    expect((await post(BODY, "tracks")).status).toBe(404);
    expect((await post({ headers: [] })).status).toBe(400);
  });
});
```

- [ ] **Step 2:** `pnpm test:run app/api/__tests__/content-import-ai-map.test.ts` — FAIL.

- [ ] **Step 3: Implement**

```ts
// lib/server/content/import/ai-map.ts
import { NextResponse } from "next/server";
import { APICallError, generateObject } from "ai";
import { z } from "zod";

import "server-only";
import { pickDmTextModel, readDmAiAvailability } from "@/lib/ai/dm-model";
import { aiErrorMessage } from "@/lib/ai/errors";
import { API_ERRORS } from "@/lib/constants/api-errors";
import type { AiMapRequest } from "@/lib/schemas/content-import";
import type { Actor } from "@/lib/utils/api/actor";
import { errorResponse } from "@/lib/utils/api/api-response";
import { AI_PLAYER_RATE_LIMIT, checkRateLimit, rateLimitResponse } from "@/lib/utils/api/rate-limit";
import { IMPORT_SPECS } from "@/lib/utils/content/import/fields";
import { IMPORT_LIMITS } from "@/lib/utils/content/import/kinds";
import type { AiMapResult, ImportField, ImportKind, ImportMapping, ImportSpec } from "@/types/content-import";

// an array of pairs: providers' structured output handles arbitrary object keys poorly
export const aiMapResultSchema = z.object({
  mapping: z.array(z.object({ header: z.string(), field: z.string().nullable() })).max(IMPORT_LIMITS.aiHeaders),
  notes: z.array(z.string().max(300)).max(5),
});

export function sanitizeAiMapping(raw: z.infer<typeof aiMapResultSchema>, headers: readonly string[], fields: readonly ImportField[]): AiMapResult {
  const keys = new Set(fields.map((f) => f.key));

  const known = new Set(headers);

  const mapping: ImportMapping = Object.fromEntries(headers.map((h) => [h, null]));

  for (const { header, field } of raw.mapping) {
    if (known.has(header)) mapping[header] = field && keys.has(field) ? field : null;
  }

  return { mapping, notes: raw.notes };
}

const fieldLine = (f: ImportField) =>
  `- ${f.key} — ${f.label}; тип ${f.type}${f.enumValues ? ` (значення: ${f.enumValues.join(" | ")})` : ""}${f.ref ? ` (назва запису: ${IMPORT_SPECS[f.ref].label})` : ""}${f.required ? "; обов'язкове" : ""}`;

export function aiMapPrompt(spec: ImportSpec, headers: readonly string[], sample: ReadonlyArray<Record<string, string>>): string {
  return [
    `Ти зіставляєш колонки таблиці користувача з полями імпорту «${spec.label}» трекера D&D-кампанії.`,
    "Поля (key — назва; тип):",
    ...spec.fields.map(fieldLine),
    `Колонки файлу: ${JSON.stringify(headers)}`,
    `Перші рядки (клітинки обрізано): ${JSON.stringify(sample)}`,
    "Для кожної колонки поверни { header, field }: field — key поля або null, якщо колонка не підходить жодному полю. Одне поле — не більше однієї колонки, крім abilities (кілька текстових колонок здібностей).",
    "notes — до 5 коротких порад українською: що доведеться перетворити вручну (формати, одиниці, значення поза списком).",
  ].join("\n");
}

export async function aiMapAvailability(actor: Actor): Promise<NextResponse> {
  const { text } = await readDmAiAvailability(actor.campaignId);

  return NextResponse.json({ available: text });
}

export async function aiMapResponse(actor: Actor, kind: ImportKind, body: AiMapRequest): Promise<NextResponse> {
  const limit = await checkRateLimit({ userId: actor.userId, scope: "content-import-ai-map", battleId: actor.campaignId, ...AI_PLAYER_RATE_LIMIT, memoryFallback: true });

  if (!limit.allowed) return rateLimitResponse(limit);

  const model = await pickDmTextModel(actor.campaignId);

  if (!model) return errorResponse(API_ERRORS.IMPORT_AI_NO_KEY, 409);

  const spec = IMPORT_SPECS[kind];

  try {
    const { object } = await generateObject({ model, schema: aiMapResultSchema, prompt: aiMapPrompt(spec, body.headers, body.sample) });

    return NextResponse.json(sanitizeAiMapping(object, body.headers, spec.fields));
  } catch (error) {
    console.error("[ai import map]", APICallError.isInstance(error) ? error.statusCode : error instanceof Error ? error.name : "unknown");

    return errorResponse(aiErrorMessage(error), 502);
  }
}
```

```ts
// app/api/campaigns/[id]/content-import/[kind]/ai-map/route.ts
import { NextResponse } from "next/server";

import { aiMapRequestSchema } from "@/lib/schemas/content-import";
import { aiMapAvailability, aiMapResponse } from "@/lib/server/content/import/ai-map";
import { importKindOf } from "@/lib/server/content/import/kind";
import { type RouteCtx, runContent } from "@/lib/utils/api/content-routes";
import { NEED } from "@/lib/utils/api/need";
import { parseBody } from "@/lib/utils/api/parse-body";

export const maxDuration = 60;

export const GET = (req: Request, ctx: RouteCtx) =>
  runContent({ req, ctx, need: NEED.writeAll, action: "import ai availability" }, async (actor, params) => {
    importKindOf(params.kind);

    return aiMapAvailability(actor);
  });

export const POST = (req: Request, ctx: RouteCtx) =>
  runContent({ req, ctx, need: NEED.writeAll, action: "import ai map" }, async (actor, params) => {
    const kind = importKindOf(params.kind);

    const body = await parseBody(aiMapRequestSchema, req);

    if (body instanceof NextResponse) return body;

    return aiMapResponse(actor, kind, body);
  });
```

- [ ] **Step 4:** `pnpm test:run app/api/__tests__/content-import-ai-map.test.ts lib/server/content/__tests__/openapi.test.ts` — PASS (OpenAPI не змінюється: роут не в `CONTENT_OPERATIONS`).

- [ ] **Step 5: Commit**

```bash
git add lib/server/content/import/ai-map.ts "app/api/campaigns/[id]/content-import/[kind]/ai-map" app/api/__tests__/content-import-ai-map.test.ts
git commit -m "feat(constructor): 4f-0 ai column mapping with the dm key

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 10: Клієнт, хук майстра й чиста логіка майстра

**Files:**
- Create: `lib/api/content-import.ts`, `lib/utils/content/import/wizard.ts`, `lib/utils/common/download-text.ts`, `lib/hooks/content-import/{keys,useContentImport,useContentTransferUrls,index}.ts`
- Test: `lib/utils/content/import/__tests__/wizard.test.ts` (`// @vitest-environment happy-dom`), `lib/hooks/content-import/__tests__/useContentImport.test.tsx`

**Interfaces:**
- Consumes: задачі 1–5 (`parseTable`, `autoMap`, `applyMapping`, `missingRequired`, `chunkRows`, `IMPORT_SPECS`, `IMPORT_LIMITS`, типи); роути задач 6, 7, 9.
- Produces:

```ts
// lib/api/content-import.ts
export const importContentRows: (campaignId: string, kind: ImportKind, body: { rows: ImportRecord[]; mode: ImportMode; dryRun: boolean }) => Promise<ImportReport>;
export const getImportAiAvailability: (campaignId: string, kind: ImportKind) => Promise<{ available: boolean }>;
export const suggestImportMapping: (campaignId: string, kind: ImportKind, body: { headers: string[]; sample: Array<Record<string, string>> }) => Promise<AiMapResult>;
export const contentExampleUrl: (campaignId: string, kind: ImportKind) => string; // /api/campaigns/{id}/content-import/{kind}/example.csv
export const contentExportUrl: (campaignId: string, kind: ImportKind) => string;  // /api/campaigns/{id}/content-export/{kind}

// lib/utils/content/import/wizard.ts
export function readImportFile(file: File): Promise<string>; // XLSX/XLS/ODS → ImportFileError з підказкою «CSV (UTF-8)»; не csv/tsv/txt/json → ImportFileError
export const statusLabel: (status: ImportRowStatus, dryRun: boolean) => string;
export function mergeReports(parts: ReadonlyArray<{ offset: number; report: ImportReport }>, dryRun: boolean): ImportReport;
export function reportToCsv(table: ParsedTable, report: ImportReport): string; // рядки з помилками: вихідні клітинки + «Статус» + «Помилки»
export function aiSample(table: ParsedTable): Array<Record<string, string>>;
export const mappingStorageKey: (kind: ImportKind, headers: readonly string[]) => string;
export function loadStoredMapping(kind: ImportKind, headers: readonly string[], fields: readonly ImportField[]): ImportMapping;
export function saveStoredMapping(kind: ImportKind, headers: readonly string[], mapping: ImportMapping): void;

// lib/utils/common/download-text.ts
export function downloadText(fileName: string, text: string, type?: string): void;

// lib/hooks/content-import
export const contentImportKeys: { aiAvailability: (campaignId: string, kind: ImportKind) => readonly ["content-import-ai", string, ImportKind] };
export function importInvalidateKeys(campaignId: string, kind: ImportKind): QueryKey[];
export type ImportStep = "file" | "columns" | "preview" | "result";
export function useContentImport(campaignId: string, kind: ImportKind): {
  spec: ImportSpec;
  step: ImportStep;
  file: { name: string | null; table: ParsedTable | null };
  mapping: { value: ImportMapping; set: (header: string, key: string | null) => void; missing: ImportField[] };
  ai: { available: boolean; busy: boolean; notes: string[]; suggest: () => Promise<void> };
  mode: { value: ImportMode; set: (mode: ImportMode) => void };
  preview: ImportReport | null;
  result: ImportReport | null;
  status: { busy: boolean; progress: { done: number; total: number } | null; error: string | null };
  actions: { selectFile: (file: File) => Promise<void>; runPreview: () => Promise<void>; runImport: () => Promise<void>; back: () => void; reset: () => void; downloadErrors: () => void };
  urls: { example: string };
};
export type ContentImportState = ReturnType<typeof useContentImport>;
export const useContentTransferUrls: (campaignId: string, kind: ImportKind) => { example: string; export: string };
```

- [ ] **Step 1: Failing tests**

```ts
// lib/utils/content/import/__tests__/wizard.test.ts
// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from "vitest";

import { aiSample, loadStoredMapping, mergeReports, readImportFile, reportToCsv, saveStoredMapping, statusLabel } from "../wizard";

import { IMPORT_SPECS, parseTable } from "@/lib/utils/content/import";
import type { ImportReport, ParsedTable } from "@/types/content-import";

const report = (results: ImportReport["results"], dryRun = false): ImportReport => ({
  dryRun,
  results,
  counts: { created: results.filter((r) => r.status === "created").length, updated: 0, skipped: 0, error: results.filter((r) => r.status === "error").length },
});

const TABLE: ParsedTable = { format: "csv", headers: ["Назва", "ХП"], rows: [{ Назва: "Біс", ХП: "18" }, { Назва: "Вовк", ХП: "багато" }] };

describe("wizard utils", () => {
  beforeEach(() => window.localStorage.clear());

  it("readImportFile: XLSX — підказка зберегти як CSV; інші розширення — відмова; CSV читається", async () => {
    await expect(readImportFile(new File(["x"], "a.xlsx"))).rejects.toThrow("CSV (UTF-8)");
    await expect(readImportFile(new File(["x"], "a.pdf"))).rejects.toThrow("CSV, TSV і JSON");
    expect(await readImportFile(new File(["Назва\nА"], "a.CSV"))).toBe("Назва\nА");
  });

  it("mergeReports зсуває номери рядків частин і сумує лічильники", () => {
    const merged = mergeReports([
      { offset: 0, report: report([{ row: 1, status: "created", issues: [] }]) },
      { offset: 100, report: report([{ row: 1, status: "error", issues: [{ level: "error", message: "x" }] }]) },
    ], false);

    expect(merged.results.map((r) => r.row)).toEqual([1, 101]);
    expect(merged.counts).toEqual({ created: 1, updated: 0, skipped: 0, error: 1 });
  });

  it("reportToCsv: лише рядки з помилками з вихідними клітинками", () => {
    const csv = reportToCsv(TABLE, report([{ row: 1, status: "created", issues: [] }, { row: 2, status: "error", issues: [{ field: "maxHp", level: "error", message: "ХП: Очікується ціле число" }] }]));

    expect(parseTable(csv).rows).toEqual([{ Назва: "Вовк", ХП: "багато", Статус: "Помилка", Помилки: "ХП: Очікується ціле число" }]);
  });

  it("aiSample: до 5 рядків, клітинки до 200 символів, не-рядки — JSON", () => {
    const table: ParsedTable = { format: "json", headers: ["a", "b"], rows: Array.from({ length: 7 }, () => ({ a: "x".repeat(300), b: { k: 1 } })) };

    const sample = aiSample(table);

    expect(sample).toHaveLength(5);
    expect(sample[0].a).toHaveLength(200);
    expect(sample[0].b).toBe('{"k":1}');
  });

  it("мапінг зберігається за набором заголовків; невідомі ключі полів відкидаються", () => {
    saveStoredMapping("units", ["Назва", "Хто"], { Назва: "name", Хто: "raceId" });
    window.localStorage.setItem("junk", "1");

    expect(loadStoredMapping("units", ["Назва", "Хто"], IMPORT_SPECS.units.fields)).toEqual({ Назва: "name", Хто: "raceId" });
    expect(loadStoredMapping("units", ["Назва"], IMPORT_SPECS.units.fields)).toEqual({});
    expect(loadStoredMapping("spells", ["Назва", "Хто"], IMPORT_SPECS.spells.fields)).toEqual({});

    saveStoredMapping("units", ["A"], { A: "nope" });

    expect(loadStoredMapping("units", ["A"], IMPORT_SPECS.units.fields)).toEqual({ A: null });
  });

  it("statusLabel", () => {
    expect(statusLabel("created", true)).toBe("Буде створено");
    expect(statusLabel("updated", false)).toBe("Оновлено");
  });
});
```

```tsx
// lib/hooks/content-import/__tests__/useContentImport.test.tsx
// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import * as api from "@/lib/api/content-import";
import { useContentImport } from "@/lib/hooks/content-import";
import type { ImportReport } from "@/types/content-import";

vi.mock("@/lib/api/content-import", () => ({
  importContentRows: vi.fn(),
  getImportAiAvailability: vi.fn(async () => ({ available: true })),
  suggestImportMapping: vi.fn(),
  contentExampleUrl: (c: string, k: string) => `/api/campaigns/${c}/content-import/${k}/example.csv`,
}));
vi.mock("@/lib/utils/common/download-text", () => ({ downloadText: vi.fn() }));

const rep = (n: number, status: "created" | "error" = "created", dryRun = false): ImportReport => ({
  dryRun,
  results: Array.from({ length: n }, (_, i) => ({ row: i + 1, status, issues: [] })),
  counts: { created: status === "created" ? n : 0, updated: 0, skipped: 0, error: status === "error" ? n : 0 },
});

const csvFile = (rows: number, name = "u.csv") => new File([["Назва;ХП;Зайве", ...Array.from({ length: rows }, (_, i) => `Юніт ${i + 1};${i + 1};x`)].join("\n")], name);

function setup() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  const invalidate = vi.spyOn(qc, "invalidateQueries");

  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;

  return { invalidate, ...renderHook(() => useContentImport("c1", "units"), { wrapper }) };
}

describe("useContentImport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  afterEach(cleanup);

  it("CSV → автомапінг і крок колонок", async () => {
    const { result } = setup();

    await act(() => result.current.actions.selectFile(csvFile(1)));

    expect(result.current.step).toBe("columns");
    expect(result.current.mapping.value).toEqual({ Назва: "name", ХП: "maxHp", Зайве: null });
    expect(result.current.mapping.missing).toEqual([]);
  });

  it("XLSX — помилка з підказкою, крок не змінюється", async () => {
    const { result } = setup();

    await act(() => result.current.actions.selectFile(new File(["x"], "u.xlsx")));

    expect(result.current.step).toBe("file");
    expect(result.current.status.error).toContain("CSV (UTF-8)");
  });

  it("перевірка шле сирі клітинки з dryRun і відкриває перегляд; зміна режиму перевіряє знову", async () => {
    vi.mocked(api.importContentRows).mockResolvedValue(rep(1, "created", true));

    const { result } = setup();

    await act(() => result.current.actions.selectFile(csvFile(1)));
    await act(() => result.current.actions.runPreview());

    expect(api.importContentRows).toHaveBeenCalledWith("c1", "units", { rows: [{ name: "Юніт 1", maxHp: "1" }], mode: "create", dryRun: true });
    expect(result.current.step).toBe("preview");

    await act(async () => result.current.mode.set("update"));

    expect(vi.mocked(api.importContentRows).mock.calls.at(-1)?.[2]).toMatchObject({ mode: "update", dryRun: true });
    expect(result.current.mode.value).toBe("update");
  });

  it("ручний мапінг запам'ятовується для того самого набору заголовків", async () => {
    vi.mocked(api.importContentRows).mockResolvedValue(rep(1, "created", true));

    const first = setup();

    await act(() => first.result.current.actions.selectFile(csvFile(1)));
    act(() => first.result.current.mapping.set("Зайве", "immunities"));
    await act(() => first.result.current.actions.runPreview());
    first.unmount();

    const second = setup();

    await act(() => second.result.current.actions.selectFile(csvFile(2)));

    expect(second.result.current.mapping.value["Зайве"]).toBe("immunities");
  });

  it("запис частинами по 100; обрив на другій частині — підсумок записаного й помилка", async () => {
    vi.mocked(api.importContentRows).mockResolvedValueOnce(rep(100)).mockRejectedValueOnce(new Error("Мережа недоступна"));

    const { result, invalidate } = setup();

    await act(() => result.current.actions.selectFile(csvFile(150)));
    await act(() => result.current.actions.runImport());

    expect(vi.mocked(api.importContentRows).mock.calls.map((c) => c[2].rows.length)).toEqual([100, 50]);
    expect(result.current.step).toBe("result");
    expect(result.current.result?.counts.created).toBe(100);
    expect(result.current.status.error).toBe("Мережа недоступна. Записано частин: 1 з 2");
    expect(result.current.status.busy).toBe(false);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["units", "c1"] });
  });

  it("номери рядків другої частини зсуваються на розмір першої", async () => {
    vi.mocked(api.importContentRows).mockResolvedValueOnce(rep(100)).mockResolvedValueOnce(rep(1, "error"));

    const { result } = setup();

    await act(() => result.current.actions.selectFile(csvFile(101)));
    await act(() => result.current.actions.runImport());

    expect(result.current.result?.results.at(-1)).toMatchObject({ row: 101, status: "error" });
    expect(result.current.status.error).toBeNull();
  });

  it("AI: заповнює лише відомі колонки з ненульовим полем, ручний вибір не затирає null", async () => {
    vi.mocked(api.suggestImportMapping).mockResolvedValue({ mapping: { Назва: "name", Зайве: "morale", ХП: null, Інше: "level" }, notes: ["Порада"] });

    const { result } = setup();

    await act(() => result.current.actions.selectFile(csvFile(1)));
    await act(() => result.current.ai.suggest());

    expect(result.current.mapping.value).toEqual({ Назва: "name", ХП: "maxHp", Зайве: "morale" });
    expect(result.current.ai.notes).toEqual(["Порада"]);
    expect(vi.mocked(api.suggestImportMapping).mock.calls[0][2]).toEqual({ headers: ["Назва", "ХП", "Зайве"], sample: [{ Назва: "Юніт 1", ХП: "1", Зайве: "x" }] });
  });
});
```

- [ ] **Step 2:** `pnpm test:run lib/utils/content/import/__tests__/wizard.test.ts lib/hooks/content-import/__tests__/useContentImport.test.tsx` — FAIL.

- [ ] **Step 3: Implement**

```ts
// lib/api/content-import.ts
import { campaignGet, campaignPost } from "@/lib/api/client";
import type { AiMapResult, ImportKind, ImportMode, ImportRecord, ImportReport } from "@/types/content-import";

export const importContentRows = (campaignId: string, kind: ImportKind, body: { rows: ImportRecord[]; mode: ImportMode; dryRun: boolean }) =>
  campaignPost<ImportReport>(campaignId, `/content-import/${kind}`, body);

export const getImportAiAvailability = (campaignId: string, kind: ImportKind) => campaignGet<{ available: boolean }>(campaignId, `/content-import/${kind}/ai-map`);

export const suggestImportMapping = (campaignId: string, kind: ImportKind, body: { headers: string[]; sample: Array<Record<string, string>> }) =>
  campaignPost<AiMapResult>(campaignId, `/content-import/${kind}/ai-map`, body);

export const contentExampleUrl = (campaignId: string, kind: ImportKind) => `/api/campaigns/${campaignId}/content-import/${kind}/example.csv`;

export const contentExportUrl = (campaignId: string, kind: ImportKind) => `/api/campaigns/${campaignId}/content-export/${kind}`;
```

```ts
// lib/utils/common/download-text.ts
export function downloadText(fileName: string, text: string, type = "text/plain"): void {
  const url = URL.createObjectURL(new Blob([text], { type: `${type};charset=utf-8` }));

  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  link.click();
  // revoking synchronously cancels the download in some browsers
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
```

```ts
// lib/utils/content/import/wizard.ts
import { IMPORT_LIMITS } from "./kinds";
import { ImportFileError, toCsv } from "./table";

import { isRecord } from "@/lib/utils/common/is-record";
import type { ImportField, ImportKind, ImportMapping, ImportReport, ImportRowStatus, ParsedTable } from "@/types/content-import";

const TEXT_EXTENSIONS = new Set(["csv", "tsv", "txt", "json"]);

const SPREADSHEETS = new Set(["xlsx", "xls", "ods", "numbers"]);

export async function readImportFile(file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";

  if (SPREADSHEETS.has(ext)) throw new ImportFileError("XLSX не підтримується — збережіть таблицю як CSV (UTF-8) і завантажте його");

  if (!TEXT_EXTENSIONS.has(ext)) throw new ImportFileError("Підтримуються файли CSV, TSV і JSON");

  return file.text();
}

const STATUS_LABELS: Record<ImportRowStatus, readonly [string, string]> = {
  created: ["Створено", "Буде створено"],
  updated: ["Оновлено", "Буде оновлено"],
  skipped: ["Пропущено", "Буде пропущено"],
  error: ["Помилка", "Помилка"],
};

export const statusLabel = (status: ImportRowStatus, dryRun: boolean) => STATUS_LABELS[status][dryRun ? 1 : 0];

export function mergeReports(parts: ReadonlyArray<{ offset: number; report: ImportReport }>, dryRun: boolean): ImportReport {
  const counts: Record<ImportRowStatus, number> = { created: 0, updated: 0, skipped: 0, error: 0 };

  for (const { report } of parts) {
    for (const status of Object.keys(counts) as ImportRowStatus[]) counts[status] += report.counts[status];
  }

  return { dryRun, counts, results: parts.flatMap(({ offset, report }) => report.results.map((r) => ({ ...r, row: r.row + offset }))) };
}

const cellText = (v: unknown) => (v === undefined || v === null ? "" : typeof v === "string" ? v : JSON.stringify(v));

export function reportToCsv(table: ParsedTable, report: ImportReport): string {
  const rows = report.results
    .filter((r) => r.status === "error")
    .map((r) => [...table.headers.map((h) => cellText(table.rows[r.row - 1]?.[h])), statusLabel(r.status, report.dryRun), r.issues.map((i) => i.message).join("; ")]);

  return toCsv([...table.headers, "Статус", "Помилки"], rows);
}

export function aiSample(table: ParsedTable): Array<Record<string, string>> {
  const headers = table.headers.slice(0, IMPORT_LIMITS.aiHeaders);

  return table.rows.slice(0, IMPORT_LIMITS.aiSampleRows).map((row) => Object.fromEntries(headers.map((h) => [h, cellText(row[h]).slice(0, IMPORT_LIMITS.aiCellChars)])));
}

function hash(s: string): string {
  let h = 5381;

  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;

  return (h >>> 0).toString(36);
}

export const mappingStorageKey = (kind: ImportKind, headers: readonly string[]) => `content-import-mapping:${kind}:${hash(headers.join("\u0001"))}`;

export function loadStoredMapping(kind: ImportKind, headers: readonly string[], fields: readonly ImportField[]): ImportMapping {
  try {
    const raw = window.localStorage.getItem(mappingStorageKey(kind, headers));

    const parsed: unknown = raw ? JSON.parse(raw) : null;

    if (!isRecord(parsed)) return {};

    const keys = new Set(fields.map((f) => f.key));

    return Object.fromEntries(
      headers
        .filter((h) => Object.hasOwn(parsed, h))
        .map((h) => {
          const v = parsed[h];

          return [h, typeof v === "string" && keys.has(v) ? v : null];
        }),
    );
  } catch {
    return {};
  }
}

export function saveStoredMapping(kind: ImportKind, headers: readonly string[], mapping: ImportMapping): void {
  try {
    window.localStorage.setItem(mappingStorageKey(kind, headers), JSON.stringify(mapping));
  } catch {
    // private mode: the mapping just won't be remembered
  }
}
```

> Тест «невідомий набір заголовків» очікує `{}` для `["Назва"]`: ключ сховища залежить від усього набору заголовків, тож запис для `["Назва","Хто"]` не підходить.

```ts
// lib/hooks/content-import/keys.ts
import type { QueryKey } from "@tanstack/react-query";

import { artifactSetKeys } from "@/lib/hooks/artifact-sets/keys";
import { artifactKeys } from "@/lib/hooks/artifacts/keys";
import { classKeys } from "@/lib/hooks/classes/keys";
import { raceKeys } from "@/lib/hooks/races/keys";
import { skillKeys } from "@/lib/hooks/skills/keys";
import { spellKeys } from "@/lib/hooks/spells/keys";
import { unitKeys, unitWriteKeys } from "@/lib/hooks/units/keys";
import type { ImportKind } from "@/types/content-import";

export const contentImportKeys = {
  aiAvailability: (campaignId: string, kind: ImportKind) => ["content-import-ai", campaignId, kind] as const,
};

const INVALIDATE: Record<ImportKind, (campaignId: string) => QueryKey[]> = {
  units: unitWriteKeys,
  spells: (c) => [spellKeys.list(c)],
  skills: (c) => [skillKeys.list(c)],
  "main-skills": (c) => [skillKeys.mainSkills(c), skillKeys.list(c)],
  "spell-groups": (c) => [spellKeys.groups(c), spellKeys.list(c)],
  races: (c) => [raceKeys.list(c), unitKeys.list(c)],
  classes: (c) => [classKeys.list(c)],
  artifacts: (c) => [artifactKeys.list(c), artifactSetKeys.list(c)],
  "artifact-sets": (c) => [artifactSetKeys.list(c), artifactKeys.list(c)],
};

export const importInvalidateKeys = (campaignId: string, kind: ImportKind): QueryKey[] => INVALIDATE[kind](campaignId);
```

```ts
// lib/hooks/content-import/useContentImport.ts
"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { contentImportKeys, importInvalidateKeys } from "./keys";

import { contentExampleUrl, getImportAiAvailability, importContentRows, suggestImportMapping } from "@/lib/api/content-import";
import { downloadText } from "@/lib/utils/common/download-text";
import { applyMapping, autoMap, chunkRows, IMPORT_LIMITS, IMPORT_SPECS, ImportFileError, missingRequired, parseTable } from "@/lib/utils/content/import";
import { aiSample, loadStoredMapping, mergeReports, readImportFile, reportToCsv, saveStoredMapping } from "@/lib/utils/content/import/wizard";
import type { ImportKind, ImportMapping, ImportMode, ImportRecord, ImportReport, ParsedTable } from "@/types/content-import";

export type ImportStep = "file" | "columns" | "preview" | "result";

type Part = { offset: number; report: ImportReport };

const messageOf = (e: unknown, fallback: string) => (e instanceof Error && e.message ? e.message : fallback);

export function useContentImport(campaignId: string, kind: ImportKind) {
  const spec = IMPORT_SPECS[kind];

  const queryClient = useQueryClient();

  const [step, setStep] = useState<ImportStep>("file");

  const [file, setFile] = useState<{ name: string | null; table: ParsedTable | null }>({ name: null, table: null });

  const [mapping, setMapping] = useState<ImportMapping>({});

  const [mode, setMode] = useState<ImportMode>("create");

  const [preview, setPreview] = useState<ImportReport | null>(null);

  const [result, setResult] = useState<ImportReport | null>(null);

  const [busy, setBusy] = useState(false);

  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const [error, setError] = useState<string | null>(null);

  const [aiBusy, setAiBusy] = useState(false);

  const [aiNotes, setAiNotes] = useState<string[]>([]);

  const ai = useQuery({ queryKey: contentImportKeys.aiAvailability(campaignId, kind), queryFn: () => getImportAiAvailability(campaignId, kind), staleTime: 5 * 60_000, enabled: step === "columns" });

  const records = (table: ParsedTable): ImportRecord[] => table.rows.map((row) => applyMapping(row, mapping, spec.fields).value);

  async function selectFile(next: File) {
    setError(null);

    try {
      const table = parseTable(await readImportFile(next), next.name);

      setFile({ name: next.name, table });
      setMapping({ ...autoMap(table.headers, spec.fields), ...loadStoredMapping(kind, table.headers, spec.fields) });
      setPreview(null);
      setResult(null);
      setAiNotes([]);
      setStep("columns");
    } catch (e) {
      setError(e instanceof ImportFileError ? e.message : messageOf(e, "Не вдалося прочитати файл"));
    }
  }

  async function dryRun(nextMode: ImportMode) {
    const { table } = file;

    if (!table) return;

    setBusy(true);
    setError(null);

    try {
      saveStoredMapping(kind, table.headers, mapping);

      const parts: Part[] = [];

      let offset = 0;

      for (const rows of chunkRows(records(table), IMPORT_LIMITS.rowsPerRequest, IMPORT_LIMITS.chunkBytes)) {
        parts.push({ offset, report: await importContentRows(campaignId, kind, { rows, mode: nextMode, dryRun: true }) });
        offset += rows.length;
      }

      setPreview(mergeReports(parts, true));
      setStep("preview");
    } catch (e) {
      setError(messageOf(e, "Перевірка не вдалася"));
    } finally {
      setBusy(false);
    }
  }

  async function runImport() {
    const { table } = file;

    if (!table) return;

    const chunks = chunkRows(records(table), IMPORT_LIMITS.writeChunkRows, IMPORT_LIMITS.chunkBytes);

    const parts: Part[] = [];

    let offset = 0;

    setBusy(true);
    setError(null);
    setProgress({ done: 0, total: chunks.length });

    try {
      for (const rows of chunks) {
        parts.push({ offset, report: await importContentRows(campaignId, kind, { rows, mode, dryRun: false }) });
        offset += rows.length;
        setProgress({ done: parts.length, total: chunks.length });
      }
    } catch (e) {
      setError(`${messageOf(e, "Імпорт перервано")}. Записано частин: ${parts.length} з ${chunks.length}`);
    }

    const merged = mergeReports(parts, false);

    setResult(merged);
    setStep("result");
    setBusy(false);
    setProgress(null);

    if (merged.counts.created + merged.counts.updated > 0) await Promise.all(importInvalidateKeys(campaignId, kind).map((queryKey) => queryClient.invalidateQueries({ queryKey })));
  }

  async function suggestAi() {
    const { table } = file;

    if (!table) return;

    setAiBusy(true);
    setError(null);

    try {
      const res = await suggestImportMapping(campaignId, kind, { headers: table.headers.slice(0, IMPORT_LIMITS.aiHeaders), sample: aiSample(table) });

      setMapping((current) => ({ ...current, ...Object.fromEntries(Object.entries(res.mapping).filter(([header, key]) => key !== null && Object.hasOwn(current, header))) }));
      setAiNotes(res.notes);
    } catch (e) {
      setError(messageOf(e, "AI не зміг підказати мапінг"));
    } finally {
      setAiBusy(false);
    }
  }

  function reset() {
    setStep("file");
    setFile({ name: null, table: null });
    setMapping({});
    setMode("create");
    setPreview(null);
    setResult(null);
    setBusy(false);
    setProgress(null);
    setError(null);
    setAiNotes([]);
  }

  function downloadErrors() {
    const report = result ?? preview;

    if (file.table && report) downloadText(`${kind}-errors.csv`, reportToCsv(file.table, report), "text/csv");
  }

  return {
    spec,
    step,
    file,
    mapping: {
      value: mapping,
      set: (header: string, key: string | null) => {
        setMapping((current) => ({ ...current, [header]: key }));
        setPreview(null);
      },
      missing: missingRequired(spec.fields, mapping),
    },
    ai: { available: ai.data?.available ?? false, busy: aiBusy, notes: aiNotes, suggest: suggestAi },
    mode: {
      value: mode,
      set: (next: ImportMode) => {
        setMode(next);
        void dryRun(next);
      },
    },
    preview,
    result,
    status: { busy, progress, error },
    actions: {
      selectFile,
      runPreview: () => dryRun(mode),
      runImport,
      back: () => {
        setError(null);
        setStep((s) => (s === "preview" ? "columns" : "file"));
      },
      reset,
      downloadErrors,
    },
    urls: { example: contentExampleUrl(campaignId, kind) },
  };
}

export type ContentImportState = ReturnType<typeof useContentImport>;
```

```ts
// lib/hooks/content-import/useContentTransferUrls.ts
import { contentExampleUrl, contentExportUrl } from "@/lib/api/content-import";
import type { ImportKind } from "@/types/content-import";

export const useContentTransferUrls = (campaignId: string, kind: ImportKind) => ({ example: contentExampleUrl(campaignId, kind), export: contentExportUrl(campaignId, kind) });
```

```ts
// lib/hooks/content-import/index.ts
export { contentImportKeys, importInvalidateKeys } from "./keys";
export { type ContentImportState, type ImportStep, useContentImport } from "./useContentImport";
export { useContentTransferUrls } from "./useContentTransferUrls";
```

- [ ] **Step 4:** `pnpm test:run lib/utils/content/import/__tests__/wizard.test.ts lib/hooks/content-import/__tests__/useContentImport.test.tsx` — PASS. Якщо тест «AI» бачить `Інше` у мапінгу — перевірити фільтр `Object.hasOwn(current, header)`.

- [ ] **Step 5: Commit**

```bash
git add lib/api/content-import.ts lib/utils/content/import/wizard.ts lib/utils/content/import/__tests__/wizard.test.ts lib/utils/common/download-text.ts lib/hooks/content-import
git commit -m "feat(constructor): 4f-0 content import client, wizard hook and chunked upload

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: UI майстра (4 кроки)

**Files:**
- Create: `components/content-import/ContentImportWizard.tsx`, `components/content-import/ImportCounts.tsx`, `components/content-import/steps/{FileStep,ColumnsStep,PreviewStep,ResultStep}.tsx`
- Test: `components/content-import/__tests__/steps.test.tsx`, `components/content-import/__tests__/ContentImportWizard.test.tsx`

**Interfaces:**
- Consumes: `useContentImport`, `ContentImportState` (задача 10); `statusLabel`, `IMPORT_LIMITS`; `ResponsiveDialog`, `Button`, `Input`, `Label`, `SelectField`.
- Produces: `export function ContentImportWizard(props: { campaignId: string; kind: ImportKind; open: boolean; onOpenChange: (open: boolean) => void })` (іменований експорт — для `next/dynamic` у задачі 12). Кроки отримують один проп `wizard: ContentImportState`.

- [ ] **Step 1: Failing tests**

```tsx
// components/content-import/__tests__/steps.test.tsx
// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ColumnsStep } from "../steps/ColumnsStep";
import { PreviewStep } from "../steps/PreviewStep";
import { ResultStep } from "../steps/ResultStep";

import type { ContentImportState } from "@/lib/hooks/content-import";
import { IMPORT_SPECS } from "@/lib/utils/content/import";
import type { ImportReport } from "@/types/content-import";

afterEach(cleanup);

const REPORT = (n: number, dryRun: boolean): ImportReport => ({
  dryRun,
  results: Array.from({ length: n }, (_, i) => (i === 0 ? { row: 1, status: "error" as const, name: "Біс", issues: [{ field: "maxHp", level: "error" as const, message: "ХП: Очікується ціле число" }] } : { row: i + 1, status: "created" as const, name: `Юніт ${i + 1}`, issues: [] })),
  counts: { created: n - 1, updated: 0, skipped: 0, error: 1 },
});

function wizard(over: Partial<ContentImportState> = {}): ContentImportState {
  return {
    spec: IMPORT_SPECS.units,
    step: "columns",
    file: { name: "u.csv", table: { format: "csv", headers: ["Назва", "Хто"], rows: [{ Назва: "Біс", Хто: "Демони" }] } },
    mapping: { value: { Назва: null, Хто: "raceId" }, set: vi.fn(), missing: [IMPORT_SPECS.units.fields[0]] },
    ai: { available: false, busy: false, notes: [], suggest: vi.fn(async () => {}) },
    mode: { value: "create", set: vi.fn() },
    preview: null,
    result: null,
    status: { busy: false, progress: null, error: null },
    actions: { selectFile: vi.fn(), runPreview: vi.fn(), runImport: vi.fn(), back: vi.fn(), reset: vi.fn(), downloadErrors: vi.fn() },
    urls: { example: "/api/campaigns/c1/content-import/units/example.csv" },
    ...over,
  } as unknown as ContentImportState;
}

describe("ColumnsStep", () => {
  it("підсвічує незіставлені обов'язкові поля, показує приклад значення", () => {
    render(<ColumnsStep wizard={wizard()} />);

    expect(screen.getByRole("alert").textContent).toBe("Не зіставлено обов'язкові поля: Назва");
    expect(screen.getByText("Демони")).toBeTruthy();
  });

  it("кнопка AI — лише коли ключ є", () => {
    render(<ColumnsStep wizard={wizard()} />);

    expect(screen.queryByRole("button", { name: "Підказати AI" })).toBeNull();
    cleanup();

    const w = wizard({ ai: { available: true, busy: false, notes: ["Перевірте ХП"], suggest: vi.fn(async () => {}) } });

    render(<ColumnsStep wizard={w} />);
    fireEvent.click(screen.getByRole("button", { name: "Підказати AI" }));

    expect(w.ai.suggest).toHaveBeenCalled();
    expect(screen.getByText("Перевірте ХП")).toBeTruthy();
  });
});

describe("PreviewStep", () => {
  it("лічильники, помилки рядків, перші 50 рядків, звіт помилок", () => {
    const w = wizard({ step: "preview", preview: REPORT(60, true) });

    render(<PreviewStep wizard={w} />);

    expect(screen.getByText("Буде створено: 59")).toBeTruthy();
    expect(screen.getByText("ХП: Очікується ціле число")).toBeTruthy();
    expect(screen.getAllByRole("row")).toHaveLength(51);
    expect(screen.getByText("Показано перші 50 з 60")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Завантажити звіт помилок CSV" }));

    expect(w.actions.downloadErrors).toHaveBeenCalled();
  });
});

describe("ResultStep", () => {
  it("підсумок і помилка часткового запису", () => {
    render(<ResultStep wizard={wizard({ step: "result", result: REPORT(3, false), status: { busy: false, progress: null, error: "Мережа. Записано частин: 1 з 2" } })} />);

    expect(screen.getByText("Створено: 2")).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toBe("Мережа. Записано частин: 1 з 2");
  });
});
```

```tsx
// components/content-import/__tests__/ContentImportWizard.test.tsx
// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ContentImportWizard } from "../ContentImportWizard";

import { mockMatchMedia } from "@/components/ui/__tests__/match-media";
import type { ContentImportState } from "@/lib/hooks/content-import";
import { IMPORT_SPECS } from "@/lib/utils/content/import";

const state = vi.hoisted(() => ({ wizard: null as unknown }));

vi.mock("@/lib/hooks/content-import", () => ({ useContentImport: () => state.wizard }));

const actions = { selectFile: vi.fn(), runPreview: vi.fn(), runImport: vi.fn(), back: vi.fn(), reset: vi.fn(), downloadErrors: vi.fn() };

const base = {
  spec: IMPORT_SPECS.units,
  file: { name: "u.csv", table: { format: "csv", headers: ["Назва"], rows: [{ Назва: "Біс" }] } },
  mapping: { value: { Назва: "name" }, set: vi.fn(), missing: [] },
  ai: { available: false, busy: false, notes: [], suggest: vi.fn() },
  mode: { value: "create", set: vi.fn() },
  preview: null,
  result: null,
  status: { busy: false, progress: null, error: null },
  actions,
  urls: { example: "/x.csv" },
};

const show = (over: Record<string, unknown>) => {
  state.wizard = { ...base, ...over } as unknown as ContentImportState;
  render(<ContentImportWizard campaignId="c1" kind="units" open onOpenChange={vi.fn()} />);
};

describe("ContentImportWizard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMatchMedia(false);
  });

  afterEach(cleanup);

  it("крок файлу: посилання на приклад CSV", () => {
    show({ step: "file", file: { name: null, table: null } });

    expect(screen.getByRole("link", { name: "Завантажити приклад CSV" }).getAttribute("href")).toBe("/x.csv");
  });

  it("крок колонок: «Перевірити» вимкнена без обов'язкових полів", () => {
    show({ step: "columns", mapping: { value: { Назва: null }, set: vi.fn(), missing: [IMPORT_SPECS.units.fields[0]] } });

    expect((screen.getByRole("button", { name: "Перевірити" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("крок перегляду: «Імпортувати N» рахує створення й оновлення", () => {
    show({ step: "preview", preview: { dryRun: true, results: [], counts: { created: 2, updated: 1, skipped: 4, error: 1 } } });

    fireEvent.click(screen.getByRole("button", { name: "Імпортувати 3" }));

    expect(actions.runImport).toHaveBeenCalled();
  });

  it("під час запису кнопка показує прогрес частин", () => {
    show({ step: "preview", preview: { dryRun: true, results: [], counts: { created: 2, updated: 0, skipped: 0, error: 0 } }, status: { busy: true, progress: { done: 1, total: 3 }, error: null } });

    expect(screen.getByRole("button", { name: "Імпорт… 1/3" })).toBeTruthy();
  });
});
```

- [ ] **Step 2:** `pnpm test:run components/content-import` — FAIL.

- [ ] **Step 3: Implement**

```tsx
// components/content-import/ImportCounts.tsx
import { statusLabel } from "@/lib/utils/content/import/wizard";
import type { ImportReport, ImportRowStatus } from "@/types/content-import";

const ORDER: ImportRowStatus[] = ["created", "updated", "skipped", "error"];

export function ImportCounts({ report }: { report: ImportReport }) {
  return (
    <ul className="flex flex-wrap gap-2 text-sm">
      {ORDER.filter((s) => report.counts[s] > 0 || s === "created").map((s) => (
        <li key={s} className={s === "error" ? "rounded border border-red-500/40 px-2 py-0.5 text-red-400" : "rounded border border-hud-muted/30 px-2 py-0.5"}>
          {`${statusLabel(s, report.dryRun)}: ${report.counts[s]}`}
        </li>
      ))}
    </ul>
  );
}
```

```tsx
// components/content-import/steps/FileStep.tsx
"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ContentImportState } from "@/lib/hooks/content-import";

export function FileStep({ wizard }: { wizard: ContentImportState }) {
  return (
    <div className="space-y-3">
      <Label htmlFor="content-import-file">Файл CSV, TSV або JSON</Label>
      <Input
        id="content-import-file"
        type="file"
        accept=".csv,.tsv,.txt,.json"
        disabled={wizard.status.busy}
        onChange={(e) => {
          const file = e.target.files?.[0];

          if (file) void wizard.actions.selectFile(file);
        }}
      />
      <p className="text-xs text-hud-muted">Excel чи Google Таблиці: «Файл → Зберегти як → CSV (UTF-8)». Роздільник (кома, крапка з комою, табуляція) визначається сам.</p>
      <a className="text-sm underline" href={wizard.urls.example} download>
        Завантажити приклад CSV
      </a>
    </div>
  );
}
```

```tsx
// components/content-import/steps/ColumnsStep.tsx
"use client";

import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/ui/select-field";
import type { ContentImportState } from "@/lib/hooks/content-import";

function sampleOf(wizard: ContentImportState, header: string): string {
  const value = wizard.file.table?.rows.slice(0, 3).map((r) => r[header]).find((v) => v !== undefined && v !== null && String(v).trim() !== "");

  if (value === undefined) return "";

  const text = typeof value === "string" ? value : JSON.stringify(value);

  return text.length > 40 ? `${text.slice(0, 40)}…` : text;
}

export function ColumnsStep({ wizard }: { wizard: ContentImportState }) {
  const { table, name } = wizard.file;

  if (!table) return null;

  const options = wizard.spec.fields.map((f) => ({ value: f.key, label: f.required ? `${f.label} *` : f.label }));

  return (
    <div className="space-y-3">
      <p className="text-sm text-hud-muted">
        Файл «{name}» · рядків: {table.rows.length}. Оберіть поле для кожної колонки.
      </p>
      {wizard.mapping.missing.length > 0 && (
        <p role="alert" className="text-sm text-red-400">
          {`Не зіставлено обов'язкові поля: ${wizard.mapping.missing.map((f) => f.label).join(", ")}`}
        </p>
      )}
      {wizard.ai.available && (
        <Button type="button" variant="outline" size="sm" disabled={wizard.ai.busy} onClick={() => void wizard.ai.suggest()}>
          <Sparkles className="h-4 w-4" />
          {wizard.ai.busy ? "AI думає…" : "Підказати AI"}
        </Button>
      )}
      {wizard.ai.notes.length > 0 && (
        <ul className="list-disc space-y-1 pl-5 text-xs text-hud-muted">
          {wizard.ai.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      )}
      <div className="max-h-[50vh] space-y-2 overflow-y-auto pr-1">
        {table.headers.map((header) => (
          <div key={header} className="grid grid-cols-1 gap-1 sm:grid-cols-2 sm:items-center sm:gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{header}</p>
              <p className="truncate text-xs text-hud-muted">{sampleOf(wizard, header)}</p>
            </div>
            <SelectField aria-label={`Поле для «${header}»`} value={wizard.mapping.value[header] ?? ""} onValueChange={(v) => wizard.mapping.set(header, v || null)} options={options} allowNone noneLabel="— пропустити —" />
          </div>
        ))}
      </div>
    </div>
  );
}
```

```tsx
// components/content-import/steps/PreviewStep.tsx
"use client";

import { ImportCounts } from "../ImportCounts";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/ui/select-field";
import type { ContentImportState } from "@/lib/hooks/content-import";
import { IMPORT_LIMITS } from "@/lib/utils/content/import";
import { statusLabel } from "@/lib/utils/content/import/wizard";
import type { ImportMode } from "@/types/content-import";

const MODE_OPTIONS = [
  { value: "create", label: "Лише нові (дубль назви — помилка)" },
  { value: "update", label: "Оновити за назвою, нові — створити" },
  { value: "skip", label: "Пропустити наявні" },
];

export function PreviewStep({ wizard }: { wizard: ContentImportState }) {
  const report = wizard.preview;

  if (!report) return null;

  const rows = report.results.slice(0, IMPORT_LIMITS.previewRows);

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor="content-import-mode">Режим</Label>
        <SelectField id="content-import-mode" value={wizard.mode.value} onValueChange={(v) => wizard.mode.set(v as ImportMode)} options={MODE_OPTIONS} disabled={wizard.status.busy} />
      </div>
      <ImportCounts report={report} />
      <div className="max-h-[45vh] overflow-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="text-hud-muted">
              <th className="p-1">Рядок</th>
              <th className="p-1">Назва</th>
              <th className="p-1">Статус</th>
              <th className="p-1">Помилки</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.row} className={r.status === "error" ? "text-red-400" : undefined}>
                <td className="p-1">{r.row}</td>
                <td className="p-1">{r.name ?? "—"}</td>
                <td className="p-1">{statusLabel(r.status, report.dryRun)}</td>
                <td className="p-1">{r.issues.map((i) => i.message).join("; ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {report.results.length > rows.length && <p className="text-xs text-hud-muted">{`Показано перші ${rows.length} з ${report.results.length}`}</p>}
      {report.counts.error > 0 && (
        <Button type="button" variant="outline" size="sm" onClick={wizard.actions.downloadErrors}>
          Завантажити звіт помилок CSV
        </Button>
      )}
    </div>
  );
}
```

```tsx
// components/content-import/steps/ResultStep.tsx
"use client";

import { ImportCounts } from "../ImportCounts";

import { Button } from "@/components/ui/button";
import type { ContentImportState } from "@/lib/hooks/content-import";

export function ResultStep({ wizard }: { wizard: ContentImportState }) {
  const report = wizard.result;

  if (!report) return null;

  return (
    <div className="space-y-3">
      <ImportCounts report={report} />
      {wizard.status.error && (
        <p role="alert" className="text-sm text-red-400">
          {wizard.status.error}
        </p>
      )}
      {report.counts.error > 0 && (
        <Button type="button" variant="outline" size="sm" onClick={wizard.actions.downloadErrors}>
          Завантажити звіт помилок CSV
        </Button>
      )}
    </div>
  );
}
```

```tsx
// components/content-import/ContentImportWizard.tsx
"use client";

import { ColumnsStep } from "./steps/ColumnsStep";
import { FileStep } from "./steps/FileStep";
import { PreviewStep } from "./steps/PreviewStep";
import { ResultStep } from "./steps/ResultStep";

import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { type ImportStep, useContentImport } from "@/lib/hooks/content-import";
import type { ImportKind } from "@/types/content-import";

const STEP_HINT: Record<ImportStep, string> = {
  file: "Крок 1 з 4 · файл",
  columns: "Крок 2 з 4 · колонки",
  preview: "Крок 3 з 4 · перевірка",
  result: "Крок 4 з 4 · підсумок",
};

interface ContentImportWizardProps {
  campaignId: string;
  kind: ImportKind;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ContentImportWizard({ campaignId, kind, open, onOpenChange }: ContentImportWizardProps) {
  const wizard = useContentImport(campaignId, kind);

  const { busy, progress, error } = wizard.status;

  const close = (next: boolean) => {
    if (!next) wizard.actions.reset();

    onOpenChange(next);
  };

  const planned = wizard.preview ? wizard.preview.counts.created + wizard.preview.counts.updated : 0;

  const footer = {
    file: (
      <Button variant="outline" onClick={() => close(false)}>
        Скасувати
      </Button>
    ),
    columns: (
      <>
        <Button variant="outline" onClick={wizard.actions.back} disabled={busy}>
          Назад
        </Button>
        <Button onClick={() => void wizard.actions.runPreview()} disabled={busy || wizard.mapping.missing.length > 0}>
          {busy ? "Перевірка…" : "Перевірити"}
        </Button>
      </>
    ),
    preview: (
      <>
        <Button variant="outline" onClick={wizard.actions.back} disabled={busy}>
          Назад
        </Button>
        <Button onClick={() => void wizard.actions.runImport()} disabled={busy || planned === 0}>
          {progress ? `Імпорт… ${progress.done}/${progress.total}` : `Імпортувати ${planned}`}
        </Button>
      </>
    ),
    result: <Button onClick={() => close(false)}>Готово</Button>,
  }[wizard.step];

  return (
    <ResponsiveDialog hud size="lg" open={open} onOpenChange={close} title={`Імпорт: ${wizard.spec.label}`} description={STEP_HINT[wizard.step]} footer={footer}>
      <div className="space-y-3">
        {error && wizard.step !== "result" && (
          <p role="alert" className="text-sm text-red-400">
            {error}
          </p>
        )}
        {wizard.step === "file" && <FileStep wizard={wizard} />}
        {wizard.step === "columns" && <ColumnsStep wizard={wizard} />}
        {wizard.step === "preview" && <PreviewStep wizard={wizard} />}
        {wizard.step === "result" && <ResultStep wizard={wizard} />}
      </div>
    </ResponsiveDialog>
  );
}
```

- [ ] **Step 4:** `pnpm test:run components/content-import` — PASS. Якщо `getAllByRole("row")` рахує інакше — у таблиці має бути рівно 1 рядок заголовка + 50 рядків даних (перевірити `slice(0, IMPORT_LIMITS.previewRows)`). `ColumnsStep`-тест «alert» очікує, що на кроці немає іншого `role="alert"`.

- [ ] **Step 5: Commit**

```bash
git add components/content-import
git commit -m "feat(constructor): 4f-0 content import wizard ui

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 12: Кнопки на сторінках бібліотеки ДМ, прибирання старого імпорту юнітів, скрипт

**Files:**
- Create: `components/content-import/ContentTransferButtons.tsx`
- Modify: `app/campaigns/[id]/dm/{units,spells,skills,main-skills,races,classes,artifacts,artifact-sets}/page-client.tsx`, `app/campaigns/[id]/dm/spell-groups/page.tsx`, `lib/hooks/units/index.ts`, `lib/api/units.ts`, `lib/utils/common/file-import.ts`, `scripts/import/import-units.ts`
- Delete: `components/units/dialogs/UnitImportDialog.tsx`, `lib/hooks/units/useUnitImport.ts`
- Test: `components/content-import/__tests__/ContentTransferButtons.test.tsx`; наявний `app/campaigns/[id]/dm/units/__tests__/page-client.test.tsx` (без змін)

**Interfaces:**
- Consumes: `ContentImportWizard` (задача 11), `useContentTransferUrls` (задача 10), `parseTable` (задача 1).
- Produces: `export function ContentTransferButtons(props: { campaignId: string; kind: ImportKind })` — кнопка «Імпорт» (відкриває лінивий майстер) і посилання «Експорт CSV».

- [ ] **Step 1: Failing test**

```tsx
// components/content-import/__tests__/ContentTransferButtons.test.tsx
// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ContentTransferButtons } from "../ContentTransferButtons";

vi.mock("next/dynamic", () => ({ default: () => (props: { kind: string; open: boolean }) => (props.open ? <p>{`WIZARD ${props.kind}`}</p> : null) }));

afterEach(cleanup);

describe("ContentTransferButtons", () => {
  it("експорт — посилання на CSV виду, імпорт відкриває майстер", () => {
    render(<ContentTransferButtons campaignId="c1" kind="spells" />);

    expect(screen.getByRole("link", { name: "Експорт CSV" }).getAttribute("href")).toBe("/api/campaigns/c1/content-export/spells");
    expect(screen.queryByText("WIZARD spells")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Імпорт" }));

    expect(screen.getByText("WIZARD spells")).toBeTruthy();
  });
});
```

- [ ] **Step 2:** `pnpm test:run components/content-import/__tests__/ContentTransferButtons.test.tsx` — FAIL.

- [ ] **Step 3: Implement кнопки**

```tsx
// components/content-import/ContentTransferButtons.tsx
"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Download, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useContentTransferUrls } from "@/lib/hooks/content-import";
import type { ImportKind } from "@/types/content-import";

// csv-parse and the wizard load only when the dialog opens
const ContentImportWizard = dynamic(() => import("./ContentImportWizard").then((m) => m.ContentImportWizard), { ssr: false });

export function ContentTransferButtons({ campaignId, kind }: { campaignId: string; kind: ImportKind }) {
  const [open, setOpen] = useState(false);

  const urls = useContentTransferUrls(campaignId, kind);

  return (
    <>
      <Button variant="outline" className="whitespace-nowrap text-xs sm:text-sm" onClick={() => setOpen(true)}>
        <Upload className="h-4 w-4" />
        Імпорт
      </Button>
      <Button variant="outline" className="whitespace-nowrap text-xs sm:text-sm" asChild>
        <a href={urls.export} download>
          <Download className="h-4 w-4" />
          Експорт CSV
        </a>
      </Button>
      {open && <ContentImportWizard campaignId={campaignId} kind={kind} open={open} onOpenChange={setOpen} />}
    </>
  );
}
```

- [ ] **Step 4: Сторінки бібліотеки ДМ.** У кожному файлі додати `import { ContentTransferButtons } from "@/components/content-import/ContentTransferButtons";` і першим елементом у `actions` `HudPageHeader`:

| Файл | Що вставити |
|---|---|
| `dm/units/page-client.tsx` | замінити `<UnitImportDialog campaignId={campaignId} />` на `<ContentTransferButtons campaignId={campaignId} kind="units" />`; прибрати імпорт `UnitImportDialog` |
| `dm/spells/page-client.tsx` | `<ContentTransferButtons campaignId={campaignId} kind="spells" />` першим у фрагменті `actions` |
| `dm/skills/page-client.tsx` | `<ContentTransferButtons campaignId={campaignId} kind="skills" />` першим у фрагменті `actions` |
| `dm/artifacts/page-client.tsx` | `<ContentTransferButtons campaignId={campaignId} kind="artifacts" />` першим у фрагменті `actions` |
| `dm/artifact-sets/page-client.tsx` | `<ContentTransferButtons campaignId={id} kind="artifact-sets" />` першим у фрагменті `actions` (проп тут перейменовано на `id`) |
| `dm/main-skills/page-client.tsx` | `actions={<><ContentTransferButtons campaignId={campaignId} kind="main-skills" /><Button onClick={() => createDialog.setOpen(true)}>Створити основний навик</Button></>}` |
| `dm/races/page-client.tsx` | обгорнути наявну кнопку «Створити расу» у `<>…</>` і поставити перед нею `<ContentTransferButtons campaignId={campaignId} kind="races" />` |
| `dm/classes/page-client.tsx` | так само перед кнопкою «Новий клас»: `<ContentTransferButtons campaignId={campaignId} kind="classes" />` |
| `dm/spell-groups/page.tsx` | `<HudPageHeader title="Школи магії" subtitle="…" actions={<ContentTransferButtons campaignId={id} kind="spell-groups" />} />` (серверна сторінка рендерить клієнтський компонент) |

- [ ] **Step 5: Прибрати старий UI-імпорт юнітів.**
  - `git rm components/units/dialogs/UnitImportDialog.tsx lib/hooks/units/useUnitImport.ts`; у `lib/hooks/units/index.ts` прибрати рядок `export { useUnitImport } from "./useUnitImport";`.
  - `lib/api/units.ts`: видалити функцію `importUnits` і імпорт `import type { ImportUnit, UnitImportResult } from "@/types/import";` (більше не використовуються). Роут `POST /units/import` і `lib/utils/units/import-units.ts` **не чіпати**.
  - `lib/utils/common/file-import.ts`: видалити `parseCSVLine` і `parseCSVFile` (лишається `parseJSONFile`, його використовує `useImportCampaign`) і імпорт `CSVRow`, якщо він більше не потрібен.
  - Перевірка, що нічого не посилається на прибране: `grep -rn "useUnitImport\|UnitImportDialog\|importUnits\|parseCSVFile\|parseCSVLine" app components lib scripts` — порожньо (крім `importUnitsIntoCampaign`/`importUnitsSchema`, які лишаються).

- [ ] **Step 6: Скрипт `scripts/import/import-units.ts`** — замінити саморобний парсер (від `const lines = fileContent.split("\n")…` до кінця циклу `for (let i = 1; i < lines.length; i++) { … }` разом із функцією `parseCSVLine` і дебаг-логом першого рядка) на:

```ts
  const table = parseTable(fileContent, filePath);

  const csvRows = table.rows as CSVUnitRow[];
```

і додати імпорт `import { parseTable } from "@/lib/utils/content/import/table";`. Решта (`importUnitsSchema.parse`, `importUnitsIntoCampaign`, звіт) — без змін. `ImportFileError` (порожній файл) прокидається в наявний `main().catch` («Помилка при імпорті: …»). Перевірка без БД: `pnpm exec tsc --noEmit -p . 2>&1 | grep "scripts/import/import-units" || true` — порожньо.

- [ ] **Step 7:** `pnpm test:run components/content-import "app/campaigns/[id]/dm" components/common/__tests__/ImportDialog.test.tsx` + `pnpm test:related lib/api/units.ts lib/utils/common/file-import.ts lib/hooks/units/index.ts` — PASS. `pnpm lint` на змінених файлах — 0 errors.

- [ ] **Step 8: Commit**

```bash
git add -A components/content-import components/units/dialogs "app/campaigns/[id]/dm" lib/hooks/units lib/api/units.ts lib/utils/common/file-import.ts scripts/import/import-units.ts
git commit -m "feat(constructor): 4f-0 import and export buttons on dm library pages

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: Дерева скілів — експорт і імпорт JSON

**Files:**
- Create: `lib/utils/skills/tree-transfer.ts`, `lib/hooks/skills/useSkillTreeTransfer.ts`, `components/skill-tree/SkillTreeTransferButtons.tsx`
- Modify: `lib/hooks/skills/index.ts` (експорт хука), `app/campaigns/[id]/dm/skill-trees/page-client.tsx`
- Test: `lib/utils/skills/__tests__/tree-transfer.test.ts`, `lib/hooks/skills/__tests__/useSkillTreeTransfer.test.tsx`

**Interfaces:**
- Consumes: `useSkillTrees`, `useSaveSkillTree` (`lib/hooks/skills/useSkillTrees.ts`), `useMainSkills`, `useSkills`, `useRaces`, `useNotify`, `downloadText` (задача 10), `nameKey` (задача 2). Збереження — наявна операція `skill-trees.save` (`PATCH /skill-trees/{treeId}`, `treeId: "new"` створює дерево раси).
- Produces:

```ts
// lib/utils/skills/tree-transfer.ts
export const SKILL_TREE_FILE_FORMAT = "skill-tree/1";
export interface SkillTreeFile { format: "skill-tree/1"; race: string; skills: unknown; names: Record<string, { name: string; kind: "mainSkill" | "skill" }> }
export type TreeImportPlan = { race: string; treeId: string; skills: Record<string, unknown> };
export type TreeImportFailure = { race: string; error: string };
export function exportSkillTrees(trees: ReadonlyArray<{ race: string; skills: unknown }>, refs: { mainSkills: IdName[]; skills: IdName[] }): SkillTreeFile[];
export function readSkillTreeFiles(text: string): SkillTreeFile[]; // кидає Error з українським текстом
export function planSkillTreeImport(file: SkillTreeFile, ctx: { races: IdName[]; trees: ReadonlyArray<{ id: string; race: string }>; mainSkills: IdName[]; skills: IdName[] }): TreeImportPlan | TreeImportFailure;
export const isTreeImportFailure: (p: TreeImportPlan | TreeImportFailure) => p is TreeImportFailure;

// lib/hooks/skills/useSkillTreeTransfer.ts
export function useSkillTreeTransfer(campaignId: string): { ready: boolean; busy: boolean; actions: { exportAll: () => void; importFile: (file: File) => Promise<void> } };
```

- [ ] **Step 1: Failing tests**

```ts
// lib/utils/skills/__tests__/tree-transfer.test.ts
import { describe, expect, it } from "vitest";

import { exportSkillTrees, isTreeImportFailure, planSkillTreeImport, readSkillTreeFiles, SKILL_TREE_FILE_FORMAT } from "../tree-transfer";

const TREE = {
  race: "Ельфи",
  skills: {
    id: "old-row",
    race: "Ельфи",
    mainSkills: [
      { id: "m1", name: "Напад", levelSkillIds: { basic: "s1" }, levels: { basic: { circle1: [{ id: "s2" }] } } },
      { id: "racial", name: "Раса", levels: {} },
    ],
    ultimateSkill: { id: "s3" },
  },
};

const SOURCE = {
  mainSkills: [{ id: "m1", name: "Напад" }],
  skills: [{ id: "s1", name: "Основи" }, { id: "s2", name: "Удар" }, { id: "s3", name: "Ультимат" }, { id: "s9", name: "Зайвий" }],
};

describe("exportSkillTrees", () => {
  it("додає словник назв лише для використаних id з видом запису", () => {
    const [file] = exportSkillTrees([TREE], SOURCE);

    expect(file.format).toBe(SKILL_TREE_FILE_FORMAT);
    expect(file.names).toEqual({
      m1: { name: "Напад", kind: "mainSkill" },
      s1: { name: "Основи", kind: "skill" },
      s2: { name: "Удар", kind: "skill" },
      s3: { name: "Ультимат", kind: "skill" },
    });
  });
});

describe("planSkillTreeImport", () => {
  const [file] = exportSkillTrees([TREE], SOURCE);

  const target = {
    races: [{ id: "r1", name: "ельфи" }],
    trees: [{ id: "t1", race: "ельфи" }],
    mainSkills: [{ id: "M1", name: "напад" }],
    skills: [{ id: "S7", name: "Напад" }, { id: "S1", name: "основи" }, { id: "S2", name: "Удар" }, { id: "S3", name: "Ультимат" }],
  };

  it("чужі id замінюються за назвою з урахуванням виду; id/race дерева прибираються; наявне дерево раси оновлюється", () => {
    const plan = planSkillTreeImport(file, target);

    expect(plan).toEqual({
      race: "ельфи",
      treeId: "t1",
      skills: {
        mainSkills: [
          { id: "M1", name: "Напад", levelSkillIds: { basic: "S1" }, levels: { basic: { circle1: [{ id: "S2" }] } } },
          { id: "racial", name: "Раса", levels: {} },
        ],
        ultimateSkill: { id: "S3" },
      },
    });
  });

  it("нове дерево — treeId new; та сама кампанія — id без змін", () => {
    const plan = planSkillTreeImport(file, { races: [{ id: "r", name: "Ельфи" }], trees: [], ...SOURCE });

    expect(plan).toMatchObject({ treeId: "new", skills: { ultimateSkill: { id: "s3" } } });
  });

  it("немає раси або скіла — помилка з назвами", () => {
    expect(planSkillTreeImport(file, { ...target, races: [] })).toEqual({ race: "Ельфи", error: "Раси «Ельфи» немає в кампанії" });

    const missing = planSkillTreeImport(file, { ...target, skills: target.skills.filter((s) => s.id !== "S2") });

    expect(isTreeImportFailure(missing) && missing.error).toBe("Не знайдено в кампанії: Удар");
  });
});

describe("readSkillTreeFiles", () => {
  it("масив або один файл; інше — помилка", () => {
    const [file] = exportSkillTrees([TREE], SOURCE);

    expect(readSkillTreeFiles(JSON.stringify([file, file]))).toHaveLength(2);
    expect(readSkillTreeFiles(JSON.stringify(file))).toHaveLength(1);
    expect(() => readSkillTreeFiles('{"race":"Ельфи"}')).toThrow("Файл не схожий на експорт дерев скілів");
    expect(() => readSkillTreeFiles("[]")).toThrow("Файл не схожий на експорт дерев скілів");
    expect(() => readSkillTreeFiles("{oops")).toThrow("Некоректний JSON");
  });
});
```

```tsx
// lib/hooks/skills/__tests__/useSkillTreeTransfer.test.tsx
// @vitest-environment happy-dom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useSkillTreeTransfer } from "@/lib/hooks/skills/useSkillTreeTransfer";
import { SKILL_TREE_FILE_FORMAT } from "@/lib/utils/skills/tree-transfer";

const state = vi.hoisted(() => ({ trees: [] as Array<{ id: string; race: string; skills: unknown }> }));

const save = vi.hoisted(() => vi.fn(async () => ({})));

const notify = vi.hoisted(() => vi.fn(async () => {}));

const downloadText = vi.hoisted(() => vi.fn());

vi.mock("@/lib/hooks/skills/useSkillTrees", () => ({ useSkillTrees: () => ({ data: state.trees }), useSaveSkillTree: () => ({ mutateAsync: save, isPending: false }) }));
vi.mock("@/lib/hooks/skills/useMainSkills", () => ({ useMainSkills: () => ({ data: [{ id: "M1", name: "Напад" }] }) }));
vi.mock("@/lib/hooks/skills/useSkills", () => ({ useSkills: () => ({ data: [{ id: "S1", name: "Удар" }] }) }));
vi.mock("@/lib/hooks/races", () => ({ useRaces: () => ({ data: [{ id: "r1", name: "Ельфи" }] }) }));
vi.mock("@/lib/hooks/common", () => ({ useNotify: () => notify }));
vi.mock("@/lib/utils/common/download-text", () => ({ downloadText }));

const fileOf = (data: unknown) => new File([JSON.stringify(data)], "trees.json");

const ELVES = { format: SKILL_TREE_FILE_FORMAT, race: "ельфи", skills: { mainSkills: [{ id: "m1" }], ultimateSkill: { id: "s1" } }, names: { m1: { name: "Напад", kind: "mainSkill" }, s1: { name: "Удар", kind: "skill" } } };

describe("useSkillTreeTransfer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.trees = [];
  });

  afterEach(cleanup);

  it("імпорт: зберігає дерево з локальними id, про відсутню расу повідомляє", async () => {
    const { result } = renderHook(() => useSkillTreeTransfer("c1"));

    await act(() => result.current.actions.importFile(fileOf([ELVES, { ...ELVES, race: "Гноми" }])));

    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith({ treeId: "new", race: "Ельфи", skills: { mainSkills: [{ id: "M1" }], ultimateSkill: { id: "S1" } } });
    expect(notify).toHaveBeenCalledWith("Збережено дерева: Ельфи; Гноми: Раси «Гноми» немає в кампанії");
  });

  it("наявне дерево раси оновлюється за його id", async () => {
    state.trees = [{ id: "t1", race: "Ельфи", skills: {} }];

    const { result } = renderHook(() => useSkillTreeTransfer("c1"));

    await act(() => result.current.actions.importFile(fileOf(ELVES)));

    expect(save).toHaveBeenCalledWith(expect.objectContaining({ treeId: "t1" }));
  });

  it("сміття у файлі — повідомлення без збереження", async () => {
    const { result } = renderHook(() => useSkillTreeTransfer("c1"));

    await act(() => result.current.actions.importFile(fileOf({ race: "Ельфи" })));

    expect(save).not.toHaveBeenCalled();
    expect(notify).toHaveBeenCalledWith("Файл не схожий на експорт дерев скілів");
  });

  it("експорт усіх дерев з назвами", () => {
    state.trees = [{ id: "t1", race: "Ельфи", skills: { mainSkills: [{ id: "M1" }] } }];

    const { result } = renderHook(() => useSkillTreeTransfer("c1"));

    act(() => result.current.actions.exportAll());

    const [fileName, json, type] = downloadText.mock.calls[0] as [string, string, string];

    expect([fileName, type]).toEqual(["skill-trees.json", "application/json"]);
    expect(JSON.parse(json)).toEqual([{ format: SKILL_TREE_FILE_FORMAT, race: "Ельфи", skills: { mainSkills: [{ id: "M1" }] }, names: { M1: { name: "Напад", kind: "mainSkill" } } }]);
  });
});
```

- [ ] **Step 2:** `pnpm test:run lib/utils/skills/__tests__/tree-transfer.test.ts lib/hooks/skills/__tests__/useSkillTreeTransfer.test.tsx` — FAIL.

- [ ] **Step 3: Implement**

```ts
// lib/utils/skills/tree-transfer.ts
import { isRecord } from "@/lib/utils/common/is-record";
import { nameKey } from "@/lib/utils/content/import/mapping";
import type { IdName } from "@/types/common";

export const SKILL_TREE_FILE_FORMAT = "skill-tree/1";

type RefKind = "mainSkill" | "skill";

export interface SkillTreeFile {
  format: typeof SKILL_TREE_FILE_FORMAT;
  race: string;
  skills: unknown;
  names: Record<string, { name: string; kind: RefKind }>;
}

export type TreeImportPlan = { race: string; treeId: string; skills: Record<string, unknown> };

export type TreeImportFailure = { race: string; error: string };

export const isTreeImportFailure = (p: TreeImportPlan | TreeImportFailure): p is TreeImportFailure => "error" in p;

function collectStrings(value: unknown, out: Set<string>): void {
  if (typeof value === "string") out.add(value);
  else if (Array.isArray(value)) value.forEach((v) => collectStrings(v, out));
  else if (isRecord(value)) Object.values(value).forEach((v) => collectStrings(v, out));
}

function replaceStrings(value: unknown, map: ReadonlyMap<string, string>): unknown {
  if (typeof value === "string") return map.get(value) ?? value;

  if (Array.isArray(value)) return value.map((v) => replaceStrings(v, map));

  if (isRecord(value)) return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, replaceStrings(v, map)]));

  return value;
}

export function exportSkillTrees(trees: ReadonlyArray<{ race: string; skills: unknown }>, refs: { mainSkills: IdName[]; skills: IdName[] }): SkillTreeFile[] {
  const known = new Map<string, { name: string; kind: RefKind }>();

  for (const s of refs.skills) known.set(s.id, { name: s.name, kind: "skill" });

  for (const m of refs.mainSkills) known.set(m.id, { name: m.name, kind: "mainSkill" });

  return trees.map((tree) => {
    const used = new Set<string>();

    collectStrings(tree.skills, used);

    const names = Object.fromEntries([...used].flatMap((id) => {
      const ref = known.get(id);

      return ref ? [[id, ref] as const] : [];
    }));

    return { format: SKILL_TREE_FILE_FORMAT, race: tree.race, skills: tree.skills, names };
  });
}

const isTreeFile = (v: unknown): v is SkillTreeFile => isRecord(v) && v.format === SKILL_TREE_FILE_FORMAT && typeof v.race === "string" && isRecord(v.skills) && isRecord(v.names);

export function readSkillTreeFiles(text: string): SkillTreeFile[] {
  let data: unknown;

  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("Некоректний JSON");
  }

  const list = Array.isArray(data) ? data : [data];

  if (list.length === 0 || !list.every(isTreeFile)) throw new Error("Файл не схожий на експорт дерев скілів");

  return list;
}

export function planSkillTreeImport(
  file: SkillTreeFile,
  ctx: { races: IdName[]; trees: ReadonlyArray<{ id: string; race: string }>; mainSkills: IdName[]; skills: IdName[] },
): TreeImportPlan | TreeImportFailure {
  const race = ctx.races.find((r) => nameKey(r.name) === nameKey(file.race));

  if (!race) return { race: file.race, error: `Раси «${file.race}» немає в кампанії` };

  const local = new Set([...ctx.mainSkills, ...ctx.skills].map((r) => r.id));

  const ids = new Map<string, string>();

  const missing: string[] = [];

  for (const [id, ref] of Object.entries(file.names)) {
    if (local.has(id)) continue;

    const found = (ref.kind === "mainSkill" ? ctx.mainSkills : ctx.skills).find((r) => nameKey(r.name) === nameKey(ref.name));

    if (found) ids.set(id, found.id);
    else missing.push(ref.name);
  }

  if (missing.length > 0) return { race: race.name, error: `Не знайдено в кампанії: ${missing.join(", ")}` };

  // the row id and race come from the target campaign (saveSkillTree writes them)
  const skills = Object.fromEntries(Object.entries(replaceStrings(file.skills, ids) as Record<string, unknown>).filter(([key]) => key !== "id" && key !== "race"));

  const existing = ctx.trees.find((t) => nameKey(t.race) === nameKey(race.name));

  return { race: race.name, treeId: existing?.id ?? "new", skills };
}
```

> У першому тесті `planSkillTreeImport` значення `name: "Напад"` усередині гілки — теж рядок, але його немає в `ids` (ключі — лише чужі id), тож воно не змінюється. Рядок "Напад" скіла `S7` не підміняє основний скіл — пошук іде за `kind`.

```ts
// lib/hooks/skills/useSkillTreeTransfer.ts
"use client";

import { useMainSkills } from "./useMainSkills";
import { useSkills } from "./useSkills";
import { useSaveSkillTree, useSkillTrees } from "./useSkillTrees";

import { useNotify } from "@/lib/hooks/common";
import { useRaces } from "@/lib/hooks/races";
import { downloadText } from "@/lib/utils/common/download-text";
import type { RawTree } from "@/lib/utils/skills/progression";
import { exportSkillTrees, isTreeImportFailure, planSkillTreeImport, readSkillTreeFiles, type SkillTreeFile } from "@/lib/utils/skills/tree-transfer";

export function useSkillTreeTransfer(campaignId: string) {
  const trees = useSkillTrees(campaignId);

  const mainSkills = useMainSkills(campaignId);

  const skills = useSkills(campaignId);

  const races = useRaces(campaignId);

  const save = useSaveSkillTree(campaignId);

  const notify = useNotify();

  const data = trees.data && mainSkills.data && skills.data && races.data ? { trees: trees.data, mainSkills: mainSkills.data, skills: skills.data, races: races.data } : null;

  function exportAll() {
    if (!data) return;

    downloadText("skill-trees.json", JSON.stringify(exportSkillTrees(data.trees, data), null, 2), "application/json");
  }

  async function importFile(file: File) {
    if (!data) return;

    let files: SkillTreeFile[];

    try {
      files = readSkillTreeFiles(await file.text());
    } catch (e) {
      await notify(e instanceof Error ? e.message : "Не вдалося прочитати файл");

      return;
    }

    const saved: string[] = [];

    const failed: string[] = [];

    for (const tree of files) {
      const plan = planSkillTreeImport(tree, data);

      if (isTreeImportFailure(plan)) {
        failed.push(`${plan.race}: ${plan.error}`);
        continue;
      }

      try {
        await save.mutateAsync({ treeId: plan.treeId, race: plan.race, skills: plan.skills as unknown as RawTree });
        saved.push(plan.race);
      } catch (e) {
        failed.push(`${plan.race}: ${e instanceof Error ? e.message : "помилка збереження"}`);
      }
    }

    await notify([saved.length > 0 ? `Збережено дерева: ${saved.join(", ")}` : "Жодного дерева не збережено", ...failed].join("; "));
  }

  return { ready: !!data, busy: save.isPending, actions: { exportAll, importFile } };
}
```

У `lib/hooks/skills/index.ts` додати `export { useSkillTreeTransfer } from "./useSkillTreeTransfer";` (у порядку `simple-import-sort`).

```tsx
// components/skill-tree/SkillTreeTransferButtons.tsx
"use client";

import { useRef } from "react";
import { Download, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useSkillTreeTransfer } from "@/lib/hooks/skills";

export function SkillTreeTransferButtons({ campaignId }: { campaignId: string }) {
  const transfer = useSkillTreeTransfer(campaignId);

  const input = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-wrap justify-end gap-2">
      <input
        ref={input}
        type="file"
        accept=".json"
        className="hidden"
        aria-label="Файл дерев скілів"
        onChange={(e) => {
          const file = e.target.files?.[0];

          e.target.value = "";

          if (file) void transfer.actions.importFile(file);
        }}
      />
      <Button variant="outline" size="sm" disabled={!transfer.ready || transfer.busy} onClick={() => input.current?.click()}>
        <Upload className="h-4 w-4" />
        Імпорт JSON
      </Button>
      <Button variant="outline" size="sm" disabled={!transfer.ready} onClick={transfer.actions.exportAll}>
        <Download className="h-4 w-4" />
        Експорт JSON
      </Button>
    </div>
  );
}
```

`app/campaigns/[id]/dm/skill-trees/page-client.tsx` — між `<OnboardingHint …/>` і `<SkillTreeEditor …/>`:

```tsx
      <div className="mb-3">
        <SkillTreeTransferButtons campaignId={campaignId} />
      </div>
```

і імпорт `import { SkillTreeTransferButtons } from "@/components/skill-tree/SkillTreeTransferButtons";`.

- [ ] **Step 4:** `pnpm test:run lib/utils/skills/__tests__/tree-transfer.test.ts lib/hooks/skills/__tests__/useSkillTreeTransfer.test.tsx` + `pnpm test:related lib/hooks/skills/index.ts "app/campaigns/[id]/dm/skill-trees/page-client.tsx"` — PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/utils/skills/tree-transfer.ts lib/utils/skills/__tests__/tree-transfer.test.ts lib/hooks/skills components/skill-tree/SkillTreeTransferButtons.tsx "app/campaigns/[id]/dm/skill-trees/page-client.tsx"
git commit -m "feat(constructor): 4f-0 skill tree json export and import by names

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 14: Документи й повна перевірка

**Files:**
- Modify: `docs/architecture/content-api.md`, `docs/STATUS.md`

- [ ] **Step 1: `content-api.md`** — новий розділ перед «## Оновлення з джерела (етап 3)»:

```markdown
## Імпорт і експорт (етап 4f-0)

Масове перенесення контенту з CSV/TSV/JSON для `units`, `spells`, `skills`, `main-skills`, `spell-groups`, `races`, `classes`, `artifacts`, `artifact-sets` (треки — ні).

- **Реєстр полів** — `lib/utils/content/import/fields/` (`IMPORT_SPECS`, без `server-only`): ключ (= ключ тіла create; у `skills` плоскі, вкладає `toBody`), підпис колонки, синоніми, тип (`string|int|number|bool|enum|list|dice|cr|ref|refList|json|attacks|abilitiesText`), посилання, обов'язковість, два приклади. Синоніми юнітів покривають заголовки старого CSV-імпорту (`docs/units/units-all.csv` дає ті самі дані), «Спасброски» не зіставляється; юніт без колонки «Майстерність» і без CR отримує майстерність за рівнем.
- **Ядро** — `lib/utils/content/import/`: `parseTable` (`csv-parse/browser/esm/sync`: BOM, автороздільник `;`/`\t`/`,`, лапки з переносами; JSON — масив або об'єкт), `autoMap` (ключ/підпис/синоніми без регістру), `applyMapping` (кілька колонок здібностей з'єднуються «. »), `coerceRecord`/`parseFieldValue` (ідемпотентні), `toCsv`/`recordToCells` (BOM, `;`, посилання — назвами, вкладене — JSON, списки з комою в назві — через « | »).
- **Сервер** — `importContent` (`lib/server/content/import/import-content.ts`): `assertCan(write)`; усі рядки перевіряються до першого запису (назва, дублі у файлі, режим, посилання за назвою без регістру або точним id, Zod create/update ресурсу); валідні пишуться по одному через `resource.create/update` (без однієї транзакції — ресурси пишуть через Storage й каскади), помилка рядка не зупиняє решту; кеш довідника — один раз. Режими: `create` (дубль — помилка), `update` (за назвою; порожні клітинки не змінюють поле), `skip`. `dryRun` нічого не пише. До 500 рядків за запит; клієнт ділить: перевірка по 500, запис по 100 і ≤ 3 МБ.
- **API**: `POST /content-import/{kind}` (`content.import`, `content:write`), `GET /content-import/{kind}/example.csv` (`content.import-example`) і `GET /content-export/{kind}` (`content.export`) — `content:read`, `text/csv`. `POST /units/import` лишився як був (старий формат, `createMany`).
- **MCP** `content_import(kind, rows, mode, dryRun)` (`content:write`) — стислий звіт: `counts` + до 50 рядків з помилками/попередженнями.
- **AI-мапінг** — `GET/POST /content-import/{kind}/ai-map` (лише ДМ із сесії, не в OpenAPI): `pickDmTextModel` + `generateObject`, відповідь лише з відомими колонками й полями; без ключа — 409 `IMPORT_AI_NO_KEY`; ліміт `AI_PLAYER_RATE_LIMIT`.
- **UI** — `ContentTransferButtons` («Імпорт» + «Експорт CSV») на сторінках бібліотеки ДМ; майстер `ContentImportWizard` (файл → колонки → перевірка → підсумок, лінивий чанк), мапінг запам'ятовується в `localStorage` за набором заголовків, звіт помилок — CSV. Хук `useContentImport` (`lib/hooks/content-import`).
- **Дерева скілів** — JSON `{ format: "skill-tree/1", race, skills, names }` (`lib/utils/skills/tree-transfer.ts`): експорт додає назви використаних основних скілів і скілів, імпорт замінює чужі id за назвою й видом і зберігає через `skill-trees.save` (кнопки на сторінці дерев).
- Обмеження: XLSX — лише через «Зберегти як CSV»; `raceModifiers` заклинань — id (між кампаніями правити вручну); іконки — посилання (data URL у CSV не підтримуються).
```

Також у таблиці «MCP-інструменти контенту» в рядку `content:write` додати `content_import`, а речення «Масового видалення, імпорту й експорту бандла в MCP немає.» замінити на «Масового видалення й експорту бандла в MCP немає; масовий імпорт — `content_import`.»

- [ ] **Step 2: `STATUS.md`** — у рядку «Конструктор кампаній» після фрагмента про 4e додати: «**4f-0 «імпорт контенту» готовий** (CSV/TSV/JSON-імпорт усіх 9 видів контенту з автомапінгом, перевіркою по рядках і режимами створити/оновити/пропустити, приклад і експорт CSV, `content.import`/`content.export` у REST/OpenAPI, MCP `content_import`, AI-мапінг ключем ДМ, JSON дерев скілів; спек — розділ 4f-0 того ж файлу, план `docs/archive/superpowers/plans/2026-10-22-constructor-4f0-content-import.md`; опис — `docs/architecture/content-api.md` «Імпорт і експорт»)» і замінити «далі 4f-0 «Імпорт контенту», потім 4f шаблон SRD» на «далі 4f шаблон SRD».

- [ ] **Step 3: Full verification.**
  - `pnpm install --frozen-lockfile` — без змін lockfile.
  - `pnpm test:run` — усі зелені (відомий нестабільний `lib/hooks/battle/__tests__/battle-fx.test.tsx` — перезапустити окремо).
  - `pnpm lint` — 0 errors.
  - `pnpm build` (тип-перевірка охоплює й тести) — успішно; у виводі збірки є роути `/api/campaigns/[id]/content-import/[kind]`, `…/example.csv`, `…/ai-map`, `/api/campaigns/[id]/content-export/[kind]`.
  - `set -a; source .env.local; set +a; pnpm battle-sweep --campaign cmuylhk0c0001ia06lg5eommv` — без регресу (імпорт бою не зачіпає; відомий нестабільний сценарій лабіринту «ворог у полі зору прокидається»).

- [ ] **Step 4: Commit**

```bash
git add docs/architecture/content-api.md docs/STATUS.md
git commit -m "docs(constructor): 4f-0 content import architecture and status

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 5:** звіт контролеру: список комітів, відхилення від плану, підняті межі (OpenAPI), нестабільні тести.

(Фінальне рев'ю opus, хвиля виправлень, `/simplify`, живий прогін за §7 спеку — десктоп, локальна БД `constructor`: приклад CSV заклинань → правка → імпорт; `docs/units/academy.csv` через ручний мапінг (Name→Назва, HP_Avg→ХП, CR, STR…); експорт юнітів → правка → імпорт «оновити»; AI-мапінг, якщо є ключ; JSON дерева скілів між двома кампаніями; тестові дані видалити — хендоф і пам'ять робить контролер після задачі 14.)
