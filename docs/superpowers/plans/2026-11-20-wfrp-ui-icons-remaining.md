# WFRP UI-іконки (4B): що лишилось після merge (2026-11-20)

Гілка `feat/wfrp-ui-icons` змерджена fast-forward у локальний `main` (77cbfc8bc), не запушена. Доставлено: 48 inline-SVG у `systems/wfrp/ui/icons`, шов `ui:<key>` (`SystemUi.uiIcons` → `EffectIcon`). Перевірено в тій сесії: `pnpm cycles` 0, eslint 0 errors, `test:related` (521 файл) зелений, контактний лист 24/64 px.

## Підключено в UI (2 з 8 груп)
- `conditions` (12): `SystemConditionsDialog`, ефекти станів через `icon: "ui:<key>"`.
- `passions` (3) і `psychology` (2): `PsychologyPanel` (frenzy/animosity/release).

## Іконки є, але ніде не відображаються (6 груп, 28 шт.)
Це не баг, а відсутнє підключення; перевірено grep: споживачі лише `SystemConditionsDialog` і `PsychologyPanel`.
- `sizes` (7): розмір істоти (токен, картка, редактор ефектів/трейтів). Редактор зараз текстовий generic select у core.
- `resources` (8): advantage, momentum, fate, fortune, resilience, resolve, corruption, sin — панелі битви/листа героя.
- `hitLocations` (6): зони влучання в UI атаки/критів/броні.
- `testOutcomes` (5): critical-success/failure, fumble, wrath, miscast — лог битви, діалог результату.
- `hero` (5): status-brass/silver/gold, endeavour, career-tick — лист героя/кар'єра.

## Не зроблено (за STATUS)
1. Жива перевірка в бою: WFRP-битва з реальним бекендом (next start, не dev), 24/64 px, світла й темна палітра.
2. Повний `pnpm test:run`.
3. `/simplify` на diff (1–2 агенти).
4. Фінальне Opus-рев'ю.
5. Розміри/психологія в редакторі ефектів лишаються текстовими (generic select у core) — потрібен слот core-UI kit або `uiIcons`-lookup в селекті.
6. Не звірено візуально 20 намальованих іконок (sizes 7, hitLocations 6, entangled, prone, sin, critical-failure + варіанти stunned/frenzy/corruption): на контактному листі лише 24/64 px.

## Рекомендований порядок
Підключити 6 груп у відповідні панелі (reuse `useSystemUiIcon`, без назви системи в ядрі) → live-run → test:run → simplify → review. Не змішувати з епіком механік; окрема сесія/гілка від `main`.
