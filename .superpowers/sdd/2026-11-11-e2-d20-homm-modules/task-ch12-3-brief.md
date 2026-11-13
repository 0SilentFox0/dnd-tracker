# Ч12 С3 — тексти модулів у бою за композицією (`battleMorale`) і `isFiveE` у двох місцях

Прочитай `common-ch12.md`, `part12-design.md` («С3», В5, В10, В11, В15, П6) і звіти `task-ch12-{1,2}-report.md`. Мета: namespace бою вантажаться за складом модулів кампанії (тексти вимкненого модуля не вантажаться), бюджет перевіряє `scope-size`; два core-читачі `isFiveE` питають базу.

## Коміти

1. **`feat(ch12): system i18n scopes follow the composition`**
   - `lib/i18n/system-scope.ts`: `systemScope(system: string | { key: string | null; modules?: readonly string[] } | null, slot)`:
     - рядок → як зараз (`metaOf(key)`), щоб не чіпати наявних викликачів (`app/campaigns/[id]/layout.tsx`, сторінки персонажа, `dm/rules` — не редагувати);
     - обʼєкт → обʼєднання `i18n[slot]` (або `i18n.pages[slot]`) мети ключа (`metaOf`) і мет **усіх модулів композиції** (`composition(system)` і `moduleMetaOf` з `lib/utils/rules/systems/catalog.ts` — лише імпорт), без дублів, у порядку композиції; невідомий ключ → `[]`.
   - Новий `lib/server/systems/campaign-system.ts` (`import 'server-only'`): `systemOfCampaign = cache(async (campaignId: string): Promise<{ key: string | null; modules?: string[] }>)` — сирий запит за зразком `lib/server/campaigns/system-key.ts` (`SELECT rules->'system' AS system FROM campaigns WHERE id = ${campaignId}`), розбір без `zod`: `key` — рядок або `null`, `modules` — масив рядків або відсутній. Файл `system-key.ts` не чіпати (Ч16; злиття — Ч17).
   - `app/campaigns/[id]/battles/layout.tsx`, `app/campaigns/[id]/dm/battles/layout.tsx`: `systemScope(await systemOfCampaign(id), 'battle')`.
   - Перевір інші місця, де рендериться UI бою зі своїм скоупом (`components/battle/demo/DemoBattleSandbox.tsx` — `rg -n "DemoBattleSandbox|ExtendLocaleScope" app components`): якщо там скоуп бою задається окремо — додай модулі тим самим способом або запиши у звіт, чому не потрібно.
   - Тест `lib/i18n/__tests__/system-scope.test.ts`: `'wfrp'` → містить `battleWfrp`; `{ key: 'dnd5e' }` → без модульних namespace; `{ key: 'dnd5e', modules: ['morale'] }` і `{ key: 'homm' }` → з namespace моралі (після коміту 2; у цьому коміті — фікстурна мета або тест додається в коміті 2); рядок `'homm'` (старий шлях) → як до зміни.
   - Тест для `systemOfCampaign` не потрібен, якщо він лише сирий запит; кейс розбору (`modules` не масив → відсутній) — винеси розбір у чисту функцію поруч і протестуй її.

