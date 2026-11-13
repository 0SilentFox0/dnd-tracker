# Ч16 С1 — сервер: хелпери перемикання, патч `system.modules` із гейтами 422/409/409, `composition` у вигляді, AI й OpenAPI

Прочитай `common-ch16.md` і `part16-design.md` (Р1–Р5, Р10; пастки П1–П5, П7, П8). UI й створення кампанії — не в цій сесії.

## Коміти

1. **`feat(ch16): module toggle helpers and one composition check`**
   - `lib/utils/rules/systems/catalog.ts` (клієнтобезпечний, без нових імпортів поза `meta`/`content-kinds`): `ModuleToggle`, `moduleToggles(system, metas?)`, `withModule(system, id, on, metas?)`, `moduleChange(current, next, metas?)` — сигнатури й семантика в Р1. Сортування й дедуп — наявний `sortedUnique`.
   - `lib/utils/rules/section-registry.ts`: `systemIssues(system: SystemSelection): CompositionIssue[]` = `validateComposition(system)`, а якщо порожньо — `validateSections(composition(system))`. Замінити нею пару викликів у `RulesetSchema.superRefine` (`lib/utils/rules/schema.ts:150-152`), якщо це не створює циклу імпортів (schema вже імпортує section-registry) — поведінка ≡.
   - Тести:
     - `lib/utils/rules/systems/__tests__/catalog.test.ts` (фікстурні `metas`, як у наявному файлі): вимкнений addon із невиконаним `requires` → `available: false`, `reason.code = 'missingRequires'`; з активним `conflicts` → `'conflict'`; увімкнений, якого `requires` інший активний → `'requiredBy'`; addon іншої бази у списку відсутній; `withModule` сортує, дедупить, повертає `[]` при вимкненні останнього; `moduleChange`: `added`/`removed`/`setup` (лише `toggle: 'setup'`), `changed: false` для перестановки порядку.
     - Там само: `systemIssues`/`validateComposition` на фікстурах: два addon-и з однаковим `claims` і взаємним `conflicts` → коди `conflict` і `duplicateClaim` (кейс плану «unitstacks + вигаданий конфліктний модуль»).
     - `lib/utils/rules/systems/__tests__/catalog-folders.test.ts`: множина `module` з `moduleCatalog()` (`bases`, `addons`, `presets` → `module` бази й `id`) разом із пресетами = теки `systems/*` з `meta.ts` (`fs.readdirSync`), без `__tests__`.

