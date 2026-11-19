# WFRP 5e канон: хвости W0–W2 і W3 (передача в наступну сесію)

Гілка: `feat/wfrp5-canon-w0-w1` (W0+W1+W2, **усе не закомічено**, не змерджено, не запушено; без пушу/мерджу без «так» власника). Основний план: [2026-11-19-wfrp5-canon-mechanics.md](2026-11-19-wfrp5-canon-mechanics.md), аудит: `docs/superpowers/research/2026-11-19-wfrp5-canon-audit.md`. Канон: `~/Work/wfrp-extract/out/wfrp5/pages` (лише перефраз, цитата ≤12 слів, номери сторінок). Правила: reuse-пошук, англ. мінімальні коментарі, канон-тести з сторінкою книги (`bookExample(page, …)`), агенти тести не запускають, наприкінці `test:related` + eslint по папках + `pnpm cycles`.

## Стан W2 (зроблено в коді)

- `percentile/advantage.ts` `resolveModeSources` (пари скасовуються, зайве джерело ±1 SL, с. 130); `resolveOpposed` приймає `attackerModes`/`defenderModes`; дальній бій і `cast-test` під `advantageModel: 'reverse'`: Fortune «sl» = Advantage.
- Профіль `editionOf`: нові поля `advantageModel` (`slBonus`/`reverse`), `fortunePools` (`single`/`split`).
- Momentum на учасника (`momentum?: true` у `WfrpParticipantState`, `combat/momentum.ts`: `hasMomentum/withMomentum/loseMomentum/spendMomentum`); виграш/програш протиборчого тесту в `resolve-attack.ts`; втрата при шкоді (`lose-channelled.ts`) і при накладенні стану (`conditions/apply.ts`). Легасі (`side`) без змін.
- Пули: `characteristics.fortune?` (макс. Fortune; без нього = `fate`; хелпер `fortuneMax`), `resources.fate` (поточна Fate, core: `types/characters.ts`, `resources/schema.ts`, `rest.ts`), `state.fate`, редакція `fate` для ворогів, `sheetBlock.fortuneMax/fateLeft`.
- Core: `ResolvedAttack.targetUpdate` + застосування в `lib/utils/battle/attack/process/run.ts`.
- Тести: `systems/wfrp/__tests__/canon/advantage-momentum.test.ts` (37/37 canon зелені), `pnpm cycles` 0 SCC, eslint без помилок.

## ТЕРМІНОВО першим кроком

1. `resolve-attack.ts` було випадково обнулено й відновлено з виводу `cat` (бази W1 у git немає). Перевірити файл побіжно: `git diff` проти очікуваного; прогнати `systems/wfrp/rules/combat/__tests__` і `systems/wfrp/__tests__/lib`.
2. `pnpm test:changed` пройшов: 2091 файл зелений, помилки були лише через відсутній імпорт `fortuneMax` у `sheet-block.ts` (виправлено) і знімок `d12/sheet-wfrp.json` (оновлено: +`fortuneMax`, +`fateLeft`); після цього `systems/wfrp`, `lib/utils/characters`, `lib/server/characters` зелені. Лишилось перепрогнати `test:changed` один раз перед комітом і `pnpm exec tsc --noEmit` (з `NODE_OPTIONS=--max-old-space-size=8192`, стандартний запуск впав на OOM).
3. Закомітити W0+W1+W2 окремими комітами (після «так» власника на комміт, якщо питання; пуш/мердж — лише за «так»).

## Хвости W0–W1 (з STATUS)

- `attackTarget` у контракті (`wfrpAttackTarget`) не знає редакції: UI підпис цілі лишається характеристикою.
- Психологія, простій, корупція досі `slModel: 'clamped'` (закриває W5/W6).
- `InitiativeRules` не типізує `edition` (береться з повного rules у рантаймі).
- `assistant-cleanup-cron.test.ts` падає без БД (не наш).
- Не виконано: повний `test:run`, battle-sweep homm/dnd5e на prodcopy (раз після W1–W4), живий прогін WFRP-бою в браузері на стенді гілки (стенд не розгорнуто).
- Наприкінці епіка: `/simplify`, оновити `docs/architecture/rule-systems.md` і `docs/STATUS.md` (додати W2), Opus-рев'ю гілки, деплой окремо.

## Хвости W2 (не зроблено)

