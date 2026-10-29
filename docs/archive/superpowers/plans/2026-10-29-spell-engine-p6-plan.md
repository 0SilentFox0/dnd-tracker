# План: рушій заклинань, фаза P6 (криті spell-атак, редактор спел-only ефектів, видалення власних станів)

Дата: 2026-10-29. Гілка `feat/spell-engine-coverage` (worktree `../dnd-tracker-spells`, HEAD `6e97a7de`, P1–P5 готові, 50/50 native). Попередній план: [`2026-10-28-spell-engine-coverage-plan.md`](2026-10-28-spell-engine-coverage-plan.md); журнал SDD: `.superpowers/sdd/2026-10-28-spell-engine-coverage-plan/progress.md` (git-ignored).

Рішення користувача (не переглядаємо): (A) крит-вибір ДМа діє й на атаки заклинанням, включно з авто-реакцією Rageful Nimbus; (B) кожен спел-only вид має власну форму в редакторі заклинання замість картки «Невідомий ефект», тексти — ключами i18n (uk+en); (C) ДМ видаляє власні стани кампанії на `/dm/rules`, але лише ті, що ніде не використовуються; інакше бачить, де саме.

## 0. Правила для виконавців (Sonnet, одна задача = один dispatch, по черзі)

- TDD: спершу тест, потім код. Перевірка задачі — **лише** `pnpm test:related <змінені файли>` (або `pnpm exec vitest run <тест-файли>`), `pnpm exec eslint <змінені файли>`, `pnpm exec tsc --noEmit`. **Повний `pnpm lint` заборонено** (висить). Повний `pnpm test:run` — один раз, у T6.7.
- **Без міграцій**: усе в наявних JSON-колонках (`campaigns.rules`, `spells.spellEffects`, `battle_participants.snapshot`). Жодного `prisma migrate`.
- **Без `git stash`** (stash спільний для всіх worktree). Коміт наприкінці кожної задачі, лише свої файли (`git add <шляхи>`), рядок `Co-Authored-By` з reminder-а.
- Інваріанти `docs/architecture/battle.md`: snapshot лише через `saveBattle`; шкода → одразу `applyDamageConsequences` (`applyFlowDamage`); зняття ефектів — `removeEffects`; усі кидки — `ctx.rng`/`state.rng`; **ключ crit-тригера стабільний (`source:actor:target:n`), кожен тригер споживає рівно один `rng()` через `CritPicker`, нова гілка не кидає нічого до виклику пікера, чого не кидала б при повторі за seed**.
- Шари CLAUDE.md: `route.ts` тонкий; запити — `lib/api/<domain>.ts`; дані/логіка — хуки `lib/hooks/<domain>/` (ключі в `keys.ts`); компоненти лише викликають хук і рендерять; `useConfirm`/`useNotify`, не `window.confirm`.
- i18n (`docs/architecture/i18n.md`): нові UI-тексти — ключі в `messages/{uk,en}/<ns>.json`; не-React код віддає ключі; помилки API — `API_ERRORS` → `errors.*` (обидві мови, тест `api-errors-coverage`); нові каталоги, де немає кирилиці, — у `i18n-migrated.json`. Лог бою лишається українським.
- Reuse перед написанням: `EffectCard`/`FieldRenderer`/`components/abilities/fields/*` (поля), `AbilityEditorProvider` (помилки за шляхом), `HudSection`, `UnitPickerField`, `ResponsiveDialog`, `QueryState`. Новий компонент лише там, де наявні поля не покривають форму даних.
- Коментарі — мінімальні (лише «чому»).

## 1. Звірка з кодом (2026-10-29)

