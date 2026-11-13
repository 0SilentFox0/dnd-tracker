# Ч12 С4 — хвости: D15 (види поза композицією) і M8 Ч10 (запит дерева до правил)

Прочитай `common-ch12.md`, `part12-design.md` («С4») і звіти `task-ch12-{1,2,3}-report.md`. Короткий блок; після нього — підсумок ratchet за всю Ч12.

Контекст D15: `lib/server/content/kind-active.ts` (`isKindActive`, `assertKindActive`; правила вантажаться раз на `Actor`), застосування — `lib/server/content/service.ts:60-165`, `import/import-content.ts:71`. Прогалини — `part11-review.md` M1 (основна тека журналу).

## Коміти

1. **`fix(ch12): D15 covers content kinds, export, import example and skill trees`**
   - `lib/server/assistant/actions/content-reads.ts:21` (`content.kinds`): у `execute` лишити лише види, для яких `await isKindActive(kind, actor)` (знайди, як `execute` отримує `actor` — за зразком сусідніх дій). Якщо `execute` не має `actor` — зупинка, звіт.
   - `lib/server/content/operation-service.ts`:
     - `:220-229` `content.import-example`, `content.export`: `await assertKindActive(kindOf(input.kind), actor)` перед викликом (404 `NOT_FOUND`, як інші шляхи D15);
     - `:199-205` `skill-trees.list|save`: `await assertKindActive('skills', actor)` — дерева належать тому ж модулю, що вид `skills`; ідентифікатор модуля в core не називати (ratchet літералів).
   - Імпорт компендіуму (`lib/server/compendium-import/repository.ts:53-56,533`) і `abilities.sources`: лише якщо `actor` уже в доступі й гейт — один виклик `assertKindActive`/`isKindActive`; інакше — хвіст Ч17 у звіті.
   - Тести (`lib/server/content/__tests__/kind-active-gaps.test.ts` або поруч із тестами D15 Ч11 — `rg -l "isKindActive|content-kinds-composition" lib/server`): голий `dnd5e` (`parseRules({ system: { key: 'dnd5e' } })` у моку `loadRules`) — `content.kinds` без `main-skills`, `skills`, `artifact-sets`, `careers`; `content.export` для `skills` → 404; `content.import-example` для `careers` → 404; `skill-trees.list` → 404; `homm` — `content.kinds` з `main-skills`/`skills`, `skill-trees.list` проходить; core-вид (`spells`) — завжди проходить. Прогрів реєстру `beforeAll(…, 30_000)`.

2. **`fix(ch12): path panels wait for the campaign rules (M8)`**
   - `components/character-profile/SkillsTab.tsx:34`: `const { system, ready } = useCampaignSystem(campaignId, sheet.system)`; `:109` — `pathPanels` рендеряться лише при `ready` (до завантаження правил фолбек-пресет може містити модуль, якого в кампанії немає → `GET progression` 404).
   - Тест (`components/character-profile/__tests__/…`, `// @vitest-environment happy-dom`): поки `useCampaignRules` без даних — панелі шляху немає; після даних з `skilltrees` — є; з `{ key: 'dnd5e' }` — немає.

3. **Без коміту — підсумок частини у звіті:** фінальні числа ratchet за всю Ч12 (було на 85cb90883 → стало), `rg "@/systems/" app lib components types scripts -g '!**/__tests__/**'` без нових збігів, перелік хвостів Ч12 із `part12-design.md` («Що НЕ робимо») + усе, що С1–С4 відклали додатково.

## Не чіпати

- `lib/constants/api-errors.ts` (M2 Ч11 — Ч16), `Header`/дашборд (M7 Ч11 — Ч16), `lib/hooks/campaigns/**`, `lib/server/campaigns/**`, OpenAPI.

## Готово, коли

- `tsc` чистий (під локом) — фінальний для сесії; prettier+eslint по зачеплених файлах чисті.
- Тести написано (не запускались, або точково — з результатом).
- Звіт `task-ch12-4-report.md` із підсумком частини.