2. **`feat(ch16): rules patch accepts system.modules with composition, battle and confirm gates`**
   - `lib/utils/rules/schema.ts`:
     - `RulesetPatch.system?: { key?: string; modules?: string[] }`, `RulesetPatch.confirm?: true`;
     - `rulesetPatchSchemaFor`: секція `system` — явний `z.strictObject({ key, modules })` за Р2 (схема `key` — та сама, що дає `patchOfSection` зараз; `modules` — `z.array(z.string().regex(/^[a-z0-9]+$/)).max(32)` з `.describe(...)`: список id з `moduleCatalog().addons`, текст англійською, без кирилиці); верхнє `confirm: z.literal(true).optional()`;
     - `mergeRules`/`MergePatch`/`writeOverRaw`: `confirm` ігнорується й не пишеться в JSON (П3); зміна `key` з `modules` у патчі зберігає ці `modules` (П2).
   - Новий `lib/server/campaigns/modules.ts` (`import 'server-only'`): `compositionApiIssues`, `assertValidSystem`, `assertModuleChange` (Р3). Ключі issues: `rules.validation.composition.<code>`, `rules.validation.moduleNeedsConfirm`.
   - `lib/server/campaigns/rules.ts`, `updateCampaignRules`: кроки 5–9 з Р3 у вказаному порядку, лічильники через `tx`; нормалізація `modules` (`sortedUnique`) до злиття; `confirm` відкинути до `mergeRules`. `readCampaignRules` і `updateCampaignRules` повертають `composition: composition(rules.system)` (Р4).
   - `types/campaigns.ts`: `CampaignRulesView = Ruleset & { systemLocked?: boolean; composition?: Composition }` (тип `Composition` — з `@/lib/utils/rules/systems/catalog`; необов'язковий, щоб не ламати фікстури/плейсхолдер `DEFAULT_RULES` у `useRulesForm`).
   - `lib/constants/api-errors.ts`: `SYSTEM_MODULES_INVALID`, `SYSTEM_MODULES_IN_BATTLE`, `SYSTEM_MODULE_CONFIRM` (поруч із `SYSTEM_ACTION_UNKNOWN`). Тексти — `messages/{uk,en}/errors.json`, вставка одразу після рядка `"systemActionUnknown"` (таблиця в Р3).
   - `messages/{uk,en}/rules.json`, об'єкт `validation`: `composition.{unknownKey,unknownModule,wrongBase,missingRequires,conflict,duplicateClaim,cycle,sectionCollision}` (ICU-параметри `{module}`, `{detail}` — використовуй лише ті, що осмислені для коду) і `moduleNeedsConfirm` (`{module}`). Тексти короткі, по суті; приклад uk: `"missingRequires": "Модуль «{module}» потребує модуля «{detail}»"`.
   - Тести — новий `lib/server/campaigns/__tests__/rules-modules.test.ts`, усі кейси з Р10 (сценарій плану D16, D16 для кожного addon-а, 422 ×2, підтвердження ×4, гравець 403, ключ + модулі). Моки prisma — за зразком наявних тестів `lib/server/campaigns/__tests__` (знайди той, що викликає `updateCampaignRules`; `withCampaignContentWrite` має працювати з моком `$transaction`). Прогрів реєстру — `beforeAll`, 30 с.
   - Тест схеми (`lib/utils/rules/__tests__/…` — сусідній до наявних тестів `rulesetPatchSchemaFor`/`mergeRules`): `RulesetPatchSchema` приймає `{ system: { modules: ['morale'] }, confirm: true }`, відхиляє `modules: ['Bad id']` і `confirm: false`; `mergeRules(current, { system: { key: 'dnd5e', modules: ['morale'] } }, raw)` при `current.key = 'homm'` → `stored.system = { key: 'dnd5e', modules: ['morale'] }`; без `modules` у патчі → `modules` відсутній; `confirm` у `stored` відсутній.
   - Наявний `lib/__tests__/module-toggle-d16.test.ts` не міняти (він перевіряє рівень `mergeRules`); якщо його кейс «ключ змінено → модулі скинуто» суперечить П2 — це той самий кейс без `modules` у патчі, має лишитись зеленим.

3. **`feat(ch16): assistant and OpenAPI describe rule modules`** (Р5)
   - `lib/ai/tools/content.ts`: описи `get_rules`, `update_rules` (англійською).
   - `lib/server/assistant/actions/content-operation-preview.ts` (`rules.update`): прибрати `confirm` з тіла; якщо тіло має `system.modules` — `assertValidSystem({ key: body.system.key ?? before.system.key, modules })` до `mergeRules`.
   - `lib/server/content/operations.ts` (`rules.update`): `errors: [409, 422]`, опис.
   - Тести/знімки, що фіксують ці описи чи JSON-схему `RulesetPatch` (`rg -l "update_rules|rules.update|RulesetPatch" lib/**/__tests__`), оновити Edit-ом; новий кейс у тесті прев'ю асистента (знайди наявний для `rules.update`): тіло з `modules: ['zzz']` → `ContentError` 422; тіло з `confirm: true` → прев'ю без `confirm` у змінах.

## Не чіпати

- `lib/server/campaigns/create-campaign.ts`, `lib/schemas/campaigns.ts`, генератор, пресети, маніфести пакетів — С2.
- `components/**`, `lib/hooks/**`, `whats-new`, help — С3.
- Смуга Ч12 (див. `common-ch16.md`).

## Готово, коли

- `tsc` чистий (під локом); prettier + eslint по зачеплених файлах чисті; ratchet-файли без змін; нових `@/systems` у core немає.
- Тести написано за переліком (не запускались, крім дозволених точкових).
- Звіт `task-ch16-1-report.md`, у ньому окремо: таблиця «запит → статус → `error`/`issues`» для всіх гілок `updateCampaignRules` (403, 400, 409 lock, 422, 409 battle, 409 confirm, 200), підтвердження П1 (422 до `mergeRules`), П2, П3 (рядок коду), і чи переведено запис на `tx` (П7).
