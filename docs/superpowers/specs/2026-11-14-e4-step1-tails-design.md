# E4 крок 1 — хвости E3: дизайн

Джерело: `2026-11-14-e4-ch25-recon.md`, п. 5. Три незалежні правки без змін БД і формату стану бою.

## 1. Бейдж raincloud: провайдер підписів у `SystemFx`

**Зараз.** `components/fx/runtime/badge-labels.ts` (тип `FxBadgeKey`, `FX_BADGE_VALUES`, `DEFAULT_BADGE_LABELS.raincloud = "-2 morale"`) і `components/fx/use-badge-labels.ts` (`t('raincloud', {value})` з `spells.fx.badges`, uk «−{value} мораль»). Читачі: `BattleFxLayer` (має проп `fx?: SystemFx`) і `SpellBattlePreviewPanel` (без системи; пісочниця `PREVIEW_RULES`). Анімація `animations/raincloud.ts` бере `labels.raincloud`. `SystemFx` (`lib/utils/battle/fx/system-dice.ts`) зараз має лише `dice`.

**Дизайн.**
- Новий `lib/utils/battle/fx/badges.ts`: сюди переїжджають `FxBadgeKey` і `FX_BADGE_VALUES` (без змін значень); `components/fx/runtime/badge-labels.ts` імпортує їх звідти (лишає `FxBadgeLabels`, `DEFAULT_BADGE_LABELS`). Причина: `SystemFx` у `lib/utils` не може імпортувати `components`, а `systems/morale/ui` не може імпортувати `components/fx` (зона «системний UI»).
- `SystemFx` (`system-dice.ts`) + барель `lib/utils/battle/fx/index.ts`:
  ```ts
  /** Module text for a badge; replaces the neutral core label. */
  badges?: Readonly<Partial<Record<FxBadgeKey, TextRef>>>;
  ```
  (`TextRef` з `@/types/text`; числа модуль бере з `FX_BADGE_VALUES`, тож функція не потрібна.)
- `composeUi` (`components/systems/compose.ts`): `dictionaries: [..., 'fx.badges']` — два модулі з тим самим ключем дають `CompositionError duplicate key`, а не «replaces without a claim».
- `useFxBadgeLabels(fx?: SystemFx)`: для кожного ключа `fx?.badges?.[key]` → `useText()(ref)`, інакше core-переклад, як зараз. `BattleFxLayer` передає свій `fx`; `SpellBattlePreviewPanel` — без аргументу (нейтральний текст; превʼю — d20-пісочниця без композиції кампанії, рішення F-17 Ч19 це вже фіксує).
- Нейтральний core: `messages/uk/spells.json` `fx.badges.raincloud` = «−{value}», `en` = «-{value}»; `DEFAULT_BADGE_LABELS.raincloud` = `` `-${FX_BADGE_VALUES.raincloud}` ``. Інші бейджі (thorns/rust/…) не чіпаємо.
- Модуль: `systems/morale/ui/fx/badges.ts`: `export const moraleFxBadges = { raincloud: textRef('battleMorale.fxBadge', { value: FX_BADGE_VALUES.raincloud }) }`; `MORALE_MODULE_UI.fx = { dice: [moraleDiceSource], badges: moraleFxBadges }`. Ключ `battleMorale.fxBadge`: uk «−{value} мораль», en «-{value} morale» (namespace уже в `meta.i18n.battle`, вантажиться в скоупі бою; `textRef` типізований через `AppMessageKey`). Кирилиця лише в JSON — ESLint не зачеплено.

**Тести.** (a) `components/fx/__tests__/use-badge-labels.test.tsx` (happy-dom, `lib/i18n/test/intl-wrapper`, en): без `fx` → `raincloud === '-2'`; з `fx.badges.raincloud` → `'-2 morale'`; інші ключі незмінні. (b) `systems/morale/__tests__/ui/fx/badges.test.ts`: склад d20+morale через `composeUi` має `fx.badges.raincloud.message === 'battleMorale.fxBadge'` і `fx.dice` довжини 1. (c) `components/systems/__tests__/compose.test.tsx`: два аддони з `fx.badges.raincloud` → `duplicate key "raincloud" in fx.badges`. `label-keys-battle.test.ts` (`spells.fx.badges.raincloud`) лишається зеленим. Ratchet: записів немає. Документи: `rule-systems.md` (абзац «UI-слоти Ч23») і `ui-layers.md` (рядок про мораль-FX) — додати `fx.badges`.

## 2. `namespacesIn`: runtime-читання `meta.ts`

**Зараз.** `scripts/shared/systems-index.ts:58-88` вирізає `i18n: {…}` дужками й регулярками (`budgetKb` — окремою регуляркою); синхронний, викликається з `ROOT_SPECS[global.d.ts].lines`. Усі 9 `systems/*/meta.ts` мають лише `import type` (правило в `rule-systems.md`, але не перевіряється).

