# Ability UX: наступні етапи (handoff)

Етап 1 («Ability flow») злито локально в `main` (merge `feat/ability-ux`, не запушено). Спек і план етапу 1 — в архіві: [spec](../../archive/superpowers/specs/2026-10-29-ability-flow-design.md), [plan](../../archive/superpowers/plans/2026-10-29-ability-flow.md). Цей файл — стартова точка для нової сесії.

## Поточний стан (що вже є)

- **Сегменти.** Кожен `describe*` реєстру повертає `Segment[]` (`{ key, params }`, `lib/utils/abilities/segments.ts`); текст рендериться на межі через `renderSegment`/`joinSegments`/`linesText`. Ключі — `summary.*` у `messages/{uk,en}/abilityRegistry.json`; підписи реєстру (`effects.<kind>.label`, `flags.<flag>`, `fields.<name>`, `options.*`) — там само. Набори ключів uk/en мають збігатися (тести).
- **Зведення.** `summarizeAbility` (`lib/utils/abilities/summary.ts`) → `AbilityFlowSummary { when, if, then, limits }`; це йде в payload сторінок, рендер — на клієнті.
- **UI.** `AbilityFlow` / `AbilityFlowList` (`components/abilities`) — чіпи «Коли → Якщо → Тоді → Ліміти» на картках; `AbilityChips`; редактор вмінь із чіпами. `useAbilityText()` (`components/abilities/use-ability-text.ts`) — хук-обгортка: `effect`, `segments`, `flows`, `lines`.
- **Тригери.** `TRIGGER_GROUPS` (`registry/triggers.ts`) — групи always/boundaries/myTurn/incoming/outgoing/other, використовуються в селекті редактора й у картках.
- **i18n.** `lib/utils/abilities/**` у `i18n-migrated.json` (кирилиця під ESLint). Виняток — файли зі списку `I18N_LEFTOVERS` у `eslint.config.mjs`; перелік рядків і план — [leftovers](2026-10-29-ability-flow-leftovers.md) (для i18n ч.6: лог бою).
- **Spell-only ефекти** (inputDice, grantCast, hitRider, anchoredZone, summonInline, transform, moveSelf, createTerrain, chooseOne) описуються в `registry/effects/describe-spell-only.ts`, ключі `summary.spellOnly.*`.
- Архітектура: [abilities.md](../../architecture/abilities.md), [i18n.md](../../architecture/i18n.md).

## Етап 2 — редактор

Рецепти / галерея шаблонів, секції, що згортаються, форма заклинання (спільні компоненти з `components/spells/form/effects`). Спершу окремий спек: `superpowers:brainstorming` → спек → план.

## Етап 3 — перегляд класів, рас, рис, підкласів

Часова шкала класу (рівень → вміння), перегляд рис/рас/підкласів через `AbilityFlowList`. Теж спершу спек (brainstorming → спек → план).

## Поза обсягом (поки)

Перейменування тригерів/ефектів; зміни схеми `Ability`.

## Відкриті пункти

- Живу перевірку в браузері редактора й карток не проводили (потрібне локальне середовище).
- Англійські формулювання потребують вичитки: «+2 action», «cooldown 3 r.», лапки «» в en.
- Сирі типи шкоди `physical`/`all` у resistance/dealDamage показуються без перекладу.
- `useAbilityText` лежить у `components/abilities` — розглянути перенесення в `lib/hooks`.
- uk-каталог, який імпортує `lib/utils/abilities/log-text.ts`, потрапляє в клієнтські бандли; у ч.6 текст журналу бою перевести на сегменти з перекладом у вʼю логу.
- Payload зведень ≈ 2× за розміром — розглянути скорочення/інтернування ключів.
- `FieldRenderer`: каст, коли `owner` відсутній.
- 239 попереджень ESLint, що були до гілки.
- У Task 1 не додавали whats-new, бо зміна візуальна (перевірити, чи потрібен запис після етапів 2–3).