1. **i18n і whats-new є лише в `main`.** База гілки `6f3beac5`: `NAMESPACES` = `common, validation, errors, auth, landing`; `whats-new.ts` — старий формат (`title`/`body` українською). У `main` (`1dd4e777`, +78 комітів) — namespace-и `onboarding`, `whatsNew`, `help`, `LocaleScope` у `app/campaigns/layout.tsx`, `API_ERRORS` як ключі, `WhatsNewEntry` без тексту (ключі `whatsNew.<id>`). Перетин змінених файлів — 26 (зокрема `api-errors.ts`, `whats-new.ts`, `registry/effects/*`, `schema/effects.ts`, `rules/schema.ts`, `attack/process/run.ts`, `tool-schemas.ts`, OpenAPI-тести). Без злиття `main` ні B, ні whats-new en за правилом CLAUDE.md не зробити → **T6.0 = merge `main` у гілку** (не push, не merge у `main`).
2. **A — вже є:** `runWithCritChoice` (`lib/utils/battle/crit-choice/run-with-crit-choice.ts`) обгортає `attack-mutation` і `spell-mutation`; `castSpell` отримує `crit` і кладе в `flow.ctx.crit`; `runAutoReactions` (`spell/auto-reaction.ts`) уже передає `crit: flow.ctx.crit` у реакційний каст; гейт (`gate.ts`) дає ключ і рівно один `rng()`; `CritChoiceDialog` підписує тригер іменем `t.actorId` (реакція покаже носія). **Бракує:** `resolveSpellAttack` (`spell/cast/outcome.ts`) не викликає пікер і не застосовує ефекти таблиць атаки (`CRITICAL_SUCCESS_EFFECTS`/`CRITICAL_FAIL_EFFECTS`); на нат. 20 лише подвоює кубики (`critDoublesDice`).
3. **A — повтор:** пауза зберігає `request` + `seed`; повтор — `mulberry32(seed)`. Скриптовий `ctx.rng` на першому прогоні повторюваний лише якщо дорівнює `mulberry32(seed)` (прийом із `crit-pending.test.ts:144–152`). Атака заклинанням у `spell-mutation` має пресет `data.attackRolls` — нат. 20 у тесті детермінований; реакція кидає d20 з `flow.ctx.rng`.
4. **A — поза гейтом лишаються** (як зараз для рятівних): атаки зон/аур (`zone-fire.ts`: `trigger.attack`, без критів узагалі), `hit-spell.ts`, `turn/berserk.ts`, `move`/`turn-start` тригери. Без пікера (`flow.ctx.crit` немає) spell-атака бере випадковий ефект через `randomCritEffect` — паритет із `attack/roll.ts:68–72`.
5. **B:** `SpellFormEffects` рендерить `EffectCard` з `EFFECT_REGISTRY`; спел-only види (`SPELL_ONLY_EFFECTS` у `lib/utils/spells/model/schema.ts`: `chooseOne, inputDice, grantCast, hitRider, moveSelf, createTerrain, anchoredZone, summonInline, transform`) там відсутні → `EffectCard` показує «Невідомий ефект» з JSON. `SPELL_ONLY_KINDS` (`spell/cast/state.ts:87`) — окремий ручний список без `chooseOne`. Поля `dealDamage.byDistance` (`distanceDice`) і `delayIfBeyond.feet/perRoundFeet` уже в реєстрі `dealDamage` (`registry/effects/index.ts:77`), `escapeDc`/`onlyIfAffected` — у `applyCondition`, `linkedToCondition` — у `dot`, `damageThreshold` — прапор у `FlagEditor`. Нема редактора для `targeting.zone` тригерів (`terrain/side/onEnter/onTurnStart/onExit`) — **поза P6** (див. ризики).
6. **B — баг `delayIfBeyond`:** `setAtPath` (`lib/utils/abilities/editor.ts:123`) після очищення обох полів лишає `delayIfBeyond: {}` → схема падає без заповнених полів; з одним полем — сире «Required» без пояснення.
7. **B — мова редакторів:** реєстр ефектів, `EffectCard`, `describeEffect` і `SpellFormEffects` — українські літерали і в `main` (не мігровані, `i18n.md`: «клієнтські форми редакторів ще не мігровані»). Нові форми — на ключах у новому namespace `editors`; старі частини не мігруємо.
8. **C:** `RulesetSchema.conditions.custom` (`lib/utils/rules/schema.ts:58`), `mergeRules` (`:212`) лише додає/замінює за `key`. `PATCH /rules` — content-операція `rules.update` (`lib/server/content/operations.ts:37`, `operationRoute`), сервіс `updateCampaignRules` (`lib/server/campaigns/rules.ts`, `withCampaignContentWrite`). `useRulesForm` (`lib/hooks/campaigns/useRulesForm.ts`) шле **цілу секцію** `conditions` разом із `custom` → після видалення збереження форми відродить стан. Активний бій читає правила зі **знімка** `battle_scenes.rules` (`store/load-battle.ts:149`), підготовлений — з кампанії. Стан у snapshot учасника — ефект з `effects[].type === "custom:<key>"` (`conditions/registry.ts:211`).

## Задачі (порядок обов'язковий: спільні файли)

| Задача | Частина | Спільні файли з наступними |
|---|---|---|
| T6.0 | merge `main` | усе |
| T6.1 | A | `outcome.ts`, `critical.ts`, `battle.md` |
| T6.2 | B: каркас + прості види + `delayIfBeyond` | `SpellFormEffects.tsx`, `messages/*/editors.json`, `spell-only-kinds.ts` |
| T6.3 | B: `hitRider`, `grantCast`, `anchoredZone` | ті самі |
| T6.4 | B: `summonInline` + round-trip усіх видів | ті самі |
| T6.5 | C: сервер (патч видалення, «де використовується», API) | `rules/schema.ts`, `api-errors.ts`, `messages/*/errors.json` |
| T6.6 | C: клієнт (api, хук, кнопка) | `messages/*/editors.json`, `useRulesForm.ts` |
| T6.7 | приймання | docs, STATUS, whats-new |

### T6.0: злиття `main` у гілку
- `git merge main` у worktree (не `rebase`, не stash). Конфлікти розв'язувати так: **структура й формат — з `main`** (ключі `API_ERRORS`, `WhatsNewEntry` без тексту, i18n-провайдери), **механіка P1–P5 — з гілки**.
- `lib/constants/api-errors.ts`: кожну нову константу гілки (`BATTLE_SPELL_TARGET_FILTER`, `BATTLE_SPELL_OPTION_REQUIRED`, `BATTLE_SPELL_INPUT_REQUIRED`, `BATTLE_CASTER_PACIFIED`, …; знайти `git diff 6f3beac5 HEAD -- lib/constants/api-errors.ts`) перевести в ключ `errors.battle.<camelName>` + тексти в `messages/{uk,en}/errors.json`; параметри — у `API_ERROR_PARAMS`.
- `lib/onboarding/whats-new.ts`: 5 записів гілки (`2026-10-28-spell-options`, `2026-10-28-book-conditions`, `2026-10-29-temporary-spell-actions`, `2026-10-29-spell-zones`, `2026-10-29-summons-and-transform`) → формат `main` (`{ id, date, audience }`), тексти — `whatsNew.<id>.title/body` у `messages/uk/whatsNew.json` (перенести) і `messages/en/whatsNew.json` (перекласти). Порядок — за датою, новіші вгорі.
- Нові спел-only `Effect.<kind>` у `lib/server/content/tool-schemas.ts` `EFFECT_STOPS` — зберегти обидві сторони. OpenAPI-поріг гілки `160000` у трьох `openapi*.test.ts` лишити; перерахувати розмір і записати в коміт.
- **Тести**: `pnpm exec vitest run lib/i18n lib/constants lib/onboarding lib/server/content lib/utils/abilities lib/utils/rules lib/utils/battle/spell lib/utils/battle/attack lib/server/battles/__tests__/mutations` + `pnpm exec tsc --noEmit`. Тест паритету ключів (`lib/i18n/__tests__/parity.test.ts`) і `api-errors-coverage` зелені.
- Коміт: merge-коміт із переліком розв'язаних конфліктів. Якщо конфлікт у логіці рушія незрозумілий — зупинитись і звітувати (не вгадувати).

