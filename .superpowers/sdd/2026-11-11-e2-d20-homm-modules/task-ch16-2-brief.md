# Ч16 С2 — пресети правил, `initialRules`, створення кампанії без шаблону, маніфест пакета з `modules`

Прочитай `common-ch16.md`, `part16-design.md` (Р6, Р8; пастки П4, П6; ризик 3) і звіт `task-ch16-1-report.md` (там `assertValidSystem`, `compositionApiIssues`, `systemIssues`).

## Коміти

1. **`feat(ch16): rules presets of bases and presets from a generated root`**
   - `scripts/shared/systems-index.ts`: новий `RootSpec` — файл `lib/utils/rules/systems/rules-presets.ts`, шар `systems/${id}/rules/rules-preset.ts`, експорт `${UPPER}_RULES_PRESET`, об'єкт `RULES_PRESETS` (взірець — блок `import-specs`, рядки ~259–290). Новий корінь — у `SYSTEM_ROOTS` `eslint.config.mjs` і в тесті генератора (`lib/__tests__/systems-index.test.ts`, якщо там перелік коренів).
   - Корінь `lib/utils/rules/systems/rules-presets.ts` (Write, з порожніми блоками `// <systems:generated>`, потім `pnpm systems:index`): `export type RulesPreset = Readonly<Record<string, Readonly<Record<string, unknown>>>>`; `export const RULES_PRESETS: Readonly<Record<string, RulesPreset>> = { /* generated */ }`.
   - Пресети (лише дані, `as const satisfies RulesPreset`, імпорт типу з кореня — `import type`):
     - `systems/d20/rules/rules-preset.ts` — новий `D20_RULES_PRESET`;
     - `systems/wfrp/rules/rules-preset.ts` — додати `WFRP_RULES_PRESET` (простий об'єкт); `WFRP_RULES` не міняти;
     - `systems/homm/rules/rules-preset.ts` — `HOMM_RULES_PRESET` (наявний; доповнити в коміті 2 за тестом паритету). Барель `systems/homm/index.ts` лишити як є.
     Початкові значення: секції, у яких відповідний порожній пакет (`data/templates/srd-5.2-empty/rules.json`, `grim-d100-empty`, `heroes-homm`) відрізняється від `DEFAULT_RULES` (`lib/utils/rules/defaults.ts`), **за винятком** секцій і пунктів, якими володіють addon-и поза складом цього meta (`morale`, `heroScaling`, пункт `actions.retaliation` — перевір власників у `systems/*/rules/sections.ts`).
   - Контракт (`lib/__tests__/rules-presets-contract.test.ts`): кожен шлях кожного пресета ∈ `rulePaths(ALL_SECTIONS)`; пресет бази не задає шляхів addon-ів; пресет `kind: 'preset'` задає addon-шляхи лише модулів свого `preset.modules`; ключі `RULES_PRESETS` ⊂ id meta.
   - `pnpm systems:index` (двічі; другий — порожній diff).

2. **`feat(ch16): initial rules of a composition`**
   - Новий `lib/utils/rules/initial-rules.ts` (чиста; **не** імпортується з `schema.ts`/`section-registry.ts`/`defaults.ts` — П6): `initialRules(system: SystemSelection, extra?: Record<string, unknown>): Record<string, unknown>` за Р6 (глибоке злиття по секціях: пресет бази → пресет ключа-пресета → `extra` → `system: { key, modules: composition(system).modules }`; `modules` завжди явні — П4).
   - Тест `lib/utils/rules/__tests__/initial-rules.test.ts`:
     - паритет: `parseRules(initialRules({ key }))` = `parseRules(<rules.json порожнього пакета>)` по всіх шляхах `rulePaths(sectionsOfSystem({ key }))`, крім `defaultAttacks.*`, `advancement.*`, `tables.*` — для `dnd5e` ↔ `srd-5.2-empty`, `wfrp` ↔ `grim-d100-empty`, `homm` ↔ `heroes-homm`. Порівнювати через `getRule` (`lib/utils/rules/sections.ts`), щоб звіт про розбіжність називав шлях. Значення пресетів виправляй, доки тест не стане зеленим (точковий запуск цього файла під локом дозволено); якщо розбіжність стосується addon-шляху (ризик 3) — шлях у явний список винятків тесту з коментарем-«чому» і рядок у звіт;
     - `initialRules({ key: 'dnd5e', modules: ['morale'] })` → `system.modules = ['morale']`, `sectionsOfSystem` має `morale`, `parseRules(...).morale` = типові значення секції;
     - `initialRules({ key: 'dnd5e' })` → `system.modules = []` (явно);
     - `extra.defaultAttacks` потрапляє в результат.

3. **`feat(ch16): create a campaign without a template from a system selection`**
   - `lib/schemas/campaigns.ts`: поле `system` і `superRefine` «`system` разом з `templateId`» за Р6; ключ `validation.systemWithTemplate` в обох `messages/*/validation.json` (поруч із `rulesCustomConflict`).
   - `lib/server/campaigns/create-campaign.ts`: `CreateCampaignData.system?`; у `createCampaignForUser` — `assertValidSystem(data.system)` до створення; `CreateFromBundleInput.system?` і гілка без бандла в `campaignData`: `rules: initialRules(input.system, { ...(input.defaultAttacks && { defaultAttacks }) })` (`Prisma.InputJsonObject`). Без `system` — без змін.
   - `app/api/campaigns/route.ts`: переконатися, що `ContentError` 422 доходить як `{ error, issues }` (через `handleApiError`); правити лише якщо ні.
   - `lib/api/campaigns.ts`: `createCampaign` приймає `system?: { key: string; modules?: string[] }`. Хук `useCreateCampaign` — без змін (тип виводиться).
   - Тести: `lib/server/campaigns/__tests__/create-campaign-system.test.ts` (мок prisma за зразком сусідніх тестів create): `system: { key: 'dnd5e', modules: ['morale'] }` → `campaign.create` отримав `rules.system = { key: 'dnd5e', modules: ['morale'] }` і `defaultAttacks`; `{ key: 'wfrp', modules: ['morale'] }` → `ContentError` 422 з `issues[].path = ['system','modules']`, `create` не викликано; без `system` → `rules = { defaultAttacks }` як було. Схема (`lib/schemas/__tests__/…`, сусідній до наявних тестів схем кампанії): `system` + `templateId` → issue `validation.systemWithTemplate`; `modules: ['Bad']` → помилка.

4. **`feat(ch16): pack manifests carry modules; template validate checks kinds against the composition`** (Р8)
   - `lib/utils/templates/manifest.ts`: `TemplateManifest.modules?: readonly string[]`; `PACK_KIND_CONTENT: Readonly<Partial<Record<PackKind, string>>> = { skillTrees: 'skills' }`.
   - `lib/schemas/template-manifest.ts`: `modules: z.array(z.string()).optional()`.
   - `scripts/templates/lib/validate.ts`: три перевірки з Р8 (повідомлення англійською у стилі наявних `manifest: …`/`rules: …`); набір — `systemIssues({ key: manifest.system, modules: manifest.modules })`; активність виду — `contentKindsOf`.
   - `scripts/templates/lib/export.ts:259`: зберегти `modules` з маніфесту; там, де маніфест експорту будується з кампанії (`rg -n "system:" scripts/templates/lib/{export-command,pack,store}.ts`), перенести `rules.system.modules`, якщо вони явні.
   - Тести в `scripts/templates/__tests__/validate.test.ts` (кейси з Р8). `pnpm template validate <key>` ×5 (`srd-5.2`, `srd-5.2-empty`, `heroes-homm`, `grim-d100`, `grim-d100-empty`) — 0 помилок; вивід — у звіт (команда легка, без БД; під локом не обов'язково).

## Не чіпати

- UI створення кампанії (`components/campaigns/NewCampaignForm.tsx`) — В6.
- `lib/server/campaigns/rules.ts` гейти С1 (лише якщо знайдеш у них баг — окремий `fix(ch16)` коміт із тестом і рядок у звіті).
- Смуга Ч12.

## Готово, коли

- `tsc` чистий (під локом); prettier + eslint по зачеплених файлах; `pnpm systems:index` ідемпотентний; ratchet без змін; нових `@/systems` у core немає, крім згенерованого кореня `rules-presets.ts`.
- Звіт `task-ch16-2-report.md`, у ньому окремо: вміст трьох пресетів (секції), список винятків паритету з причинами, результат `template validate` ×5, підтвердження П6 (хто імпортує `initial-rules.ts` і `rules-presets.ts`).
