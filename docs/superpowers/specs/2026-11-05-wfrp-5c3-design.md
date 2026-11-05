# WFRP 5c-3: хвости після 5c-2

Гілка `feat/wfrp`, базовий HEAD e37cae125. Нічого не мерджиться в main і не пушиться до «епік готовий». Міграцій немає.

## Рішення користувача (2026-11-05)

- **Хвіст 1 (числа каталогу, Entangled): пропущено.** Джерела немає, відповіді «як в оригіналі» неможливо звірити. `catalog.ts` не змінюється, хвіст лишається відкритим у `rule-systems.md`.
- **M-4:** шанс смерті від кровотечі лише при `currentHp <= 0`.

## 1. M-4: смерть від кровотечі лише на 0 Wounds

`wfrpSkippedTurn` (`conditions/tick.ts`): додати умову `p.combatStats.currentHp <= 0` до виклику кидка. Непритомний від крововтрати з HP > 0 не вмирає від кровотечі; кидок `ctx.rng()` у цьому випадку не споживається (щоб не зсувати rng-послідовність).
Тест: `tick.test.ts` — Unconscious + Bleeding 3 + HP 5 + `rng` = 0 → живий, `rng` не викликано; HP 0 → мертвий.

## 2. Unconscious: дублі й ДМ-накладення

- `applyWfrpConditionTo` для `unconscious`, коли рівень уже > 0: повернути учасника без змін і без повідомлень (немає дубля рядка «applied» ні ефекту).
- ДМ-накладений Unconscious **не обнуляє** `currentHp` (рекомендація): HP не знищуємо, а смерть від кровотечі після п. 1 і так вимагає 0 Wounds. Поведінку фіксуємо тестом і рядком у docs, код не змінюємо.
Тест: `apply.test.ts` — друге накладання: `participants` ідентичні, `messages` порожні; ДМ-накладення зберігає `currentHp`.

## 3. Ключі wfrp виходять із ядра

Ядро (`lib/utils/battle/attack/process/compute.ts`) будує `battleLog.damage.steps.wfrp.*`, `battleLog.damage.rows.wfrpTotal` і знає `WFRP_TARGET_SIDE`. Рішення через контракт:

- `MitigateResult` стає самодостатнім: кожен крок несе `label: TextRef` і `side`, а результат — `totalLabel: TextRef`. Wfrp заповнює їх ключами `battleWfrp.damage.steps.<key>` / `battleWfrp.damage.total`; `mitigateHit` у `compute.ts` лише мапить кроки в рядки, без `wfrp`-літералів і без `WFRP_TARGET_SIDE`.
- Ключі `battleLog.wfrp.*` (`crit.*`, `critHit`, `critWound`, `unconscious`) переносяться в `battleWfrp.log.*` / `battleWfrp.crit.*` (`crit-table.ts`, `crit-effect.ts`, `on-zero-hp.ts`); у `messages/{uk,en}/battleLog.json` ключ `wfrp` і `damage.steps.wfrp`/`rows.wfrpTotal` видаляються. Нейтральні (не-wfrp) частини `battleLog` лишаються. Розмір `battleLog` для dnd5e/homm зменшується.
- Записи старих боїв у БД, що містять відкладені `battleLog.wfrp.*`, — лише тестові (епік ще не на main), міграція текстів не потрібна.
- Гард `no-system-keys.test.ts` розширюється: `lib/utils/battle` без літералів `battleWfrp.` **і** `.wfrp.`/`wfrpTotal`; нове стверджування, що `messages/*/battleLog.json` не має ключів `wfrp`/`wfrpTotal`.
Тести: наявні `compute`/`on-zero-hp`/`crit-*` тести оновлюються під нові ключі; гард.
Ризик: `scope-size` (uk 102.8 / en 82.8 KB, ліміт 105) — ключі лише переїжджають, очікуваний нетто-ефект ≈ 0 для wfrp, мінус для інших систем; перевірити скриптом `scope-size` наприкінці.

## 4. Приватність учасників: оцінка (без реалізації)

Окрема задача-дослідження: у `docs/architecture/rule-systems.md` (або `docs/product/`) описати обсяг серверної приватності `initiativeOrder` (`activeEffects`, `currentHp`, `snapshot` ворогів) для всіх систем: де учасники йдуть клієнту (GET сцени, дельта, Pusher, SSR), які поля потрібні кому (DM, гравець, `seeEnemyHp`), оцінка файлів/тестів і рекомендація (редакція на сервері за глядачем, один `redactParticipantsForViewer`, dm-канал вже є). Результат — нотатка з рекомендацією, коду немає.

## 5. ESLint

Не repo-wide. Після кожної задачі `pnpm exec eslint --fix <змінені файли>`; давні 16 помилок (`lib/server` тести, `useUnitsList.ts`) виправляються лише якщо файл торкнуто. Пакет не торкається `useUnitsList.ts`, тож він лишається.

## 6. Перевірка

- Фінал: один повний `pnpm test:run` (база 13332, 0 падінь), `scope-size`, фінальне Opus-рев'ю диф-у від e37cae125, виправлення одним Sonnet-пакетом.
- Live-run (Sonnet, БД `wfrp`): непритомний з кровотечею при HP > 0 не вмирає, при 0 — може; повторне накладання Unconscious без дубля; журнал атаки wfrp з кроками шкоди й критом (нові ключі, без сирих ключів у UI).
- Лишається неперевіреним: жива Pusher-дельта гравцю (немає другого акаунта). Dev-індикатор «1 Issue» поза епіком.

## Пакети

| Пакет | Зміст |
|---|---|
| A | п. 1 + п. 2 (`tick.ts`, `apply.ts`, тести) |
| B | п. 3 (контракт mitigate, переїзд ключів, гард) |
| C | п. 4 (нотатка-оцінка) і docs/STATUS |
| Live-run | після A–C |

A і C незалежні, B незалежний від A; виконуються послідовно, по коміту на пакет.