### T6.1: крит-вибір для атак заклинанням і авто-реакції (A)
- **Спільний хелпер** у `lib/utils/battle/attack/critical.ts`:
  ```ts
  export function applyAttackCritToFlow(flow: ActionFlow, effect: CriticalEffect, ids: { attackerId: string; targetId: string }, opts: { offTurn: boolean }): void
  ```
  `effect.effect.target === "target"` → `put(flow, applyCriticalEffect(getP(flow, targetId), effect, flow.ctx.round, opts))`, `"self"` → те саме для атакувальника; `next_turn`/без цілі — нічого. `compute.ts:95–102` переписати на нього не треба (там свої копії учасників) — лише якщо це тривіально.
- **`resolveSpellAttack`** (`spell/cast/outcome.ts`): після визначення `crit`/`fumble`/`hit` і **до** кидка `critExtra`:
  ```ts
  const kind: CritKind | null = crit && hit ? "success" : fumble ? "fail" : null;
  const effect = kind && rules.criticals.effects ? pickAttackCrit(state, id, kind) : undefined;
  ```
  `pickAttackCrit` = `flow.ctx.crit?.({ source: "attack", kind, actorId: caster.id, targetId: id }) ?? randomCritEffect("attack", kind, state.rng, disabled)` — рівно один `rng()` в обох гілках. Порядок кидків фіксований: d20 → пікер → `critExtra` (якщо `critDoublesDice`) → `additional_damage` 1d6.
- **Відображення ефектів таблиці атаки на заклинання** (`Outcome`):
  - `double_damage` → `raceMultiplier × 2` (як у рятівних);
  - `max_damage` → `critExtra = diceCount × diceSides − Σ кидків касту` (кубики до максимуму, без подвоєння `doubleDice`);
  - `additional_damage` → `critExtra += 1d6` (`state.rng`);
  - решта з ціллю `target`/`self` → `applyAttackCritToFlow(flow, effect, { attackerId: caster, targetId: id }, { offTurn: state.spell.definition.cost === "reaction" })` (реакція не дає `free_attack`/`combo_attack` дій);
  - `ignore_reactions`, `simple_miss`, `provoke_opportunity_attack` — лише рядок у лозі (немає сенсу для заклинання; задокументувати).
  - Рядок лога: `🎯 <ціль>: <назва ефекту> — <critFlavorFor(..., suffix: "s")>` (як `applySaveCrit`).
  - `state.attacks[]` += `criticalEffectId?: number` (для `BattleAction` деталей, якщо поле вже є в `actionDetails.attack*` — перевикористати, інакше не додавати).
- Авто-реакція (`auto-reaction.ts`) змін не потребує: реакційний `castSpell` отримує `flow.ctx.crit`. Перевірити, що тригер реакції всередині `attack-mutation` дає `pendingCritChoice.action = "attack"`, а повтор через `crit-choice-mutation` відтворює реакцію (той самий `request`).
- **Тести** (`lib/utils/battle/spell/__tests__/spell-attack-crit.test.ts`, `auto-reaction.test.ts`, `lib/server/battles/__tests__/mutations/crit-pending.test.ts`):
  1. spell-атака з пресетом `attackRolls: 20`, `criticals.effects` on, пікер повертає `double_damage` → шкода ×2 відносно без ефекту; тригер `{ source: "attack", kind: "success", actorId: caster, targetId }`, ключ `attack:<caster>:<target>:0`.
  2. нат. 1 → тригер `kind: "fail"`, промах, ефект `prone` (self) на кастері; `criticals.effects` off → тригерів нема, кидків rng стільки ж, скільки до зміни (захист потоку).
  3. `max_damage` при кидках [1,2] на 2к6 → +9; `ac_debuff` на цілі як `activeEffect`.
  4. Без пікера (`crit` undefined) і з effects on → випадковий ефект, рівно один `rng()` (лічильник викликів скриптового rng).
  5. `spell-mutation`, `critChoiceByDm` on, `attackRolls` нат. 20 → `response.pendingCritChoice`, учасники й версія незмінні, у `triggers` є `source: "attack"`; `crit-choice` з вибраним id → ефект застосовано, `pendingCritChoice: null`.
  6. **Реакція Rageful Nimbus** (`attack-mutation` по позначеній цілі): `findSeed(pred)` у тесті перебирає seed 1..5000 з прапором off і `ctx.rng = mulberry32(seed)`, доки лог реакції не містить «атака заклинанням 20» (детерміновано, чистий рушій); далі прапор on + `Math.random` застубовано на цей seed + `ctx.rng = mulberry32(seed)` → pending із тригером `attack:<носій>:<нападник>:0`, нічого не застосовано; повтор із вибором → реакція з обраним ефектом, той самий кидок шкоди, що й у прогоні з прапором off і тим самим вибором «random» (порівняння HP).
  7. Повтор з порожнім вибором дорівнює прогону з прапором off за тим самим seed (регрес гейта).
