# План: i18n leftovers

Spec: `docs/superpowers/specs/2026-10-30-i18n-leftovers-design.md`. Виконавці — Sonnet; `git add` лише своїх шляхів; перевірки лише на торкнутих файлах (`eslint --fix`, `tsc`, `test:related`); коміт з трейлером `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`; worktree `../dnd-tracker-leftovers`, перед git-кроком `git branch --show-current` = `feat/i18n-leftovers`.

## T1 — збережені ефекти (крити + стани)

Файли: `lib/constants/{critical-effects,save-critical-effects}.ts`, `lib/utils/battle/conditions/registry.ts`, `lib/utils/battle/attack/{critical,process/compute}.ts`, споживачі `CriticalEffect.name/description` і `CONDITION_5E_REGISTRY[..].label/description`, `types/battle.ts` (`ActiveEffect.description: LogLine`), `lib/utils/battle/view/effect-summary.ts`.

0. Compat-аудит: перелічити всіх читачів `ActiveEffect.name/description` (grep по `components`, `lib`, AI-дайджест, схеми); результат — у `.superpowers/sdd/2026-10-30-i18n-leftovers/progress.md`. Розв'язок за spec, рішення 1.
1. Видалити `name`/`description` з `CriticalEffect` і таблиць; `applyCriticalEffect` → `name` id, `label: critNameRef`, `description: dynamicTextRef(...description)`; `compute.ts:213` steps label → `critNameRef`.
2. Registry: прибрати `label`/`description` рядки; `conditionEffectInput` → `name: key`, `label`/опис через `dynamicTextRef`; перевірити, що ключі `battleCommon.conditions.<key>.{label,description}` є в uk/en (дописати, якщо нема).
3. Усі місця, що порівнюють ефект за `name` (видалення, дедуп, `effect-summary` ключ), мають працювати і зі старими uk-іменами, і з новими id. Тести: новий ефект має id-name + label; старий збережений (uk-рядки) показується як є; `label-keys-battleTerms`/`-battleCommon` зелені.
4. Прибрати три `eslint-disable`. Коміт. Спец-перевірка: `snapshotHash` не залежить від локалі (існуючі тести).

## T2 — групи і fallback-довідники (spells, playlist, ungrouped) — один виконавець

- `spells.ts` + `lib/utils/spells/spells.ts` (+ споживачі `groupSpellsByGroupAndLevel`/`sortSpellLevels`/`convertGroupedSpellsToArray`): групування за числовим рівнем, підпис при рендері; видалити `spellLevelFromName`/ordinals. Тести: сортування рівнів, форма заклинань групує за рівнем.
- `playlist-groups.ts` + `battle-titles.ts`: id груп нейтральні, ключове слово — у `lib/constants/track-title-conventions.ts` + `i18n-exempt.json`; тести фільтра/назв без змін поведінки (HoMM-назви в БД читаються як раніше).
- `ungrouped.ts`/`group-units.ts`: рішення 4.
- Коміт на пункт; прибрати disable.

## T3 — LEGACY_THREAD_TITLE + імпорт + LocaleSwitcher — один виконавець

- `scripts/db/rename-legacy-ai-threads.ts` (dry-run, `--apply`; лише `UPDATE ai_threads SET title = NULL WHERE title = 'Новий тред'`; звіт кількості) + тест чистої частини, якщо є. Константу НЕ видаляти (рішення 3), оновити причину в disable.
- `unit-parsing.ts`/`types/import.ts` → `import-aliases.ts`; тести uk/en аліасів (є/додати).
- `LocaleSwitcher` → `native-language-names.ts` + `i18n-exempt.json`.

## T4 — docs + повна перевірка (оркестратор/виконавець)

`i18n.md` («ESLint-храповик», перелік винятків), `STATUS.md` (відкат ≥ ч.7; скрипт threads чекає запуску на проді; якщо T1 ішов у два кроки — «деплоїти окремо»), `battle.md` (формат збережених ефектів: name-id + label). Один раз: повний `test:run`, `tsc --noEmit`, `lint`, перед ним `ps` на heavy-процеси.

## T5 — браузер (Sonnet-субагент, scale 0.5, JS/text-перевірки)

Бій з критами і станами uk/en (новий ефект + ефект зі старим uk-рядком у prodcopy), плейлист груп музики, форма заклинань (групи за рівнем), тред AI (untitled). Потім одне Opus-рев'ю `git diff origin/main...HEAD` і fix-хвиля.