**Дизайн.**
- Чиста функція `i18nNamespaces(i18n: SystemI18n): string[]` у новому `lib/utils/rules/systems/i18n-namespaces.ts` (лише `import type`); `systemNamespaces()` у `meta.ts` переходить на неї (одне джерело правила «слоти + pages, без budgetKb»).
- `CORE_NAMESPACES` виноситься з `lib/i18n/config.ts` у `lib/i18n/core-namespaces.ts` без імпортів; `config.ts` імпортує й реекспортує. Генератор не може імпортувати `config.ts`: той тягне згенерований корінь `SYSTEM_META`, який на момент генерації може бути застарілим.
- `export async function namespacesIn(root, ids): Promise<string[]>`: для кожного id
  1. текст `meta.ts`; якщо є імпорт не-типу (`/^\s*import\s+(?!type\b)/m`) → `Error("systems/<id>/meta.ts: only \`import type\` is allowed")` — це й тримає `--check` швидким і детермінованим (жодних побічних залежностей; tsx транспілює ~9 файлів-даних);
  2. `await import(pathToFileURL(file).href + '?t=' + mtimeMs)` (query — щоб тести, які переписують файл, не отримали кеш), береться `mod[\`${upper(id)}_META\`]`; нема → `Error("systems/<id>/meta.ts: missing export <ID>_META")`;
  3. `i18nNamespaces(meta.i18n ?? {})`; збіг з `CORE_NAMESPACES` → `Error("systems/<id>/meta.ts: i18n namespace \"<ns>\" duplicates a core namespace")`.
  Результат — dedupe + sort, як зараз (спільний namespace між системами дозволено).
- Async лише в одному місці: `syncSystemsIndex` один раз рахує `namespaces = await namespacesIn(root, ids)` і передає в `render`; `BlockSpec.lines` змінює сигнатуру на `(ids, ctx: { root; namespaces })`. `system-ratchet.ts` читає лише `spec.file` — не зачеплено.

**Тести** (`lib/__tests__/systems-index.test.ts`): фікстура пише `export const <ID>_META = {};` замість `export {};`; тест «global.d.ts gets…» перейменовує `A`/`B` на `ALPHA_META`/`BETA_META` (очікування ті самі, `budgetKb` ігнорується); нові: core-namespace (`battle: ['spells']`) → помилка з id і namespace; value-імпорт у meta → помилка; відсутній `<ID>_META` → помилка; `the real tree is up to date` лишається. Якщо vitest не імпортує `.ts` з `os.tmpdir()`, фікстури — у `node_modules/.cache/systems-index-*` репо. Новий `lib/utils/rules/systems/__tests__/i18n-namespaces.test.ts` — 2 кейси (слоти+pages, без budgetKb). Ratchet: нічого.

## 3. `ZoomablePortrait`: 8 → 6 пропсів

**Зараз.** `components/battle/hud/ZoomablePortrait.tsx`: `extends PortraitProps` (7: `participant, size, current, me, extra, className, fx`) + `flashKey`. Два батьки: `MyHeroPanel.tsx:84` (`participant, fx, size, me`) і `ParticipantDetails.tsx:151` (`flashKey, participant, fx, size, className`). `current`/`extra` не передає ніхто.

**Рішення: звузити тип, а не прибирати `flashKey`.** `flashKey` потрібен: він перезапускає лише анімацію `Portrait`, діалог зуму лишається відкритим; `key` на самому `ZoomablePortrait` закривав би зум при кожному влучанні (регресія). Групування `current/me/extra` зачепило б `Portrait` і всіх його викликачів.
```ts
interface ZoomablePortraitProps extends Omit<PortraitProps, 'current' | 'extra'> {
    flashKey?: string;
}
```
Лічильник `lib/__tests__/helpers/props-budget.ts` розуміє `Omit` у `extends` → 6. Видалити рядок `components/battle/hud/ZoomablePortrait.tsx#ZoomablePortrait` з `props-budget-exempt.json` (`pnpm exec tsx scripts/shared/props-budget.ts --write`, перевірити, що змінився лише цей рядок). Батьки без змін. Тест — `lib/__tests__/props-budget.test.ts`.

## Задачі для Sonnet-виконавців (послідовно, один worktree)

| # | Обсяг | Файли | Межі |
|---|---|---|---|
| **A** | п. 1 | `lib/utils/battle/fx/{badges,system-dice,index}.ts`, `components/fx/runtime/badge-labels.ts`, `components/fx/use-badge-labels.ts`, `components/fx/BattleFxLayer.tsx`, `components/systems/compose.ts`, `systems/morale/ui/{index.ts,fx/badges.ts}`, `messages/{uk,en}/{spells,battleMorale}.json`, 3 тести, 2 абзаци docs | не чіпати анімації й інші бейджі; без нових namespace |
| **B** | п. 2 + п. 3 | `scripts/shared/systems-index.ts`, `lib/i18n/{core-namespaces,config}.ts`, `lib/utils/rules/systems/{i18n-namespaces,meta}.ts`, `lib/__tests__/systems-index.test.ts`, новий тест; `ZoomablePortrait.tsx`, `props-budget-exempt.json` | `meta.ts` систем не правити; генерований вивід (`global.d.ts`, корені) має лишитись байт-у-байт |

Порядок: A → B (незалежні за файлами; послідовно, щоб гейти не бігли паралельно). Гейти кожної задачі: `pnpm exec tsc --noEmit`; `pnpm cycles`; `pnpm systems:index --check` (для B — також `git diff --exit-code global.d.ts lib/utils/rules/systems components/systems lib/server/systems` після `pnpm systems:index`); `pnpm exec eslint --fix <торкнуті файли>`; `pnpm test:related <торкнуті не-тестові файли>` + нові тести через `pnpm test:run <file>` (для B явно `lib/__tests__/systems-index.test.ts lib/__tests__/props-budget.test.ts lib/__tests__/system-contract.test.ts lib/i18n/__tests__`). Повний `pnpm test:run` — лише наприкінці E4. Без комітів/пушу — за рішенням контролера.