- Перевірка: `pnpm test:related lib/utils/battle/spell/cast/outcome.ts lib/utils/battle/attack/critical.ts`, eslint на змінених, `tsc --noEmit`.

### T6.2: каркас редактора спел-only ефектів, прості види, `delayIfBeyond` (B1)
- **Єдине джерело видів** (`lib/utils/spells/model/schema.ts`): `export const SPELL_ONLY_EFFECT_KINDS = SPELL_ONLY_EFFECTS.map((s) => s.shape.kind.value)` (типізовано як `SpellOnlyKind[]`); `SPELL_ONLY_KINDS` у `spell/cast/state.ts` будувати з нього мінус `chooseOne` (поведінка без змін, тест `flatEffects`).
- **`lib/utils/spells/editor/spell-only.ts`** (без кирилиці, у `i18n-migrated.json`):
  ```ts
  export type SpellOnlyKind = (typeof SPELL_ONLY_EFFECT_KINDS)[number];
  export const isSpellOnlyKind = (k: string): k is SpellOnlyKind;
  export function newSpellOnlyEffect(kind: SpellOnlyKind): SpellEffect; // мінімальне значення, що проходить SpellEffectSchema
  export const SPELL_ONLY_LABEL_KEYS: Record<SpellOnlyKind, string>; // "spellEffects.kinds.<kind>"
  export function pruneEmpty<T>(value: T): T; // рекурсивно прибирає {} і undefined з об'єктів (не з масивів)
  ```
  Дефолти: `chooseOne` — 2 опції `heal {spellRoll:100}` / `dealDamage {spellRoll:100}`; `inputDice {label:"…", max:20}` (label — порожній рядок не проходить схему → дефолт `"N"`); `moveSelf {to:"adjacentToTarget"}`; `createTerrain {terrain:"difficult", shape:"cell", cells:4, rounds:10}`; `transform {unitId:"", …}` (порожній unitId — валідаційна помилка до вибору юніта, це очікувано); решта — у T6.3/T6.4.
- **`components/spells/form/effects/SpellEffectCard.tsx`** — диспетчер (≤ 7 пропсів): `{ effect: SpellEffect; path: string; actions: { onChange; onRemove? } }`. Базовий вид → наявний `EffectCard` з `kinds = [...allowedEffectKinds(TRIGGER)]` і заголовком-селектом, що містить і спел-only види (зміна на спел-only → `newSpellOnlyEffect`); спел-only → рамка картки (той самий вигляд, що `EffectCard`) + редактор виду з мапи `SPELL_ONLY_EDITORS: Partial<Record<SpellOnlyKind, ComponentType<SpellOnlyEditorProps>>>`; вид без редактора — поточна картка «Невідомий ефект» (зникне після T6.4). Опис під карткою — `describeEffect` (без змін).
  - `SpellOnlyEditorProps<K> = { effect: Extract<SpellEffect, {kind: K}>; path: string; onChange(e): void }`.
  - Поля — через `FieldRenderer` з `FieldMeta`, де `label` — уже перекладений рядок (`t(...)` у компоненті), щоб перевикористати `NumberField`/`SelectInput`/`ToggleField`/`DurationField`/`AmountField`/`UnitPickerField` і помилки за шляхом (`useErrorsUnder`).
- **`components/spells/form/effects/NestedEffectsEditor.tsx`**: список `EffectCard` для `NonRandomEffect[]` з `min`/`max`, кнопкою «+ ефект» і шляхами `${path}.${i}`. `RandomOfEditor` у `EffectCard.tsx` переписати на нього (поведінка й тести `EffectCard.test.tsx` без змін).
- **Редактори виду (B1)**: `ChooseOneEditor` (`NestedEffectsEditor` min 2 max 7, kinds без `randomOf`), `InputDiceEditor` (`label` text ≤ 40, `max` 1..40), `MoveSelfEditor` (лише пояснення, без полів), `CreateTerrainEditor` (select `terrain` wall|difficult, select `shape` cell|line, `cells` 1..20, `rounds` 1..100), `TransformEditor` (`UnitPickerField` для `unitId`, `DurationField`; `revertAtZero` — фіксоване `true`, показати як пояснення).
- `SpellFormEffects.tsx`: `EffectCard` → `SpellEffectCard`; кнопка «+ ефект» лишає базовий вид за замовчуванням.
- **`delayIfBeyond`**: (1) `setAtPath` після запису вкладеного шляху прибирає порожній об'єкт-предок (`delayIfBeyond: {}` → ключ видалено) — загальний фікс для всіх dotted-полів; (2) у `DealDamageSchema.delayIfBeyond` обом полям дати власну помилку на відсутність: `z.number({ error: (iss) => (iss.input === undefined ? "validation.spellDelayPair" : undefined) })…` — тип лишається обов'язковим; ключ `validation.spellDelayPair` («Заповніть обидва поля або жодного» / «Fill in both fields or neither») у `messages/{uk,en}/validation.json`; `SpellFormEffects` перекладає повідомлення помилок через `translateIssue(t, issue)` (некаталожні літерали проходять як є — перевірити `t.has`; якщо ні — перекладати лише рядки з префіксом `validation.`).
- **i18n**: новий namespace `editors` (`lib/i18n/config.ts` `NAMESPACES`; `app/campaigns/layout.tsx` `LocaleScope namespaces` += `editors`); `messages/{uk,en}/editors.json` → `spellEffects.kinds.<kind>`, `spellEffects.fields.<kind>.<field>`, `spellEffects.options.*`, `spellEffects.hints.*`. Каталоги `components/spells/form/effects/**`, `lib/utils/spells/editor/**` — у `i18n-migrated.json`.
- **Тести**: `lib/utils/spells/editor/__tests__/spell-only.test.ts` — кожен `newSpellOnlyEffect` (крім `transform` з порожнім `unitId`) проходить `SpellEffectSchema`; `SPELL_ONLY_EFFECT_KINDS` збігається з дискримінаторами `SPELL_ONLY_EFFECTS`; `lib/utils/abilities/__tests__/editor.test.ts` — `setAtPath` очищення останнього поля прибирає `delayIfBeyond`; схема: лише `feet` → issue з `validation.spellDelayPair` на `delayIfBeyond.perRoundFeet`, обидва → ок. Компонентні (`// @vitest-environment happy-dom`, `components/spells/form/effects/__tests__/`): `SpellEffectCard` з `chooseOne` рендерить 2 вкладені картки, зміна опції викликає `onChange` з валідним значенням; `createTerrain` — зміна `shape`; `transform` — вибір юніта пише `unitId`; базовий `dealDamage` рендериться як раніше; перемикання виду на `inputDice` дає дефолт. Тести перевіряють ключі (`editors.spellEffects…`), не тексти.
- Перевірка: `pnpm test:related` змінених файлів + `components/abilities/__tests__`, eslint, `tsc --noEmit`.

