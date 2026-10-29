# Аудит якості коду: передача наступної сесії

Звіт: [code-audit-2026-10-29.md](code-audit-2026-10-29.md). Рядок прогресу: `docs/STATUS.md` → «Аудит якості коду 2026-10-29». Кроки 1–4 і 6 змерджено в `main`; кроки 7–8 — на гілках `refactor/audit-layers` → `refactor/audit-polish` (стек, не змерджено, не запушено); крок 5 (DM-каркаси C27–C31) чекає на constructor stage 2.

## Готово

| Крок | Зміст | Де |
|---|---|---|
| 1 | A1–A14 баги, G мертвий код | main |
| 2 | B1–B6 індекси FK, `select`, egress | main |
| 3 | дрібні спільні утиліти (C6, C13, C15–C17, C19, C21, C24, C32–C35) | main |
| 4 | реєстр операцій бою, `z.infer`-типи (C1, C2, C10, C11) | main |
| 7 | розділ E: межі шарів (lint `@/lib/db` у `lib/utils`, `@/app/api` у сторінках, `lib/ai` ↔ `assistant` без циклу, `read-show`/`read-scenario` у `lib/server`, E3/E5) + 4 баги до рефактору | гілка `refactor/audit-layers`, **не змерджена, не запушена** |
| 6 | розділ D: монолітні функції/файли (таблиці обробників, read-path сцени, рушій бою, бойові хуки, `BattleMap`, світ/сценарій, хуки) | гілка `refactor/audit-monoliths`, змерджена локально в `main`, **не запушена** |

Намірені зміни поведінки кроку 6: `scenario/action-service` `versions` без сторінки → 404 `SCENARIO_NOT_FOUND` (було 500); `section.move`/`row.move` без напрямку ±1 → 400; `checkOffHand` без зайвого запиту `campaign.findUnique`.

## Залишок кроку 6 (за бажанням, окремі малі задачі)

- `loadContext` і `writeTables`: закрито в `refactor/audit-step6-rest` (витягнуто `addOfficialTemplateChoices`, `loadTemplateSnapshots`, `assertResultingGraph`; поведінка та сама).
- `useEmailAuth` (227 рядків): шва немає — файл із 7 малих хуків (<60 рядків кожен) і спільним `useRequestState`; не чіпали.
- `MapToken` (10 props) і `MapTokenHud` (8) понад ліміт ≤7: треба згрупувати `selected/current/passThrough/dormant`, але група props як об'єкт ламає `memo(MapToken)` без окремого мемо на жетон у `BattleMap`; не робили (ризик перформансу карти).
- Ручний `ResizeObserver` у `BattleMap` (аудит C37): `useElementSize` дає `getBoundingClientRect`, а не `contentRect`, тож не 1:1.
- Свідомо пропущено з `/simplify`: спільний хук для `useAttackSubmit`/`useSpellCastSubmit`; `assertNotHeld` для inventory/stash; розбір торб `CastPlan`/`AttackRun`/`PhaseCtx`/`StreamScope`; `calculateAttackRoll` один раз (змінює порядок RNG); вузькі селектори `useBattleScene` (нові хуки читають повний `useBattleScene()`).
- Поки відкрито: перевірка в браузері карти бою (токени, HUD, pan/zoom), діалогу додавання учасника, редактора світу і діалогу знайомих.

## Наступні кроки

Далі: B7–B10, потім залишок кроку 6 (`loadContext`/`writeTables` розблоковано: obojima змерджено). Merge: audit-layers → audit-polish fast-forward.

### Крок 7 виконано (гілка `refactor/audit-layers`)

Лишилось з E (свідомо): ratchet `DB_IN_UTILS_EXEMPT` (9 файлів `lib/utils` з `@/lib/db`, зокрема participant-кластер і `api-auth.ts`) і `APP_API_IMPORT_EXEMPT` (5 CRUD-сторінок `read-*`, до constructor stage 2); списки лише скорочуються. Перед merge: повний `test:run` і repo-wide lint.

### Крок 8 виконано (гілка `refactor/audit-polish`, не змерджена, не запушена)

H і I закрито, див. STATUS. Не підтвердилось і пропущено: `BattleFxLayer` setTimeout, a11y `MapToken`, зайвий `"use client"`. Лишились дрібні з I: магічні числа карти → `map/constants.ts`, `document.title` у двох місцях, рядки >200 символів.

### Інше з відкритого

- **B7–B10** (крок 9, `refactor/audit-egress`, не запушено): перевірено читанням коду 2026-10-29, більшість знахідок застаріла. B7 — списки йдуть через `getCached*`, `take/skip` обійшов би кеш (не робити); B9 — rest/xp обмежені `.max(50)`; B10 — `ensureBucket` уже кешується в `ensured` Set. Зроблено: `tracks.reorder` у `$transaction` (раніше часткове збереження порядку при збої), `AI_LIMITS.imageGenerationMs`. Відкладено: B8 (`loadCampaignState` робить повний `exportCampaign` для хешу на clone/template.save; потрібен DB-хеш за кількома таблицями, не гарячий шлях). Кроки 7–8 змерджено в локальний main (`71483939d`, не запушено).
- **C27–C31** (DM-каркаси UI): разом із CRUD-фабрикою constructor stage 2, не раніше.
- **F i18n-хвіст:** у межах i18n part 6 (battle UI + abilities/crit effects).
- Відомі баги до рефактору, не виправлені: `useAttackWizard` memo `steps` не залежить від `scene.battle.rules` (прев'ю шкоди може застаріти при зміні правил відкритого підсумку).

## Процес для кожного кроку (як у кроці 6)

1. Гілка `refactor/audit-<тема>` від свіжого `main` (перевірити, чи основну папку не зайняла інша сесія; merge у main робити в тимчасовому worktree).
2. Спершу підтвердити знахідки читанням коду, скласти список з порядком, показати користувачу і чекати OK.
3. Реалізація: Sonnet-субагенти, батчі 2–3 суміжних задач; `tsc` + eslint + `test:related` по змінених файлах; повний `test:run` один раз наприкінці.
4. Наприкінці: Opus-рев'ю diff `main...HEAD` (окремо перелік «можливі баги до рефактору»), виправлення Sonnet-ом, `/simplify` (1–2 агенти), оновити `docs/architecture/*.md` і `docs/STATUS.md`.
5. Не пушити без прямої команди користувача. Головну сесію тримати на Sonnet (`/model sonnet`); нову сесію починати після кожного кроку.

## Закрито (крок 10, `refactor/audit-final`)

Аудит закрито; підсумок і відкриті дрібниці — у `docs/STATUS.md`, рядок «Аудит якості коду 2026-10-29».
