# Ч16 — Opus-ревʼю (шов створення режиму), 2026-11-13

Гілка `feat/e2-part16-mode-seam`, `git diff main...HEAD` (60 файлів, без `.superpowers`). Прогнано цільові тести (під локом): `rules-modules`, `catalog`, `initial-rules`, `SystemSection`, `useCampaignModules`, `rules-presets-contract`, `templates/validate`, `lib/onboarding` — 14 файлів / 125 тестів зелені. Повний прогін, tsc і eslint — за гейтом контролера.

Підсумок: **0 Critical, 2 Important, 7 Minor.**

## Critical

Немає.

## Important

**I1. Селект ключа губить явні `modules`, і форма може «залипнути брудною».** `components/rules/sections/SystemSection.tsx:49` — `form.set('system', { key })`.
Сценарій: `homm` з явним `modules: ['morale']` (після будь-якого перемикання Ч16 набір завжди явний). ДМ відкриває селект, обирає `dnd5e`, тоді знову `homm`. `changes.system = { key: 'homm' }`, а `server.system = { key: 'homm', modules: ['morale'] }`. Через це:
- `useRulesForm` (`same(changes.system, server.system)`) вважає форму брудною, хоча ключ той самий. Перемикачі модулів вимкнені з підказкою «Збережіть або скасуйте».
- `RulesForm` рахує вкладки з `form.data.system = { key: 'homm' }`, тобто з повним пресетом HoMM. Форма показує вкладки `skilltrees`, `heroScaling` та інших модулів, яких на сервері немає. Якщо ДМ змінить щось у такій вкладці й натисне «Зберегти», `rulesetPatchSchemaFor` (будується з поточної композиції сервера) відкине секцію: `strictObject` поверне 400 `INVALID_RULES`.

Виправлення: `onValueChange={(key) => form.set('system', key === <server>.system.key ? <server>.system : { key })}`. Альтернатива: порівнювати в `dirtyKeys` для `system` лише `key`. Тест: вибрати інший ключ і повернутися → `isDirty === false`, вкладки ті самі, що й до вибору.

**I2. Зміна лише `key` обходить гейти бою й підтвердження. Захищає тільки `SYSTEM_LOCKED`.** `lib/server/campaigns/rules.ts:121-139`: якщо `keyChanged` і `modules` немає, викликається лише `assertValidSystem`, а `assertModuleChange` (бій, `confirm`) не викликається. Склад модулів при цьому змінюється неявно (на склад пресета нового ключа).
- Наскільки це небезпечно: майже не небезпечно. Ключ можна змінити лише коли `character.count + unit.count === 0` (`SYSTEM_LOCKED`, рядок ~103). Тоді `confirm` не потрібен за визначенням, бо персонажів немає.
- Активний бій без персонажів і юнітів можливий: `battle_participants.sourceId` — м'яке посилання без FK. ДМ стартує бій, видаляє всіх юнітів/героїв кампанії й міняє ключ (наприклад `homm` → `wfrp`). Учасники з `snapshot` d20 опиняються в бою з правилами іншої бази. Ймовірність мала, але це рівно той випадок, від якого мав захищати 409 `SYSTEM_MODULES_IN_BATTLE`.
- Виправлення: викликати `assertModuleChange` для будь-якої зміни системи: `if (modules || keyChanged) { …; await assertModuleChange(tx, …, next, confirm === true) }`. `moduleChange` уже враховує `current.key !== next.key`. Тест: активний бій, 0 персонажів/юнітів, PATCH `{ system: { key: 'dnd5e' } }` → 409 `errors.systemModulesInBattle`.

## Minor

**M1. Прев'ю асистента не перевіряє набір при зміні лише ключа.** `lib/server/assistant/actions/content-operation-preview.ts:124`: `assertValidSystem` викликається лише за `patch.system?.modules`, а сервер перевіряє також при `keyChanged`. Зараз ключ обмежений схемою, тож розбіжність теоретична. Для паритету краще та сама умова, що й у `rules.ts:124`.

**M2. Підтвердження `setup` у прев'ю/AI.** AI-інструмент `update_rules` може сам передати `confirm: true`. Прев'ю відкидає `confirm` і нічим не позначає, що пропозиція вимикає модуль, який змінює героїв. Схвалення пропозиції людиною формально і є підтвердженням, але в прев'ю варто показати попередження про `setup` (або хоча б записати це в `ai.md`).

**M3. Клієнт питає підтвердження для кампанії лише з юнітами.** `lib/hooks/campaigns/useCampaignModules.ts:77`: умова `setup && data.systemLocked`, а `systemLocked` рахує персонажів + юнітів. Сервер (`modules.ts`) вимагає `confirm` лише за персонажів. Наслідок — зайвий діалог, шкоди немає. Можна додати у вигляд `hasCharacters` або змиритися (тоді записати в коментар/звіт).

**M4. Текст підтвердження неточний для `skilltrees`.** `messages/{uk,en}/rules.json:232` (`confirmBody`) каже «змінює розрахунок здоров'я та прогресію» для будь-якого `setup`-модуля. «Дерева навичок» здоров'я не міняють. Варто зробити текст загальним («змінює розрахунок наявних героїв») або дати окремий текст на модуль.