### T6.3: `hitRider`, `grantCast`, `anchoredZone` (B2)
- **Витяг з `SpellFormPowerFields.tsx`**: `components/spells/form/SpellTargetingFields.tsx` — `{ value: { targeting, resolution }; onChange; classesEnabled?; idPrefix }` (селект цілей, шаблон, дальність, фільтр немає — як зараз, рятівний/атака). `SpellFormPowerFields` використовує його; поведінка й наявні тести без змін. Перемикач «Лишає небезпеку» (`zone`) лишається в `SpellFormPowerFields` (inline-касту він не потрібен).
- **`ZoneTriggerEditor`** (`components/spells/form/effects/ZoneTriggerEditor.tsx`): `{ value?: ZoneTrigger; onChange(v?: ZoneTrigger); path; allowPull?: boolean }` — перемикач «увімкнено», перевірка `none | save(ability) | attack(spell)` (взаємовиключні в UI), `NestedEffectsEditor` для `effects` (0..4), `pull: "centre"` лише коли `allowPull`.
- `HitRiderEditor`: `attackKind` select, `extraDice` text (DICE_RE), `damageType` text, `charges` 1..10, `consumeOnMiss`/`expireAtTurnEnd` toggle, `duration`, `target` (self|eventTarget), опційний `save` — ability + `NestedEffectsEditor onFail` (1..3).
- `GrantCastEditor`: `label` ≤ 60, `cost` select (`GRANT_CAST_COSTS`), `uses` 1..20 опційно, `duration`, `target`; блок «Підкаст» = `InlineCastFields`: `SpellTargetingFields` (з `idPrefix` = `path`), `dice` 0..40, `dieSides` select (4/6/8/10/12/20), `addAbilityMod` toggle, `damageBonus` −20..40, `NestedEffectsEditor effects` (1..6), розгортка «Додатково»: `anchorMarkId`, `perObjectFeet` 5..60, `auto.on` select (none|attackAgainstMarked|damageToMarked). Refine `attackNeedsEnemy` показувати на `resolution` (уже в схемі).
- `AnchoredZoneEditor`: `radiusFeet` 5..60, `side` select, `excludeBearer`/`endsWhenStartOutside` toggle, `onEnter`/`onTurnStart` — `ZoneTriggerEditor` (без `pull`), `duration`.
- Дефолти в `newSpellOnlyEffect`: `hitRider {attackKind:"any", extraDice:"1d6", damageType:"fire", charges:1, duration:{rounds:10}}`; `grantCast {label:"…", cost:"action", duration:{rounds:10}, cast:{targeting:{kind:"enemy", range:30}, resolution:{kind:"attack"}, dice:1, dieSides:6, effects:[dealDamage {spellRoll:100}]}}`; `anchoredZone {radiusFeet:10, side:"enemies", duration:{rounds:10}, onEnter:{effects:[dealDamage {spellRoll:100}]}}` — значення з дефолтами мають проходити схему (тест T6.2 розширити).
- **Тести** (компонентні): `GrantCastEditor` — зміна `resolution` на `save` показує ability, `cast.effects` редагується вкладено, результат проходить схему; `ZoneTriggerEditor` — перемикання save→attack прибирає `save`; `HitRiderEditor` — увімкнення `save` дає `onFail` з одним ефектом; регрес `SpellFormPowerFields` (наявні тести `components/spells/__tests__`).
- Перевірка: як у T6.2.

