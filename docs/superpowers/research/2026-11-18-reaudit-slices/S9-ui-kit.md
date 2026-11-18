# S9 — UI-бібліотека (re-audit, main d871500da)

## 1. Оцінка
- **UI-kit / reuse контролів: 8.0** (було 6; для генератора карт було 4). Сирих `<button>/<input>/<select>/<img>/<dialog>` поза kit практично немає (1 реальний), правило ESLint активне, kit має Slider/HudToggleChip/HudToolbar. Мінус до 9: kit-примітиви на дрібних місцях не використовуються (див. дефекти), `<label>`/`<details>`/`role=dialog`-оверлеї поза правилом, baseline не чиститься сам.
- **Ціль плану «components/battle ≤ 10 сирих» виконана: 1** (було 100+; baseline 378 -> 3 записи).

## 2. Що змінилося (докази)
Підрахунок сирих тегів (без `__tests__`, поза `components/ui` і `components/hud`):
- `components/`: button 1 (`components/battle/map/MapToken.tsx:75`), details 1 (`components/landing/sections/Faq.tsx:16`), input/select/img/textarea/dialog 0.
- `components/battle`: 1 (лише MapToken). `app/`: 0. `systems/*/ui`: 0 (раніше 5).
- `raw-controls-exempt.json`: 3 записи (MapToken, `components/systems/SystemGate.tsx`, `systems/wfrp/ui/spells/SpellMagicFields.tsx`).
- ESLint: `eslint/raw-controls.mjs` (теги button/input/select/img; файли components, app, systems; ігнор components/ui, components/hud, тести), підключено `eslint.config.mjs:785-789` як `error`. `eslint-disable raw-controls` у репо: 0 (обходів немає).
- Kit: `components/ui` має `slider`, `select-field`, `disclosure`, `switch-field`, `radio`, `tabs`, `tooltip`, `accordion`, `file-button`, `number-input`, `bounded-number-input`, `labeled-input`, `responsive-dialog` та ін.; `components/hud`: `HudButton`, `HudToggleChip`, `HudToolbar`, `OptionButton`, `HudChipTabs`, `HudTile`, `HudStatChip`. `native-select`/`Button bare`/`Input bare` видалені (споживачів 0). Використання поза kit: `HudButton` 140 файлів, `SelectField` 118, `ResponsiveDialog` 89, `HudSection` 76, `Slider` 10, `Disclosure` 19, `Switch*` 31.

## 3. Відкриті дефекти
- **I** `raw-controls-exempt.json`: 2 з 3 записів застарілі. `SystemGate.tsx` і `SpellMagicFields.tsx` не мають жодного сирого тега (SpellMagicFields уже на `SelectField`, :69/:84/:112). Вони ще й виведені з-під правила (exempt = ignore), тож там знову можна додати сирий контроль без помилки. Виправлення: видалити обидва записи, лишити лише MapToken; додати тест, що кожен запис baseline має >=1 сирий тег.
- **I** Правило не покриває `<textarea>`, `<details>`, `<dialog>`, `<label>`. Faq.tsx:16 `<details>` вже поза kit (Disclosure/Accordion існують; для лендингу, що має лишатись статичним, допустимо, але треба явне виключення). `<label>` без Label kit: ~130 входжень у components/systems (SpellGrantEditor, ChoiceKindFields, GraphToolbar, BattleMapPlayground та ін.) — частина обгортає kit Checkbox, але це дрейф до `LabeledInput`/`SwitchField`. Виправлення: додати `textarea`/`details` до RAW_CONTROL_TAGS; лейбли оцінити окремо (M).
- **M** Самописні модальні оверлеї з `fixed inset-0` / `role="dialog"` поза `ResponsiveDialog`: `systems/skilltrees/ui/progression/LevelUpOverlay.tsx:57`, `systems/morale/ui/battle/MoraleResultOverlay.tsx`, `components/battle/overlays/BattleResultScreen.tsx:105`, `components/dice/DiceRoller.tsx:53`, `components/battle/participants/MyHeroPanel.tsx`, `components/battle/dm/DmQuickActionsPanel.tsx` (останній — свідомо, за журналом). Виправлення: якщо сенс «повноекранне оповіщення», виділити kit `FullscreenOverlay`; інакше на ResponsiveDialog.
- **M** Самописні таби (`role="tablist"`): `components/abilities/AbilityChips.tsx:37`, `components/battle/scene/MobileBattleLayout.tsx:93,151` замість `ui/tabs`/`HudChipTabs`/`HudTabs` (останні мають лише 2/19 споживачів — `ui/tabs` майже не використовується: 2 файли).
- **M** `HudToggleChip` використовують лише 5 файлів (усі battle/map). ~30 файлів з `aria-pressed` (SchoolTabs, LevelBookmarks, ShowTransport, TrackList, TilePalettePanel, WorldToolbar, MultiSelectField, ScenarioBar, wfrp D100Input/ConditionTestPanel тощо) мають локальні toggle-кнопки; частина на `HudButton` + `aria-pressed`, тобто вигляд дублюється. Виправлення: перевести на HudToggleChip або задокументувати розрізнення.
- **M** `HudToolbar` лише 2 споживачі (MapTerrainToolbar, MapWeatherPicker); `ScenarioToolbar.tsx`, `GraphToolbar`, `MazeToolbar`, `MapFogToolbar` — локальні тулбари.
- **M** Майже невикористані kit-примітиви: `ui/confirm-dialog` 1 споживач, `ui/tabs` 2, `ui/radio` 3, `ui/popover` 3, `hud/HudTile` 1, `HudTabs` 2, `common/ImportDialog` 1, `common/ToastHost` 1 (останній — це інфраструктура, нормально). Кандидати на злиття/видалення: confirm-dialog vs ResponsiveDialog, HudTabs vs HudChipTabs.
- **M** MapToken:75 `<button>`: обґрунтований (ref/FX-якір), але потрібен коментар-винятка/`eslint-disable` з причиною замість «вічного» baseline.

## 4. Не перевірено
- ESLint не запускався (заборонено): що правило реально проходить на всьому дереві, підтверджено лише грепом і логом. Підрахунок тегів зроблено регулярками; динамічні `React.createElement`/styled-обгортки не враховані.
- Візуальна відповідність після масової міграції `Button bare -> HudButton` («нульова зміна вигляду» за журналом) не перевірялась; регресії a11y/touch-target теж.
- Скільки `<label>` реально лишилось без kit-контролу всередині (оцінка ~130 тегів грубо).
