# Аудит якості коду: передача наступної сесії

Звіт: [code-audit-2026-10-29.md](code-audit-2026-10-29.md). Рядок прогресу: `docs/STATUS.md` → «Аудит якості коду 2026-10-29». Кроки 1–4 і 6 змерджено в `main`; крок 5 (DM-каркаси C27–C31) чекає на constructor stage 2.

## Готово

| Крок | Зміст | Де |
|---|---|---|
| 1 | A1–A14 баги, G мертвий код | main |
| 2 | B1–B6 індекси FK, `select`, egress | main |
| 3 | дрібні спільні утиліти (C6, C13, C15–C17, C19, C21, C24, C32–C35) | main |
| 4 | реєстр операцій бою, `z.infer`-типи (C1, C2, C10, C11) | main |
| 6 | розділ D: монолітні функції/файли (таблиці обробників, read-path сцени, рушій бою, бойові хуки, `BattleMap`, світ/сценарій, хуки) | гілка `refactor/audit-monoliths`, змерджена локально в `main`, **не запушена** |

Намірені зміни поведінки кроку 6: `scenario/action-service` `versions` без сторінки → 404 `SCENARIO_NOT_FOUND` (було 500); `section.move`/`row.move` без напрямку ±1 → 400; `checkOffHand` без зайвого запиту `campaign.findUnique`.

## Залишок кроку 6 (за бажанням, окремі малі задачі)

- `loadContext` (`lib/server/compendium-import/repository.ts`) і `writeTables` (`lib/server/templates/sync/apply.ts`): не чіпали через гілку `feat/obojima-import-fixes`; брати після її merge.
- `useEmailAuth` (227 рядків): у кроці 6 не змінювався, перевірити, чи є очевидний шов.
- `MapToken` (10 props) і `MapTokenHud` (8) понад ліміт ≤7: треба згрупувати `selected/current/passThrough/dormant`, але це вимагає окремого мемо на жетон.
- Ручний `ResizeObserver` у `BattleMap` (аудит C37): `useElementSize` дає `getBoundingClientRect`, а не `contentRect`, тож не 1:1.
- Свідомо пропущено з `/simplify`: спільний хук для `useAttackSubmit`/`useSpellCastSubmit`; `assertNotHeld` для inventory/stash; розбір торб `CastPlan`/`AttackRun`/`PhaseCtx`/`StreamScope`; `calculateAttackRoll` один раз (змінює порядок RNG); вузькі селектори `useBattleScene` (нові хуки читають повний `useBattleScene()`).
- Поки відкрито: перевірка в браузері карти бою (токени, HUD, pan/zoom), діалогу додавання учасника, редактора світу і діалогу знайомих.

## Наступні кроки

Порядок за звітом: крок 7 → 8, потім I і H, B7–B10 за потреби.

### Крок 7. Межі шарів (розділ E), далі «E»

1. **prisma з `lib/utils/battle`.** 8 файлів імпортують `prisma` (`from-character-learned-spells.ts`, `extract-skills.ts`, `load-race.ts`, `load-character-context.ts`, `from-character-spell-slots.ts`, `spell/load-spells-db.ts`, `balance/unit-library.ts`, `artifact-sets/load-maps.ts`) → перенести завантажувачі в `lib/server/…`. Додати ESLint-правило, що забороняє `@/lib/db` у `lib/utils/**`.
2. **Цикл `lib/ai` ↔ `lib/server/assistant`:** `lib/ai/proposals.ts` ↔ `assistant/actions/legacy-proposal.ts`, `scenario-edit.ts`; 15 файлів `templates/compendium-import/battles/campaigns/characters` імпортують `assistant/*`. → `json.ts` у `lib/utils/common`, `proposals.ts` у `lib/server/assistant`. Читати `docs/architecture/ai.md` перед змінами.
3. **Три стилі помилок** (`throw ContentError`, `{ok:false,status}`, `return NextResponse`): нові домени лише через `throw ContentError`; наявні не мігрувати разом із кроком, окремо.
4. **Handler-и в `app/api/campaigns/[id]/{scenario,show,skills,artifacts,spells,races,artifact-sets}/*-handler(s).ts`** імпортуються зі сторінок → у `lib/server/<domain>`; `progression/route.ts:8` GET з третім аргументом `actor?`. CRUD-routes (`races`, `spells`, `main-skills`, `units`, `artifact-sets`) не чіпати: це constructor stage 2.
5. `lib/server/artifacts/lock.ts:10` (`ensureInventory`) у файлі з ім'ям lock; `characters/battle-lock.ts` має два API (NextResponse і throw).

### Крок 8. Дрібне (розділ I) і a11y (розділ H)

Списки у звіті, розділи H та I. Особливо: `BattleFxLayer.tsx:25` `setTimeout` без скасування; зайвий `"use client"` (перевіряти по одному); `marker-handlers.ts:61` → `Prisma.WorldMarkerUpdateInput`; catch без логування (`ai/tools/define.ts:97`, `assistant/execution-effects.ts:36,53`, логувати лише `error.name`); a11y `ScenarioCell`, `SlotPicker`, `LevelUpOverlay`, `MapToken`, `BattleResultScreen`; порожні стани помилок → `QueryState`.

### Інше з відкритого

- **B7–B10** (egress/БД): `content.*.list` без `take/skip`, `loadCampaignState` експортує весь bundle для хешу, безлімітні `findMany` у `content/operation-service.ts` і rest/experience handler-ах, `ensureBucket` на кожну генерацію.
- **C27–C31** (DM-каркаси UI): разом із CRUD-фабрикою constructor stage 2, не раніше.
- **F i18n-хвіст:** у межах i18n part 6 (battle UI + abilities/crit effects).
- Відомі баги до рефактору, не виправлені: `useAttackWizard` memo `steps` не залежить від `scene.battle.rules` (прев'ю шкоди може застаріти при зміні правил відкритого підсумку).

## Процес для кожного кроку (як у кроці 6)

1. Гілка `refactor/audit-<тема>` від свіжого `main` (перевірити, чи основну папку не зайняла інша сесія; merge у main робити в тимчасовому worktree).
2. Спершу підтвердити знахідки читанням коду, скласти список з порядком, показати користувачу і чекати OK.
3. Реалізація: Sonnet-субагенти, батчі 2–3 суміжних задач; `tsc` + eslint + `test:related` по змінених файлах; повний `test:run` один раз наприкінці.
4. Наприкінці: Opus-рев'ю diff `main...HEAD` (окремо перелік «можливі баги до рефактору»), виправлення Sonnet-ом, `/simplify` (1–2 агенти), оновити `docs/architecture/*.md` і `docs/STATUS.md`.
5. Не пушити без прямої команди користувача. Головну сесію тримати на Sonnet (`/model sonnet`); нову сесію починати після кожного кроку.
