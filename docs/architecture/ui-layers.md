# Шари UI

Імпорт іде лише вниз. Межі перевіряє ESLint `ui-layers/zone` (таблиця зон — `scripts/shared/ui-layers.mjs`) і `lib/__tests__/ui-layers.test.ts`; тести (`__tests__`, `*.test.*`) і `lib/i18n/test/**` з перевірки виключено.

## Карта шарів

| Шар | Теки | Приклади |
|---|---|---|
| L0 `ui` | `components/ui` | `Button`, `ResponsiveDialog`, `action-bar`, `portal-class` |
| L1 `hud` | `components/hud` | `HudPage`, `HudForm`, `fonts`, `metal` |
| L2 `common` | `components/common` | `ImageUpload`, `states/*`, `SearchInput`, `IconUrlField` |
| L3 домени | `components/<домен>`, `components/systems` (шов: `registry`, `types`, `compose`) | `battle`, `characters`, `units`, `dice`, `show/world`, `scenario/page`, `ai/settings` |
| L4 системні | `systems/<id>/ui`, `systems/<id>/hooks` | `systems/d20/ui/stats`, `systems/wfrp/ui/creation` |
| L5 сторінки | `app/**` | `page.tsx` (сервер, `PrefetchedQuery`), `*-client.tsx` (композиція) |

`lib/**` не імпортує `components/**`.

## Що дозволено

| Шар | Може брати | Не може |
|---|---|---|
| `ui` | `ui`, `@/components/hud/fonts`, `@/components/hud/surface`, `hud/hud.css`, `@/lib/utils` (корінь, `cn`), `lib/utils/common`, `lib/hooks/common` | інші `hud`/`common`/домени, `@/types/*`, `lib/api`, `lib/server`, `systems` |
| `hud` | `ui`, `hud`, ті самі `lib` | `common`, домени, `@/types/*`, `lib/api`, `lib/server`, `systems` |
| `common` | `ui`, `hud`, `common`, `@/types/theme`, `lib/utils/{common,text}`, `lib/hooks/common`, `lib/constants` | доменні компоненти й типи, `lib/api`, `lib/server`, `systems` |
| системний UI | `ui`, `hud`, `common`, `components/systems/types` і кіт (нижче) | будь-який інший core-компонент |
| `lib` | усе, крім `components` | `@/components/*` |

## Кіт core-UI для систем

Явний список `SYSTEM_UI_KIT` у `scripts/shared/ui-layers.mjs` (без barrel-файлів: barrel у клієнтському чанку тягне всі модулі). Імпорт дозволений лише дослівно за цим шляхом:

- `character-profile/ProfileContext` (дані листа), `character-profile/CombatRow`
- `rules/RulesSection`, `rules/NumberField`, `rules/RulesPaths`
- `battle/hud/DiceInput`, `battle/wizards/attack/shared`, `battle/participants/Section`
- `skill-tree/progression`, `spells/book/SpellBookPages`, `characters/rest/CharacterPickList`

Новий пункт кіта = правка списку (видно в ревʼю) + рядок тут.

## Де що лежить

- Компонент — у теці свого домену; віджет двох доменів — у теці власника даних. `common` без доменних типів і компонентів.
- Хук даних/мутацій — `lib/hooks/<domain>`. Презентаційний хук (i18n, Canvas, реєстр) може жити поряд із компонентом, якщо його читачі в тій самій теці (`useBackgroundFacts`, `use-badge-labels`, `use-system-battle-ui`).
- `page.tsx` — сервер і `PrefetchedQuery`; `*-client.tsx` — композиція без внутрішніх компонентів (орієнтир ≤ ~150 рядків; виняток — `dm/world/page-client.tsx`, одна композиція хука).
- Системний d20-UI живе в `systems/d20/ui`, а не в core; нейтральні імена в контрактах слотів (`monsterStats`, `armorStats`).
- Кубики — `components/dice`; `ActionBar` — `components/ui/action-bar`; `ImageUpload` — `components/common`; `ThemeProvider` і `PaletteSwitcher` — `components/layout`.

## Допущене й відкладене

- Цикли на рівні тек: `characters` ↔ `character-profile` (один домен «персонаж»), `spells` → `battle/fx`. Файлових циклів немає (`import/no-cycle`).
- Відкладено в E3/Ч19: FX → `components/fx`, UI видів контенту модулів (`classes`, `backgrounds`, `skills`, `main-skills`, `skill-tree`, `artifact-sets`), мораль-FX, компоненти з пропсами > 7.

## Ratchet

`ui-layers-exempt.json` (`{ file, reason }`) = `[]`. Тест падає, якщо порушник не в списку, або запис уже чистий. Новий запис — лише з рішенням власника.