### T6.4: `summonInline` і round-trip усіх видів (B3)
- `SummonInlineEditor`: `name` ≤ 60, `size` select (`SUMMON_INLINE_SIZES`), `ac`: перемикач «= СК заклинання» (`"spellDc"`) або число 1..30, `hp`: перемикач «предмет (без HP)» (`null`) або 1..500, `count` 1..4, `upcastEvery` 1..9 опційно, `duration`; `attacks` (0..2) — `InlineAttacksEditor` (рядок: name, attackBonus −5..20, damageDice, damageType, range опційно; кнопки +/×); `aura` — перемикач + `radiusFeet`, `side`, `onEnter`/`onTurnStart` через `ZoneTriggerEditor`.
- Дефолт: `{name:"…", size:"small", ac:"spellDc", hp:null, count:1, duration:{rounds:10}}`.
- Після цієї задачі `SPELL_ONLY_EDITORS` повний; гілка «Невідомий ефект» лишається лише для справді невідомих `kind` (тест).
- **Round-trip тест** `components/spells/form/effects/__tests__/spell-only-roundtrip.test.tsx`: фікстури — по одному реалістичному значенню на кожен спел-only вид, взяті з виходів розпізнавачів (`lib/server/compendium-import/adapters/spell-patterns/__tests__` — Sprout/Veg Blade `grantCast`, Crustacean `hitRider`, Festival King `anchoredZone`, Forest Guard `summonInline`+`grantCast perObjectFeet`, Beast Transmutation `transform`, Plummet `inputDice`, Butterfly `createTerrain`, Wind Sprint `moveSelf`, Divine Arrow `chooseOne`) + `dealDamage` з `byDistance` і `delayIfBeyond`. Для кожної: (1) `SpellEffectSchema.parse(f)` ок; (2) рендер `SpellEffectCard` без дій → `onChange` не викликано, жодної помилки під карткою; (3) одна зміна числового поля → `onChange(next)`, `SpellEffectSchema.parse(next)` ок і всі інші поля `toEqual` вихідним (редактор не губить невідомі/опційні поля — `anchorMarkId`, `auto`, `perObjectFeet`, `aura`, `upcastEvery`).
- **Тест збереження форми**: `spell-form-defaults`/`SpellEditForm` — заклинання з усіма спел-only видами проходить шлях «завантажити → відкрити форму → зберегти без змін» з ідентичним `spellEffects` (на рівні функцій перетворення форми, без мережі).
- Перевірка: як у T6.2.

### T6.5: видалення власних станів — сервер (C1)
- **Патч** (`lib/utils/rules/schema.ts`): `RulesetPatchSchema` += `removeCustomConditions: z.array(z.string().regex(CUSTOM_CONDITION_KEY_RE)).min(1).max(50).optional()` (поза секціями; `strictObject` дозволяє, бо поле оголошене). `mergeRules(current, patch)`: секції як зараз, потім `custom = custom.filter((c) => !remove.has(c.key))`; невідомий ключ — без помилки (ідемпотентно); `custom` і `removeCustomConditions` з тим самим ключем в одному патчі → issue `validation.rulesCustomConflict`. Тип параметра `mergeRules` розширити (`RulesetPatch`), `parseRulesCached` не мутувати.
- **«Де використовується»** — `lib/server/campaigns/condition-usage.ts` (`server-only`):
  ```ts
  export interface ConditionUsage { battles: { id: string; name: string; status: string; participants: string[] }[]; spells: { id: string; name: string }[]; units: { id: string; name: string }[] }
  export async function findCustomConditionUsage(campaignId: string, key: CustomConditionKey, db = prisma): Promise<ConditionUsage>
  export const isConditionUsed = (u: ConditionUsage) => u.battles.length + u.spells.length + u.units.length > 0;
  ```
  Пошук текстом у БД (egress — лише id/імена): `pattern = '%"' + key + '"%'` (ключ — `[a-z0-9-]`, LIKE-безпечний; тест на це). Три `$queryRaw`:
  - бої: `battle_participants bp JOIN battle_scenes bs` — `bs."campaignId" = $1 AND bs.status IN ('prepared','active') AND bp.snapshot::text LIKE $2` → `bs.id, bs.name, bs.status, bp.snapshot->'basicInfo'->>'name'`, групування в коді;
  - заклинання: `spells WHERE "campaignId" = $1 AND ("spellEffects"::text LIKE $2 OR targeting::text LIKE $2)` (вкладені `chooseOne`/`grantCast`/зони покриваються текстом);
  - юніти: `units WHERE "campaignId" = $1 AND abilities::text LIKE $2`.
  Завершені бої не рахуються (історія). Активний бій має знімок правил — блок там захисний (рішення користувача).