**M5. a11y: причина недоступності не озвучується.** `components/ui/switch-field.tsx:39`: `description` (тут разом із підказкою `requires/conflicts/requiredBy`) не пов'язаний зі `Switch` через `aria-describedby`. Скрінрідер читає лише назву вимкненого перемикача. Підказку `dirtyHint` (`SystemSection.tsx`) так само не пов'язано. Виправлення в `SwitchField`: `aria-describedby={description ? `${id}-desc` : undefined}`. На 375 px розмітка (`flex items-center gap-3`, текст переноситься) коректна.

**M6. Експорт у наявний пакет ігнорує `modules` кампанії.** `scripts/templates/lib/export-command.ts:64`: для ключа з `listPackKeys()` береться `readManifest(key)`, і `bundleToPack` перезаписує `system.modules` модулями маніфесту. Кампанія з іншим набором експортується в пакет мовчки зі старим набором. Варто хоча б попередити, коли `campaignModules` ≠ `manifest.modules`.

**M7. Створення з `options.source` мовчки ігнорує `system`.** `lib/server/campaigns/create-campaign.ts:232`: схема забороняє `system` разом із `templateId`, але `options.source` (підготовлене джерело) іде повз схему. Тоді `campaignData` бере правила бандла, а `system` губиться без помилки. Зараз таких викликів зі `system` немає. Достатньо явного 400 або коментаря-контракту.

## Перевірено, зауважень немає

- **Гейти патча.** 422 `SYSTEM_MODULES_INVALID` з `issues[].path = ['system','modules']` спрацьовує до `mergeRules` (П1 закрито). 409 `SYSTEM_MODULES_IN_BATTLE` враховує лише `ACTIVE`. 409 `SYSTEM_MODULE_CONFIRM` діє на ввімкнення й вимкнення та несе `params.module`. Ідемпотентний патч (той самий набір, зокрема неявний → явний) проходить без перевірок.
- **Транзакційність.** `withCampaignContentWrite` бере `SELECT … FOR UPDATE`. `prisma` у `rules.ts` — скоупований проксі, що всередині контексту запису йде в `tx`. Читання, лічильники й запис іде під одним локом, тож дві паралельні зміни модулів серіалізуються. Гонка зі стартом бою (старт не бере лок) — прийнятий ризик 1 дизайну, його треба занести в `rule-systems.md`.
- **D16.** `writeOverRaw` зберігає неактивні секції. `confirm` не потрапляє в JSON: відкидається в `rules.ts` і прев'ю, а `writeOverRaw` пропускає не-записи. Параметризований тест вимкнути/ввімкнути для кожного addon-а зелений.
- **Імпорт компендіуму.** `rulesPatch` з `RulesetPatchSchema` іде через `updateCampaignRules` (`repository.ts:678`), тож гейти діють.
- **`rules.get` з `composition`.** Тип `CampaignRulesView.composition?` узгоджений. Гравцям склад модулів віддається, і це не секрет.
- **Створення без шаблону.** `initialRules` пише явні `modules` (П4). Пресети d20/homm/wfrp проходять контракт (база не задає секцій addon-ів) і паритет із порожніми пакетами. `handleApiError` зберігає статус і `issues` для `ContentError`.
- **Клієнтська безпека.** `catalog.ts` (meta + константи) безпечний для клієнта. `initial-rules`/`rules-presets` імпортуються лише сервером і тестами, циклу з `schema.ts` немає (П6).
- **Маніфест і `template validate`.** `modules?` є і в типі, і в схемі. Є три перевірки: склад, рівність із `rules.json`, активність `kinds` (через `PACK_KIND_CONTENT`).
- **Онбординг.** Запис `whats-new` першим, ключі `whatsNew` і `help.dm-rule-systems.s9` + `summary` є в обох локалях. Ключі `errors`/`validation`/`rules` збігаються uk/en 1:1, ICU-параметри відповідають `CompositionIssue` (`module`/`detail`). `validation.*` для `SYSTEM_MODULE_CONFIRM` має прецеденти (`LAIR_*`, `TRACK_*`).
- **Межі.** Ratchet-файли (`system-imports-exempt.json`, `system-literals-exempt.json`, `i18n-exempt.json`) у diff відсутні. Новий корінь `rules-presets.ts` доданий у `ROOT_SPECS` і `SYSTEM_ROOTS`. Core не називає систем.
- **Права.** Патч — `NEED.write` (ДМ), гравцю 403. Сторінка правил ДМ-only, тож окремий read-only режим перемикачів не потрібен.
- **Інвалідація.** Предикат `invalidateCampaignExceptRules` коректний для наявних ключів (`campaign-rules` ≠ решта). `router.refresh()` оновлює серверні layout-гарди.

## Для контролера

- I1 та I2 — малі правки з одним тестом кожна, можна одним fix-агентом (Sonnet).
- Docs ще не оновлені: `rule-systems.md` (патч, гейти, `initialRules`, `RULES_PRESETS`, `composition`, ризик гонки зі стартом бою), `content-api.md`/`ai.md`, `STATUS.md`, а також пункт runbook Ч13 «бекфіл пропускає явні `modules`».
