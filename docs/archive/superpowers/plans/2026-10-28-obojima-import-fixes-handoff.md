# Handoff: Obojima import fixes (станом на 2026-10-28)

Worktree `../dnd-tracker-obojima`, гілка `feat/obojima-import-fixes` від main `9b4a7300`. План: `2026-10-28-obojima-import-fixes.md`. Нічого не запушено й не змерджено. Локальна БД `obojima` готова (`postgresql://postgres:postgres@localhost:54322/obojima`). Prod/Vercel/Storage не чіпати.

## Зроблено (коміти)

- **A** `502ee9a1` `50a1cea0` `c355976c` `cbe5884a`: ліміт запису, порожній classSource, хибний LOCAL_CONFLICT (`managedProjection` для масивів без id), `CLASSES_MODE_REQUIRED` + `recommendedRulesPatch` + mixed-edition warning. Хвіст: UI не показує `recommendedRulesPatch` окремо (чекбокс «Увімкнути класи 5e» його застосовує).
- **B** `561e57c3` `328181f0` `dee624a7` `58008726` `eb20ae5f`: парсер атак без подвоєння модифікатора (зберігається залишок statblock − модифікатор рушія; хелпери в `lib/utils/units/monster-attacks.ts`), 101/104 `{@atk}` (97,1%), multiattack-кількість, захисти як passive `flag: resistance` (nonmagical → вся фізична шкода + `MONSTER_NONMAGICAL_APPROX`), saves, legendary, spellcasting, `battleSpeed()`, `hp.special`, `coreTrait()` (Magic Resistance/Regeneration). B6: 77/77 юнітів, 0 помилок у бою, 32/32 літунів зі швидкістю.
- **C1–C2** `28e5c036` `845c17a6` `dbde1867`: спільний derive в `lib/utils/spells/derive`, cast-поля в `cost/casting` + заголовок опису (колонки castingTime/range/... застарілі, не використовувати), школи з кольором/іконкою. **18/50 native (8 механічних + 10 наративних), 32 manual з причинами `MANUAL_SPELL_<REASON>`.**

## У роботі на момент handoff

Агент (Sonnet) виконує **C3 + D4 + D5** (каст native-заклинань у бою + тести по типах механіки; предмети consumable/unique:false/ефекти; прив'язка optionalfeature до власника). Він сам комітить у гілку. Перед стартом перевірте `git log dbde1867..HEAD` і `git status`; якщо коміти C3/D4/D5 є й дерево чисте — пакет завершено; якщо дерево брудне або комітів немає — агент ще працює/обірвався, дочекайтесь або доробіть відсутнє.

## Відкриті рішення користувача

1. Чи рахувати 10 наративних заклинань native (18/50) чи manual (8/50)? Зараз native з попередженням `SPELL_NARRATIVE_ONLY`.
2. Прийняти 36% замість ≥80% (причини: summon, зброя, зони, аури, книжковий стан «pacified» — рушій не має ефектів; без book-specific правил) чи окрема епопея з розширенням рушія.

## Лишилось

- **D1–D3**: раси (ASI, розмір, швидкість, зір, мови → структура + `modifyStat`), бекграунди (спорядження/гроші, інструменти, `originFeatId`), риси (prerequisites, `additionalSpells`, `resist`).
- **E1** (попередження виключених записів не в `nextActions`; прибрати сирий JSON із нотаток), **E2** (синтетична міні-фікстура «obojima-like» + інтеграційний тест: цикл, ідемпотентність, 0 висячих refs). Є готовий env-gated `lib/server/compendium-import/__tests__/real-file.integration.test.ts` (`COMPENDIUM_REAL_FILE`), прив'язує spell-refs до локального SRD-шаблону й вручну створює заглушку Thorn Whip.
- **E3**: скрипт-звіт покриття за 8 критеріями приймання на реальному файлі, числа в `docs/STATUS.md`.
- **E4**: живий прогін через Sonnet-субагента (ДМ імпортує через UI, бій монстрів Obojima проти героя, каст заклинання, лист героя Obojima) + браузер.
- Наприкінці: один Opus-ревю на гілку, `/simplify` на diff, оновити `docs/architecture/content-api.md` і `docs/STATUS.md`, архівувати spec/plan у `docs/archive/superpowers/`. **Мердж і пуш — лише з явного дозволу користувача.**

## Правила процесу

Українська з користувачем. Виконавці — Sonnet, без ревю на кожну задачу, один Opus-ревю наприкінці. Цільові тести (`pnpm test:related`), повний `test:run` один раз перед мерджем. Тести лише з синтетичними фікстурами, реальний файл `~/Downloads/1985 Games; Obojima - Tales from the Tall Grass.json` у репо не копіювати. Імпортер generic, без book-specific overrides. Завершених субагентів зупиняти TaskStop.