- **Сервіс**: `updateCampaignRules` — якщо є `removeCustomConditions`, усередині `withCampaignContentWrite` для кожного ключа `findCustomConditionUsage`; використовується → `ContentError(API_ERRORS.RULES_CUSTOM_CONDITION_IN_USE, 409, undefined, { name })` (ключ `errors.rules.customConditionInUse`, «Стан «{name}» використовується — спершу приберіть його з боїв і заклинань»; uk+en у `errors.json`, `API_ERROR_PARAMS`). Читання використання — `readCustomConditionUsage(actor, slug)`: `assertCan(actor, need dm)`, ключ `custom:${slug}` валідується регексом (400 `INVALID_RULES` інакше), невідомий у правилах → 404 `RULES_CUSTOM_CONDITION_NOT_FOUND`.
- **Операція й роут**: `CONTENT_OPERATIONS["rules.condition-usage"] = { method: "GET", path: "/rules/custom-conditions/{slug}/usage", need: NEED.read("dm"), response: "object", errors: [404], tag: "Кампанія" }`; `app/api/campaigns/[id]/rules/custom-conditions/[slug]/usage/route.ts` — `operationRoute(...)` у 1 рядок. `rules.update` += `errors: [409]` і опис поля. Перевірити, чи операції автоматично стають MCP-інструментами (`lib/ai/tools/content.ts`) — якщо так, оновити опис; OpenAPI-розмір ≤ 160000 (`openapi*.test.ts`), записати новий розмір.
- **Типи**: `ConditionUsage` — у `types/campaigns.ts` (клієнт і сервер), сервер імпортує звідти.
- **Тести**: `lib/utils/rules/__tests__/schema.test.ts` — видалення прибирає ключ, інші лишаються, невідомий ключ — ок, конфлікт add+remove — issue, старий клієнтський патч без поля — як раніше; `lib/server/campaigns/__tests__/condition-usage.test.ts` (мок `db.$queryRaw`, як інші сервісні тести; integration — лише якщо є `skipIf` локальної БД) — групування учасників по боях, патерн із лапками (`custom:paci` не знаходить `custom:pacified`), лише `prepared`/`active`; новий `lib/server/campaigns/__tests__/rules.test.ts` — 409 при використанні, 200 і стан зник без використання, повторне видалення — 200; роут: не-ДМ — 403, невалідний slug — 400, невідомий — 404.
- Перевірка: `pnpm test:related lib/utils/rules/schema.ts lib/server/campaigns/rules.ts lib/server/campaigns/condition-usage.ts lib/server/content/operations.ts`, eslint, `tsc --noEmit`.

### T6.6: видалення власних станів — клієнт (C2)
- `lib/api/rules.ts`: `getCustomConditionUsage(campaignId, key): Promise<ConditionUsage>` (slug = `key.slice("custom:".length)`), `removeCustomConditions(campaignId, keys)` = `updateCampaignRules(campaignId, { removeCustomConditions: keys })`.
- `lib/hooks/campaigns/keys.ts`: `campaignKeys.conditionUsage(campaignId, key)`.
- `lib/hooks/campaigns/useRemoveCustomCondition.ts` (експорт з `index.ts`):
  ```ts
  export function useRemoveCustomCondition(campaignId: string): { remove(condition: { key: string; name: string }): Promise<void>; isPending: boolean; usage: ConditionUsage | null; closeUsage(): void }
  ```
  `remove`: `queryClient.fetchQuery(conditionUsage, staleTime 0)` → використовується → `usage` у стан (діалог показує список) → стоп; не використовується → `useConfirm()` («Видалити стан «{name}»? Заклинання й вміння, що його накладають, перестануть працювати.») → мутація → `setQueryData(campaignKeys.rules)`; 409 від сервера (гонка) → повторно отримати `usage` і показати його.
- `useRulesForm.save`: з патча секції `conditions` прибрати `custom` (власні стани змінюються лише імпортом/видаленням; інакше застарілий масив форми відродить видалений стан). Тест.
- `components/rules/sections/ConditionsSection.tsx`: кнопка-іконка «Видалити» в кожному рядку (`aria-label` з ключа), `disabled` під час `isPending`; діалог «Де використовується» — `ResponsiveDialog hud` зі списками: бої (назва, статус, учасники; посилання на сторінку бою `/campaigns/[id]/battles/[battleId]` — перевірити наявний маршрут), заклинання (посилання на `/campaigns/[id]/dm/spells/[spellId]`), юніти (посилання на сторінку юніта); `QueryState`-стани не потрібні (дані вже в хуку). Пропси секції не розростаються: хук викликається в секції (`form` + `campaignId` — додати `campaignId` у `RulesFormState` або передати пропом; ≤ 7 пропсів).
- Тексти — `messages/{uk,en}/editors.json` → `customConditions.remove`, `.confirm`, `.usageTitle`, `.usageBattles`, `.usageSpells`, `.usageUnits`, `.statusActive`, `.statusPrepared`. Нові/змінені каталоги без кирилиці — у `i18n-migrated.json` (лише якщо весь файл перекладено; `ConditionsSection` має старі літерали — його не додавати, нові тексти через `t()`).
- **Тести**: `lib/hooks/campaigns/__tests__/useRemoveCustomCondition.test.tsx` (`happy-dom`, мок `lib/api/rules`, `ConfirmProvider`): використовується → confirm не викликано, `usage` заповнено, мутації нема; не використовується → confirm → мутація з `{ removeCustomConditions: ["custom:x"] }`; відмова в confirm → мутації нема; 409 → `usage`. `components/rules/__tests__/conditions-section.test.tsx` — кнопка в кожному рядку, діалог показує бій і заклинання з посиланнями. `useRulesForm` — патч `conditions` без `custom`.
- Перевірка: `pnpm test:related` змінених, eslint, `tsc --noEmit`.

### T6.7: приймання P6
- Документи:
  - `docs/architecture/battle.md`, розділ «Crit choice»: тригери тепер і атака заклинанням (таблиці атаки; відображення `double/max/additional_damage`, ефекти на ціль/кастера, `offTurn` для реакції, no-op ефекти); «Not gated» доповнити (зони/аури — без критів; `hit-spell`, berserk). Розділ «5e: покриття заклинань» — рядок про авто-реакцію з критом.
  - `docs/architecture/content-api.md`: операція `rules.condition-usage`, поле `removeCustomConditions` у `rules.update`, 409, розмір OpenAPI.
  - `docs/architecture/abilities.md`: редактор спел-only ефектів (`SpellEffectCard`, `SPELL_ONLY_EFFECT_KINDS` — єдине джерело), `setAtPath` прибирає порожні об'єкти.
  - `docs/architecture/i18n.md`: namespace `editors` (де вантажиться).
  - `docs/STATUS.md`: рядок «Рушій заклинань…» — P6 готово; відкриті пункти (живий чекліст нижче, редактор `targeting.zone`).