1. **Fate витрата (M08)** — нова бойова операція за зразком `channel` (`systems/wfrp/server/index.ts` `operations`, `server/battle/*-mutation.ts`, `lib/api` + хук): режими
   - `notFail` («I Will Not Fail», с. 133): замість кидка обрати успіх, у протиборчому +1 SL мінімум; крит → вибір локації. Найпростіше як вхід атаки/тесту; `FORTUNE_INPUT` — єдиний слот `wfrp` у `ctx.system`, тож треба або розширити його `kind`, або об'єднати вхід;
   - `notToday` («Not Today»): замість смерті — вибуття з сутички (хук `onZeroHp`/операція), без подальшої участі;
   - `howDidThatMiss` («How Did That Miss?»): скасувати ефекти атаки після кидка до шкоди/крита — потребує вікна реакції (дивись `counter-window` mutation) або відкату останньої дії; рішення дизайну потрібне.
   Журнал, видимість лише власнику, дельта-відповіді; уживання зменшує `resources.fate` через `state.fate` + `wfrpPersist`.
2. **Витрата Momentum** (с. 163, 167, 169): друга атака, Disengage, Leadership-передача: зараз лише `spendMomentum` без дії/UI; підв'язати під W4 (M09 дії/рух).
3. **Fortune «зняти один стан»** і Fortune-reroll за каноном (перекид будь-якого результату, можна повторювати), поки reroll лише після провалу.
4. **Sheet-тест** (`sheet-test.ts`): джерела Advantage (Fortune) не передаються; додати `fortune`-вхід до `SheetRollBody` або лишити на W4.
5. **UI**: підпис кнопки Fortune у `D100RollPicker` («+1 РУ») під canon5e мав би читатися «Перевага»; `momentum.spent` у `PercentileResultLines` під canon5e означає «перевага», а не витрату; показ Fate/Fortune окремо в `HeroStats`/`RestBadges` (є `fortuneMax`, `fateLeft`), редагування Fortune max/Fate у редакторі героя.
6. **Core clamp**: `editResources` клампить `fortune` за `fateMax` (=Fortune max у wfrp); для `patch.fate` (DM-правка Fate) потрібен `fateLimit`/поле в `limits`, поки патча `fate` у `ResourcesEditBody` немає.
7. **Міграція**: коду не потрібно (fortune ?? fate); пакети `grim-d100*` і race-profiles: додати `fortune` до даних видів, де відрізняється (p27, p29: людина Fate 4 / Fortune 3 тощо), разом із W6/контент-хвилею.
8. i18n: нові ключі `battleWfrp.log.fortuneAdvantage`, `battleWfrp.…usedAdvantage` додані; ключі для Fate-операцій і підписів — разом із пунктом 1; `whatsNew` запис для Advantage/Momentum/Fate.
9. `win-chance.ts`/`hit-model.ts` (баланс) не враховують Advantage і Momentum-на-учасника: оцінка шансу при `advantageModel: 'reverse'`.

## W3 — Рани, крити, стани (M03, M10, M20, M21, M22, M23, M35, M04; після W1/W2)

Читати: аудит `A/M03, M04, M10, M20–M23, M35`, с. 170–178 (рани, крити, смерть), 184–187 (стани), с. 185 (Bleeding). Усе під `canon5e`, легасі не чіпати.

- Wounds без авто-Unconscious; Critical Wound лише при `damage > currentHp`; кожне влучання на 0 HP → крит, +10 за кожну зайву Wound; лічильник критів > TB → смерть за TB раундів.
- Схема крит-таблиць до `max > 100` + ефект `death`; тривалі травми; крит-кидок за подвоєнням захисника; Bleeding тест (с. 185).
- Стани: штраф у SL (`mod = −max(level)` між станами, не сума), Stunned = ½ Move без втрати дії, Prone/Blinded/Surprised/Ablaze/Poisoned за с. 184–187; тік Poisoned, хуки переходів, SL-зняття.
- Локації: розвести arm/leg на L/R. Міграція: відсоткові модифікатори станів → SL у даних/стані.
- Зачіпає: `combat/on-zero-hp.ts`, `crit-table.ts`, `crit-effect.ts`, `conditions/*`, `combat/location.ts`, `data/templates/grim-d100*/crit tables`, `battle.md` (спільний бойовий пайплайн: sweep homm/dnd5e обов'язковий після W3–W4).
- Acceptance: канон-тести на прикладах книги (сторінка в назві); регрес `battleWfrp`; нічого в d20/homm.
- Порядок: спершу визначити `editionOf` поля (`woundModel`, `conditionModel`) у профілі, потім хвиля даних, потім пайплайн.
