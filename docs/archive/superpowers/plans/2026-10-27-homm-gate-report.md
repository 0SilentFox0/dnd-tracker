# HOMM-шлюз — звіт (частина 3 передзлиттєвого ревю)

Дата: 2026-10-28. Гілка `feat/constructor`, фінальний HEAD після шлюзу: див. `git log` (останні коміти: `0d922f9d` merge main, `cb5ee910`, `760f2bd5`, `858e56f0`, `030fa7bd`). Backup-теги: `backup/constructor-pre-squash-2026-10-28`, `backup/constructor-pre-main-sync-2026-10-28`. Merge у `main`, push, deploy, зміни prod — не виконувались; prod лише читався один раз (pg_dump схеми `public`, підтверджено користувачем).

## Вердикт

**Регресій, що блокують merge, не знайдено.** Усі пункти шлюзу виконані; відкриті — тільки давні (main) дефекти й minors у backlog. Ревю Opus (merge `0d922f9d` і фінальне `0d922f9d..HEAD`): critical немає, Important виправлено.

## Середовище (докази)

- Prod прочитано один раз → `prodcopy_raw` (схема prod = main `183c4dec`, 27 міграцій). Клони: `prodcopy_base` (еталон, без міграцій гілки), `prodcopy` (міграції гілки: 44, «No pending migrations»), `prodcopy_sweep`, `prodcopy_browser`, `prodcopy_base_sweep`, `obojima_test` (усе локально, Docker `dnd-tracker-db-1`). `scripts/db/prodcopy-db.sh` не запускався напряму: `docker compose exec db` не бачить контейнера з цього worktree — кроки повторені через `docker exec`.
- **Синхронізація з main (за рішенням користувача спершу «паритет проти merge-base», потім «синхронізуйся з мейном»):** гілка відставала на 92 коміти (59 конфліктів) — merge `0d922f9d`, Opus-ревю merge: C1 (disabled крит-ефекти не діяли), I1 (резюме крита для серверних кидків), I2 (крит сейву перебиває Легендарний опір), I3 (coverage) — виправлено `cb5ee910`; питання автора (порядок міграцій, readDmDashboard для шаблонів) визнано прийнятними. Паритет і sweep виконано вже на синхронізованому HEAD з еталоном main `183c4dec`.

## Крок 2 — паритет main `183c4dec` ↔ гілка (HOMM5)

Сутності: 12 героїв, 155 юнітів, 55 заклинань, 24 артефакти (кампанія HOMM5 + дві тестові); 0 помилок виконання; два запуски еталона побайтово однакові. Для кожної: учасник бою, лист, прев'ю атак/DC/шкоди, прев'ю касту, вплив артефактів; фіксований seed (mulberry32 від ключа), `Date` заморожено, нормалізовано лише `createdAt/updatedAt`.

Результат: diff **не порожній буквально**, але **усі числа атак, заклинань, DC, шкоди й модифікаторів збігаються**:
- 15247 розбіжностей — поля, яких не було в еталоні (absent → значення): `abilities.moraleCap`, `creatureType`, `saveProficiencies`, `spellcasting.slotSpells`, `sheet.hitDice/pact/rest`, `slots[].current`, `spellGroup.color/icon`, `castable.fx` (коміти 15a5fc51, 58795cc1, fe06b6fd, 210a9260).
- 1 зміна значення: Айвен `sheet.initiative` 999 → 1014. Це **задокументована, прийнята зміна** (план `2026-10-21-constructor-1a-hardcode-to-data.md`: хардкод імені замінено здібністю `modifyStat initiative +999`, «раніше рівно 999, тепер 999 + база»); порядок ходів не змінюється (Айвен лишається першим). Текст опису скіла («999») розходиться зі значенням листа — косметика, backlog.
- Обмеження покриття: ціль атак/заклинань — завжди перший юніт кампанії, `roll-save` по герою як цілі не перевірявся.
- Артефакти: `/private/tmp/claude-501/.../scratchpad/homm-gate/` (`base.json`, `branch.json`, `diff.txt`, `pdiff.json`, скрипти `scripts/homm-gate/*` — untracked у обох worktree, не закомічені: у `run.ts`/`stub.cjs` 2 lint-помилки).

## Крок 3 — battle-sweep (закриває I4)

`DATABASE_URL=…/prodcopy_sweep pnpm battle-sweep` (клон `prodcopy`; tsx напряму, скрипт відхиляє не-localhost). Гілка і еталон main (на `prodcopy_base_sweep`): **однаково exit 1, 1 помилка, 12 попереджень**; нових збоїв відносно еталона немає. Єдиний збій — перевірка лабіринту `Лабіринт р1: кроки до виходу (≤3 за хід)` (`scripts/sim/battle-sweep.ts:1571`, перевірка :1679): збій самої sweep-перевірки, нестабільний між запусками (у попередньому звіті task-17 падала інша перевірка лабіринту). Решта: 7 фракцій, 8 боїв × 5 раундів, заклинання, контроль юнітів — без помилок. Рефакторинги T2/T3/T4/T7 регресій не показали.

## Крок 4 — живі прогони (локальна копія `prodcopy_browser`, Pusher/Upstash вимкнені)

ДМ aspizhav@ (Browser 1, `localhost:3000`) і гравець — акаунт Browser 2 (silentfox@databet.space), доданий на копії гравцем HOMM5 та власником Айвена (viksam8000@ не був доступний у підключених браузерах).