- `lib/onboarding/whats-new.ts`: два записи — `2026-10-29-spell-attack-crits` (`audience: "dm"`, крит-вибір і для атак заклинанням та реакцій) і `2026-10-29-spell-editor-forms` (`audience: "dm"`, редактор усіх ефектів заклинань + видалення власних станів на «Правилах»); ключі `whatsNew.<id>.title/body` в `messages/uk/whatsNew.json` і `messages/en/whatsNew.json`. Допомоги/нового екрана немає — help-статті не потрібні.
- Повний `pnpm test:run` **один раз**; `pnpm exec tsc --noEmit`; `pnpm exec eslint` на всіх змінених файлах фази (`git diff --name-only 6e97a7de -- '*.ts' '*.tsx'`). OpenAPI-тести зелені. Підрахунок покриття Obojima не потрібен (P6 не чіпає імпортер) — лише `scripts/srd/__tests__` зелені.
- Звіт у журнал SDD + перелік для живого прогону.

## Живий чекліст P6 (браузер, окремий Sonnet-субагент після T6.7)

Підготовка: локальна БД `obojima` (кампанія `cmvsnluah0001eymmc4czkotn`, герої `hero-live-mage5e`/`hero-live-fighter5e`), `critChoiceByDm` увімкнено, `criticals.effects` on. Скріншоти масштабовані; де можна — перевірка JS/текстом. Тестові бої після прогону видалити.

1. **Крит spell-атаки (ДМ кастує)**: заклинання з `resolution: attack` (Water Bullet / Vegetable Blade плитка) — повторювати каст до нат. 20 (або ДМ-кидок 20 у діалозі) → у ДМа модалка з тригером «<кастер> → <ціль>: Критична удача», гравець бачить банер очікування; вибір «Подвійна шкода» → у лозі назва ефекту, шкода ×2; нат. 1 → «Критичний провал», ефект на кастері (напр. «Збитий з ніг»).
2. **Крит spell-атаки (гравець кастує)**: те саме з вкладки гравця — майстер касту чекає (`waitingCrit`), після вибору ДМа показує результат.
3. **Rageful Nimbus**: позначена ціль, ворог атакує її → реакція; на нат. 20 реакції — пауза з тригером від імені носія; «Скасувати дію» скасовує всю атаку ворога (одна подія «ДМ скасував дію»).
4. **Редактор**: на `/dm/spells/<id>` для кожного з 10 заклинань Obojima зі спел-only ефектами (Sprout, Veg Blade, Crustacean, Festival King, Forest Guard, Beast Transmutation, Plummet, Butterfly Storm, Wind Sprint, Divine Arrow) — жодної картки «Невідомий ефект»; відкрити → зберегти без змін → у мережевій відповіді `spellEffects` ідентичні; змінити одне поле (кількість зарядів, радіус аури) → зберігається, каст у бою відображає зміну.
5. **`delayIfBeyond`**: у `dealDamage` заповнити лише «Відкласти, якщо далі ніж» → помилка «Заповніть обидва поля або жодного», збереження заблоковане; очистити → помилка зникає, `delayIfBeyond` немає в JSON.
6. **Мова**: перемкнути на `en` — нові форми англійською (старі частини редактора лишаються українськими — очікувано).
7. **Видалення стану**: `/dm/rules` → «Умиротворений» (`custom:pacified`) → «Видалити» → діалог «Де використовується» зі списком Pacify Monster/Person (посилання ведуть на заклинання) і активними боями, якщо стан на учасникові; видалення не відбулося. Створити тимчасовий стан через API/імпорт без використань → «Видалити» → confirm → зник зі списку; змінити інший перемикач секції і зберегти форму — видалений стан не повертається.
8. **390px**: модалка крита, редактор `grantCast`/`summonInline` (вкладені картки не виходять за екран), діалог «Де використовується».
9. **Регрес**: `battle-sweep` на prodcopy (`DATABASE_URL=…/prodcopy pnpm battle-sweep`) — exit 0 або лише відомий flake Maze.

## Ризики

- **R1 (T6.0)**: злиття `main` — 26 спільних файлів, `API_ERRORS` змінили формат; помилка в розв'язанні ламає рушій тихо. Пом'якшення: перелік конфліктів у коміті, широкий vitest-набір у T6.0, повний `test:run` у T6.7.
- **R2 (A)**: додатковий `rng()` на нат. 20/1 spell-атак зсуває потік кидків — скриптові тести/sweep з такими кидками можуть змінити результат. Пом'якшення: тест 2 і 4 в T6.1; фіксувати очікування, а не підганяти seed.
- **R3 (A)**: тест реакції покладається на пошук seed — крихкий при зміні порядку кидків; ліміт 5000 і зрозуміле повідомлення про невдачу.
- **R4 (B)**: обсяг UI великий; вкладені редактори (`grantCast.cast.effects`, тригери аур) легко гублять опційні поля — round-trip тест T6.4 обов'язковий. Редактор `targeting.zone` тригерів поза P6.
- **R5 (C)**: пошук `::text LIKE` по `snapshot` сканує всі учасники активних/підготовлених боїв кампанії (без індексу) — прийнятно на поточних обсягах, лише id/імена в egress; посилання з артефактів/рас/скілів не шукаються (лише бої, заклинання, юніти).