2. **`refactor(ch12): morale battle texts live in battleMorale`**
   - Нові `messages/uk/battleMorale.json` і `messages/en/battleMorale.json` (Write): вміст блоку `battle.morale.*` (обидві мови) + `badge` (= `battle.hero.morale`), `unchanged` (= `battle.notify.moraleUnchanged`), `strip` (= `battle.turnControls.strip.gate`, лише якщо С2 перевела смугу на `Label`; інакше ключ лишається в core — див. звіт С2).
   - З `messages/{uk,en}/battle.json` ці ключі видалити (Edit, по одному блоку; перевір, що JSON лишився валідним).
   - `systems/morale/meta.ts`: `i18n: { battle: ['battleMorale'] }`. Тип `SystemNamespace`/`Namespace` підхопить новий namespace автоматично (`lib/utils/rules/systems/meta.ts:72-77`, `lib/i18n/config.ts:74-78`) — перевір, що `messages`-loader бачить файл (наявні тести ключів вимагають обидві мови).
   - Модульні компоненти й хук С2 (`systems/morale/ui/battle/*`, `systems/morale/hooks/useMoraleRoll.ts`) → `useTranslations('battleMorale')` / нові ключі.
   - `lib/i18n/__tests__/scope-size.test.ts`: для кожної бази додати скоуп «`<key>` battle + modules» = поточний скоуп бою бази + battle-namespace **усіх addon-ів**, сумісних з базою (`requires` містить базу), ліміт — `budgetKb.battle` бази або `LIMIT_KB`. Якщо core-бюджет `LIMIT_KB` для d20 тепер має запас — число не зменшуй (лише зафіксуй у звіті виміряне значення).
   - Тести: кейси з коміту 1 для `battleMorale`; наявні тести компонентів моралі — нові ключі.
   - Тексти моралі в `battleLog.*`, `battleCommon.*` (`morale_skip`), `battleDm.*` лишаються core (В5).

3. **`refactor(ch12): off-hand and spell ability modifier ask the d20 base`**
   - `lib/utils/rules/systems/types.ts`: `RuleSystemCombat.offHand?(attacker: BattleParticipant): boolean`; `RuleSystemMagic.spellAbilityMod?(caster: BattleParticipant): { mod: number; label: string } | null`.
   - d20 (`systems/d20/index.ts` / `systems/d20/rules/...`): `offHand: isFiveE`; `spellAbilityMod`: для `isFiveE(caster)` — те, що сьогодні рахує приватний `weaponModifier` (`lib/utils/battle/spell/power.ts:38-46`), інакше `null`. Якщо `weaponModifier` після цього не має core-читачів, крім `spellAttackBonus` (`:48-53`), — лишити його в core (його читає `spellAttackBonus`), а d20 викликає експортовану версію.
   - `lib/utils/battle/attack-phase/request.ts:185`: `data.offHand && !ruleSystemOf(rules).combat.offHand?.(attacker)` (`rules` уже в скоупі, див. `:179`).
   - `lib/utils/battle/spell/power.ts:110`: `input.addAbilityMod ? (ruleSystemOf(input.rules).magic.spellAbilityMod?.(caster) ?? null) : null`. `rules` має прийти в `computeSpellPower` через `input` від викликачів (`spell/cast/effects.ts`, `spell/cast/index.ts`, `scripts/sim/hero-growth-report.ts`); якщо для цього треба протягнути `rules` більш ніж через 3 файли — **зупинись, лиши `power.ts` як є**, звіт.
   - `LEAK_NAMES.isFiveE` = фактичне число core-файлів після коміту (очікування 10 або 11).
   - Тести: `systems/d20/__tests__/rules/...`: `offHand` для 5e-учасника `true`, для героя без класів `false`; `request` у wfrp/d6pool відхиляє `offHand` (`OFF_HAND_NOT_ALLOWED`) як і раніше; `computeSpellPower` з `addAbilityMod` — для 5e-кастера рядок модифікатора є, для героя — немає (≡ старому).
   - Поведінка ≡ (sweep не має змінитися).

## Не чіпати

- Решту `isFiveE` (В11) — Ч17. `systemKeyOfCampaign`, `app/campaigns/[id]/layout.tsx` (В15).

## Готово, коли

- `tsc` чистий (під локом); prettier+eslint по зачеплених файлах чисті.
- `rg -n "battle\.morale|moraleUnchanged|hero\.morale" components lib systems -g '!**/__tests__/**'` — порожньо (окрім `battleLog`).
- Тести написано (не запускались, або точково — з результатом).
- Ratchet: `LEAK_NAMES.isFiveE` додано; exempt без змін; `i18n-exempt.json` без змін.
- Звіт `task-ch12-3-report.md`, окремо: таблиця «ключ старий → ключ новий», виміряні gzip-розміри скоупів (якщо `scope-size` точково запускався), чи вдалося `power.ts`.