| Сценарій | ДМ | Гравець |
|---|---|---|
| Лист | PASS (UI = БД) | PASS (UI = БД, DM-розділи недоступні) |
| Бій (3 раунди; мораль, каст, kill/revive) | PASS | PASS (атака нат.20, каст «Корені», кінець ходу) |
| Крит-вибір ДМ (`critChoiceByDm`, вимкнений ефект не пропонується) | PASS (31 шкоди) | PASS («ДМ обирає ефект…», шкода 21) |
| Схованка | через transfer | PASS (`inventory_log`) |
| Передача унікального артефакта | PASS | PASS |
| Level-up | PASS (5→6, слот III 2→3) | PASS (банер, скіл, `seenLevel`) |
| Мобільний 390px | PASS (без горизонтального скролу) | PASS по розкладці |
| Compendium (рестайл) десктоп/390px | — | PASS |

Тестові бої видалено; на копії лишились навмисні зміни (controlledBy, critChoiceByDm, disabledSuccess, ring Айвена → Семгрун, Семгрун L6).

**a11y діалогів (T27) і `assistant-check --run` (T28)**
- Знайдено (давні, не регресії — diff від main порожній): фокус після Esc → BODY у керованих діалогах (атака, книга заклинань, confirm), confirm не мав `alertdialog`. Виправлено `858e56f0`: `ResponsiveDialog` повертає фокус на opener, `role="alertdialog"` для confirm; підтверджено в браузері (labelledby/describedby, фокус на «Скасувати», Esc). `aria-describedby` відсутній у wizard-ів свідомо (T27, без `description`).
- T28: повний `--run` — exit 0, 15 с, integration 12/12, browser 18/18 (9 сценаріїв × 1440/390), міграцій 44→44, залишків 0; SIGINT посеред прогону — чисте прибирання, `--recover` ок. Не перевірено: SIGTERM, `--recover` бенчмарку; runner запускає Chrome `--headless=new`; constructor-UI кейси не входять у фінальний JSON runner.

## Виправлення, зроблені під час шлюзу

- `cb5ee910` — C1 (disabled крит-ефекти лише для таблиць атаки, один `rng()`), I1 (`serverRolls`/`diceRolls` у pending replay), I2 (крит сейву до Легендарного опору), I3 (handoff `battles.crit-choice`; world-роути `planned` → W1), M3 (`API_ERRORS.CRIT_PENDING`).
- `760f2bd5` — compendium-імпорт на HUD-компонентах + фон розділу (`compendium: races`).
- `858e56f0` — фокус-повернення, `alertdialog`, округлення множника (`×0.69`).
- `030fa7bd` — план виправлень імпорту Obojima.

## Верифікація фінального HEAD

`tsc --noEmit` 0 помилок; `pnpm test:run` 1355 файлів / **8945 тестів, усі пройшли**; `eslint --quiet` (без untracked `scripts/homm-gate`) 0 errors; build і integration (126/126) — на `0d922f9d`/`cb5ee910` (агент merge), після `858e56f0` не перезапускались (зміни лише UI/ResponsiveDialog/damage-step).

## Тест імпорту Obojima (на прохання користувача)

Файл 5etools homebrew (2,3 МБ). Через UI **не відкривається** (`RECORD_SIZE` на `bookData`), 11 підкласів блокуються (порожній `classSource` у UID), кампанія після імпорту **не готова до гри** (заклинання — свідомо `manual`, монстри з подвоєним модифікатором шкоди/без частини атак/літуни зі `speed=0`). На сервіс-рівні після обходу: 593 записи, 0 помилок, ідемпотентно, 0 висячих refs. Деталі й план — [obojima-import-fixes](2026-10-28-obojima-import-fixes.md); підсумок у scratchpad `obojima/summary.md`. До шлюзу не належить (не регресія).

## Відкриті пункти після шлюзу (backlog, не блокують merge)

Давні/minor: level-up overlay без `aria-modal`/Esc/фокус-менеджменту; vaul-sheet не забирає фокус усередину (M3); `ResponsiveDialog` не запам'ятовує opener, якщо в діалозі `autoFocus` (M1, запам'ятовувати при `open=true`), `focus({preventScroll})` (M2); `gate.ts` пауза при всіх вимкнених ефектах (M4); тест на replay заклинання з `diceRolls` (M5); `docs/architecture/battle.md` не описує `serverRolls`/disabled/порядок опору/handoff (M6); поле «Отримати» (`MoneyDialog.tsx`) — «1» не виділяється, «25» → 125; прев'ю шкоди при `critChoiceByDm` показує ×2 (54 проти 21–31) — рішення за користувачем; ~~список «Передати» для гравця показує ворожих NPC~~ — виправлено (roster і transfer для не-ДМ лише `type: "player"`); aura zone «у зоні — нікого» — не відтворено (код ідентичний main), блокувати кнопку при порожньому виборі; текст скіла Айвена «999» vs 1014; музичний плеєр розгортається після reload; SIGTERM і `--recover` бенчмарку. Також W1–W4 (world/assistant) у реєстрі findings.

## Прибирання (локально, за рішенням користувача)

Worktree `../dnd-tracker-homm-base` (detached `183c4dec`); БД `prodcopy_raw`, `prodcopy_base`, `prodcopy`, `prodcopy_sweep`, `prodcopy_base_sweep`, `prodcopy_browser`, `obojima_test`; `.env.production-db.local` скопійовано в обидва worktree (gitignored); untracked `scripts/homm-gate/`. Перед merge у `main` — свіжий бекап prod і rebuild prodcopy за потреби.
