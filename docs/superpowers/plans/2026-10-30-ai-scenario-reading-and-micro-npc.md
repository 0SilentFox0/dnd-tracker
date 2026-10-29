# План: читання великих сцен і мікро NPC (етапи 1–2)

Спека: [2026-10-30-ai-scenario-reading-and-micro-npc-design.md](../specs/2026-10-30-ai-scenario-reading-and-micro-npc-design.md). Виконання: SDD, виконавці — Sonnet, одне Opus-ревю наприкінці. Окрема гілка/worktree `feat/ai-scenario-reading` (`../dnd-tracker-ai-reading`). Тести: `pnpm test:related <файли>`, повний `test:run` і repo-wide lint — один раз перед merge.

## Етап 1 — читання

**T1. Порціювання читання** (`lib/ai/tools/scenario-read.ts`, чиста функція в `lib/utils/scenario/`).
`chunkContentMarkdown(title, content, { sectionId?, offset, limit }) → { text, nextOffset | null, total }`. Ріже по межі `ScenarioRow`; великий рядок — окрема порція `[row split]`. Інструмент `read_scenario_page` + `offset`, у кінці `[next offset N of TOTAL]`. Тести: межі рядків, `offset` за кінцем, рядок > ліміту, `sectionId`.

**T2. `outline_scenario_page`.** Сигнатура: `{ pageId }` → секції/рядки з розмірами й початком тексту. Реєстр: файл у `lib/ai/tools` + рядок у `AI_TOOLS`. Тест: розмір ≤ 4k для сцени 100k.

**T3. `find_scenario_mentions`.** Чиста `findMentions(content, query) → { sectionId, rowId, field, snippet, forms, inMention }[]` у `lib/utils/scenario/` (основа слова ≥ 4 символи, `search-text.ts`), інструмент з `offset`, ≤ 100 за виклик. Тести: відмінки («Беатріс»/«Беатрісі»), реєстр, `inMention`, слово всередині іншого слова не збігається.

**T4. Стискання.** `compactToolOutputs(messages, { minChars, keep })`: не стискати результати інструментів читання сценарію в поточному запиті, ліміт ≈ 60k символів сумарно (`AI_LIMITS`). Заміряти токени на реальній сцені перед фіксацією числа; якщо дорого — зафіксувати рішення «лишити стискання» у спеці. Тести `compact.test.ts`.

## Етап 2 — мікро NPC

**T5. Сервіс створення знайомства.** Винести з `createAcquaintanceHandler` у `lib/server/acquaintances/service.ts` функцію `createAcquaintance(tx, campaignId, input)` (та сама поведінка, handler делегує). Існуючі тести знайомств мають лишитися зеленими.

**T6. Типи й схеми ops.** `ScenarioAiOpInput`/`ScenarioAiOp` + `createAcquaintance`, `linkMentions` (`types/ai.ts`, `lib/schemas/ai.ts`). Збережена форма: `createAcquaintance { ref, name, description }` + `replaceRow`-и з placeholder `@ref:<ref>`.

**T7. Резолв.** `resolveAiOps`: `linkMentions` → `replaceRow` з `before`; обгортання форм у вузли `mention` на `RichDoc` (`wrapMentions(doc, forms, mention)` у `lib/utils/scenario/`; пропуск чіпів, посилань, code; межі слова Unicode; секрети — обгортати). Помилка `assistant.scenarioOps.noMentions`. Тести: усі сценарії зі спеки.

**T8. Apply.** `proposals.ts`: у транзакції створити/знайти знайомства (дубль імені → існуюче), підставити id замість `@ref:`, далі наявний `applyAiOps`/знімок/версія. `acquaintancesEnabled=false` → відмова. Інтеграційні тести: успіх, відкат при збої, `stale`, дубль імені.

**T9. UI й тексти.** Картка операції `createAcquaintance` у перегляді пропозицій (знайти компонент через `ScenarioAiOp` у `components/ai`/`components/scenario`), ключі `messages/{uk,en}`, `whats-new` + `whatsNew.<id>`, опис `propose_scenario_edit` (чіпи `acquaintance`, порядок «find → create → link»). Компонентні тести з `// @vitest-environment happy-dom`.

**T10. Документація й перевірка.** `docs/architecture/ai.md` (нові інструменти й ops, ліміти читання), `docs/STATUS.md`. Живий прогін у браузері через субагента Sonnet: велика сцена, пропозиція Беатріс, застосування, чіпи в тексті, знайомство в табі. `/simplify` на diff (1–2 агенти), потім merge за дозволом.

## Порядок і залежності

T1→T2→T3 (незалежні від T5–T8, можна паралельно виконавцям), T4 після T1. T5→T6→T7→T8→T9→T10. T3 потрібен T7 лише для узгодження `forms`.
