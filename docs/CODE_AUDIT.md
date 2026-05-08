# Code Audit — D&D Combat Tracker

**Дата:** 2026-05-09 · **Знахідок:** 49 (High: 11 · Medium: 24 · Low: 14)

Огляд якості коду, дублювань і можливостей рефакторингу за результатами трьох незалежних аудитів (архітектура, дублювання, якість/безпека).

---

## Як читати

| Поле | Значення |
|------|----------|
| **Severity** | `High` — болить зараз; `Medium` — технічний борг; `Low` — nice-to-have |
| **Effort** | `XS` ≤ 30хв · `S` 1–2 год · `M` півдня–день · `L` >1 день |
| **ID** | `<розділ>.<номер>` — для посилань між таблицями |

Зміст:
1. [Дашборд: топ-5 за ROI](#top-5)
2. [Структурні слабкі місця](#structural)
3. [Дублювання та уніфікація](#duplication)
4. [Якість коду / type safety](#quality)
5. [Безпека / надійність](#security)
6. [Прогалини в тестовому покритті](#tests)
7. [Повний план робіт за ROI](#roi)
8. [Що НЕ є проблемою](#non-issues)

---

<a id="top-5"></a>
## 1. Дашборд: топ-5 за ROI

Найбільший виграш за найменші зусилля — починати звідси.

| # | Завдання | Sev / Effort | ID знахідок |
|---|----------|--------------|-------------|
| 1 | Видалити `lib/types/battle.ts`, мігрувати імпорти у `types/battle.ts` | High / XS | [1.1](#1.1) |
| 2 | Pusher auth — додати ownership check на `battle-{battleId}` | High / S | [4.1](#4.1) |
| 3 | `lib/utils/api/error-handler.ts` для ~94 catch-блоків | High / S | [2.1](#2.1), [3.3](#3.3) |
| 4 | Винести логіку з товстих route.ts у `*-handler.ts` | High / S | [1.3](#1.3)–[1.6](#1.6) |
| 5 | `useCrudMutation` factory для TanStack hooks | High / S | [2.4](#2.4) |

**Розподіл знахідок за категоріями:**

| Категорія | High | Medium | Low | Σ |
|-----------|:----:|:------:|:---:|:-:|
| Структурні (1.x) | 5 | 6 | 1 | 12 |
| Дублювання (2.x) | 2 | 6 | 4 | 12 |
| Якість / TS (3.x) | 1 | 5 | 4 | 10 |
| Безпека (4.x) | 2 | 1 | 2 | 5 |
| Тестування (5.x) | 0 | 11 | 0 | 11 |
| **Σ** | **11** | **24** | **14** | **49** |

> Останні 11 «Medium» — це гепи покриття для одного підмодуля (`skills/execution/`). Якщо на нього ставити одну задачу — High/M.

---

<a id="structural"></a>
## 2. Структурні / архітектурні слабкі місця

| ID | Sev / Effort | Знахідка |
|----|--------------|----------|
| <a id="1.1"></a>**1.1** | High / XS | Дубль 10+ типів між двома файлами; один навіть переекспортує з іншого через `import("...")`. |
| <a id="1.2"></a>**1.2** | Medium / S | Бізнес-логіка прямо в server-page: `prisma.campaign.findUnique({ include: ... })` + access control inline. |
| <a id="1.3"></a>**1.3** | High / S | Товстий route — 353 рядки: валідація + `processSpell` + Pusher payload в одному файлі. |
| <a id="1.4"></a>**1.4** | High / S | Товстий route — 286 рядків, PATCH HP + initiative + triggers + remove. |
| <a id="1.5"></a>**1.5** | High / S | Товстий route — 285 рядків, advance turn + balance + morale + log + Pusher. |
| <a id="1.6"></a>**1.6** | High / S | Товстий route — 274 рядки, ініціатива + skill triggers + battleStart. |
| <a id="1.7"></a>**1.7** | Medium / M | Гібридна функція 399 рядків: парсинг ID + фетч з БД + автодетект damageType. |
| <a id="1.8"></a>**1.8** | Medium / M | Один експорт `processSpell` ~344 рядки; вже частково розбитий, але потенціал залишається. |
| <a id="1.9"></a>**1.9** | Medium / M | 333 рядки з 12+ функціями всередині; немає unit-тестів. |
| <a id="1.10"></a>**1.10** | Medium / M | Монолітний компонент 560 рядків (форма + логіка + 3 dialog). |
| <a id="1.11"></a>**1.11** | Medium / M | Монолітний компонент 504 рядки (UnitCard з 3 modal dialogs). |
| <a id="1.12"></a>**1.12** | Low / M | Великі page-client (291 / 209 / 155) — кандидати на розбиття. |

**Файли (за ID):**
- **1.1** — `types/battle.ts` (466р.) vs `lib/types/battle.ts` (234р.)
- **1.2** — `app/campaigns/[id]/page.tsx:31-51`
- **1.3** — `app/api/campaigns/[id]/battles/[battleId]/spell/route.ts`
- **1.4** — `app/api/campaigns/[id]/battles/[battleId]/participants/[participantId]/route.ts`
- **1.5** — `app/api/campaigns/[id]/battles/[battleId]/next-turn/route.ts`
- **1.6** — `app/api/campaigns/[id]/battles/[battleId]/start/route.ts`
- **1.7** — `lib/utils/battle/participant/extract-skills.ts`
- **1.8** — `lib/utils/battle/spell/process.ts`
- **1.9** — `lib/utils/battle/participant/passive.ts`
- **1.10** — `components/artifact-sets/ArtifactSetBonusEditor.tsx`
- **1.11** — `components/units/list/UnitCard.tsx`
- **1.12** — `app/campaigns/[id]/dm/{characters,skills,units}/page-client.tsx`

---

<a id="duplication"></a>
## 3. Дублювання та можливості уніфікації

| ID | Sev / Effort | Знахідка |
|----|--------------|----------|
| <a id="2.1"></a>**2.1** | High / S | ~94 catch-блоки з copy-paste обробки `ZodError` / Prisma errors / 500. |
| <a id="2.2"></a>**2.2** | Medium / XS | ~30 повторень `if (authResult instanceof NextResponse) return authResult;`. |
| <a id="2.3"></a>**2.3** | Medium / S | ~10 inline Zod-схем у route.ts замість централізованого `lib/schemas/`. |
| <a id="2.4"></a>**2.4** | High / S | ~15 ідентичних `useMutation` з ручним `invalidateQueries` для кожного домену. |
| <a id="2.5"></a>**2.5** | Low / XS | 4 функції з ідентичним двоступеневим loop (skills → effects + activeEffects → effects). |
| <a id="2.6"></a>**2.6** | Low / S | ~20 місць з вкладеним `include: { members: { include: { user: true } } }` без shared constant. |
| <a id="2.7"></a>**2.7** | Medium / M | 95% дубль між Create/Edit формами артефактів. |
| <a id="2.8"></a>**2.8** | Medium / S | Дубль форми Race Create/Edit — однакові handlers `toggleAvailableSkill`, `handleSubmit`. |
| <a id="2.9"></a>**2.9** | Medium / M | Два паралельні підходи: динамічний string-eval (`new Function()`) vs switch-case. |
| <a id="2.10"></a>**2.10** | Low / S | Дубль типу `TriggerContext` / `SkillTriggerContext` без спільного `BaseTriggerContext`. |
| <a id="2.11"></a>**2.11** | Low / XS | Magic numbers (`100`, `0.5`, `25`, `15`) inline у calculations замість констант. |
| <a id="2.12"></a>**2.12** | Low / M | 30+ wrapper-функцій `campaignGet/Post/Patch/Delete` слідують одному шаблону. |

**Файли (за ID):**
- **2.1, 2.2, 2.3** — `app/api/**/*.ts` (наскрізне)
- **2.4** — `lib/hooks/{units,battles,skills,characters,artifacts}/`
- **2.5** — `lib/utils/battle/damage/skill.ts`
- **2.6** — `app/api/campaigns/route.ts`, `app/api/campaigns/[id]/{,characters/}route.ts`
- **2.7** — `components/artifacts/Artifact{Create,Edit}Form.tsx`
- **2.8** — `components/races/{CreateRaceDialog,RaceEditForm}.tsx`
- **2.9** — `lib/utils/battle/triggers/evaluator.ts:22-86` vs `lib/utils/skills/triggers/index.ts:11-162`
- **2.10** — ті самі два файли, шапки типів
- **2.11** — `lib/utils/battle/resistance/index.ts:80-87`, `lib/utils/battle/common/modifiers.ts`
- **2.12** — `lib/api/{characters,skills,units,battles,artifacts}.ts`

---

<a id="quality"></a>
## 4. Якість коду / type safety

| ID | Sev / Effort | Знахідка |
|----|--------------|----------|
| <a id="3.1"></a>**3.1** | High / M | JSON-поля Prisma (`Skill.combatStats`, `spellEnhancementData`, `bonuses`, `Character.skillTreeProgress`, `BattleScene.initiativeOrder`) типізуються через `as unknown as Foo` без runtime-валідації — ~20 місць. |
| <a id="3.2"></a>**3.2** | Medium / XS | `await request.json().catch(() => ({}))` — JSON parse errors проковтуються без логу. |
| <a id="3.3"></a>**3.3** | Medium / S | `console.error("Error creating campaign:", error)` без контексту (campaignId, userId, params). ~30 місць. |
| <a id="3.4"></a>**3.4** | Low / XS | PATCH-схема з усіма optional полями не перевіряє, що принаймні одне присутнє. |
| <a id="3.5"></a>**3.5** | Medium / XS | `JSON.parse(JSON.stringify())` для deep clone великих `BattleParticipant[]` у hot path. |
| <a id="3.6"></a>**3.6** | Low / S | `prisma.skill.findMany()` кілька разів з різними фільтрами — потенційне дублювання rows. |
| <a id="3.7"></a>**3.7** | Medium / S | `spell.effects as string[]` — Prisma JSON без гарантії, що це Array<string>. |
| <a id="3.8"></a>**3.8** | Medium / M | Switch з ~62 case-ами без розбиття; 150+ рядків. |
| <a id="3.9"></a>**3.9** | Low / S | Polling-loop без bounded backoff на пошкодженому стані бою. |
| <a id="3.10"></a>**3.10** | Low / XS | `console.info` debug-блок з повним dump активних скілів — на КОЖНЕ обчислення шкоди. |

**Файли (за ID):**
- **3.1** — `app/api/campaigns/[id]/battles/[battleId]/spell/route.ts:86,283`, `lib/utils/battle/participant/extract-skills.ts:166`, `lib/utils/battle/participant/start-build-context.ts:34`
- **3.2** — `app/api/campaigns/[id]/battles/[battleId]/participants/[participantId]/route.ts:53`
- **3.3** — усі route.ts catch-блоки
- **3.4** — `app/api/campaigns/[id]/battles/[battleId]/participants/[participantId]/route.ts:55`
- **3.5** — `app/api/campaigns/[id]/battles/[battleId]/attack/attack-handler.ts:131` (+ 3–5 handlers)
- **3.6** — `app/api/campaigns/[id]/battles/[battleId]/start/start-build-context.ts:98-114`
- **3.7** — `app/api/campaigns/[id]/battles/[battleId]/spell/route.ts:187-190`, `lib/utils/battle/spell/process.ts`
- **3.8** — `lib/utils/skills/execution/effects.ts`
- **3.9** — `lib/utils/battle/attack-and-next-turn/advance-turn-phase.ts:87-100`
- **3.10** — `lib/utils/battle/damage/impl.ts:83-113`

---

<a id="security"></a>
## 5. Безпека / надійність

| ID | Sev / Effort | Знахідка |
|----|--------------|----------|
| <a id="4.1"></a>**4.1** | High / S | Pusher auth дозволяє підписатись на `battle-{battleId}` будь-якому authenticated user без перевірки `campaignId` ownership. |
| <a id="4.2"></a>**4.2** | High / M | Немає rate limiting на battle mutations (`attack`, `spell`, `bonus-action`, `next-turn`). |
| <a id="4.3"></a>**4.3** | Medium / S | `void pusherServer.trigger().catch(console.error)` — fire-and-forget. ~10 місць; помилка real-time не повертається клієнту. |
| <a id="4.4"></a>**4.4** | Low / M | Немає явної CSRF-захисту на POST endpoints (хоч Next.js має дефолтний same-origin). |
| <a id="4.5"></a>**4.5** | Low / S | `useEffect` з function reference у deps — потенційні зайві timer resets, якщо parent не memoize callback. |

**Файли (за ID):**
- **4.1** — `app/api/pusher/auth/route.ts:24-30`
- **4.2** — усі `app/api/campaigns/[id]/battles/[battleId]/*/route.ts` (POST/PATCH)
- **4.3** — `app/api/.../battles/[battleId]/spell/route.ts:329-335` та інші handlers
- **4.4** — усі `app/api/campaigns/*/route.ts` POST
- **4.5** — `components/battle/views/PlayerTurnView.tsx:59-62, 84-107`

---

<a id="tests"></a>
## 6. Прогалини в тестовому покритті

> Severity всіх — Medium · Effort на покриття — M (по 2–4 год на файл).
> Зараз усі ці модулі тестуються лише через інтеграційний `skill-triggers-execution.test.ts` (2847 рядків) — він теж потребує розбиття на suite-файли.

| ID | Файл | Рядків |
|----|------|--------|
| <a id="5.1"></a>**5.1** | `lib/utils/skills/execution/bonus-action.ts` | 462 |
| <a id="5.2"></a>**5.2** | `lib/utils/skills/execution/battle-start.ts` | 444 |
| <a id="5.3"></a>**5.3** | `lib/utils/skills/execution/simple.ts` | 298 |
| <a id="5.4"></a>**5.4** | `lib/utils/skills/execution/on-hit.ts` | 218 |
| <a id="5.5"></a>**5.5** | `lib/utils/skills/execution/effects.ts` | 150+ (switch на 62 case) |
| <a id="5.6"></a>**5.6** | `lib/utils/battle/participant/extract-skills.ts` | 399 |
| <a id="5.7"></a>**5.7** | `lib/utils/battle/participant/passive.ts` | 333 |
| <a id="5.8"></a>**5.8** | `lib/utils/battle/spell/process.ts` (часткове покриття) | 344 |
| <a id="5.9"></a>**5.9** | `lib/utils/battle/attack-and-next-turn/run-attack-phase.ts` | 313 |
| <a id="5.10"></a>**5.10** | `lib/utils/battle/attack-and-next-turn/advance-turn-phase.ts` | 318 |
| <a id="5.11"></a>**5.11** | `lib/utils/skills/__tests__/skill-triggers-execution.test.ts` (потребує розбиття) | 2847 |

---

<a id="roi"></a>
## 7. Повний план робіт за ROI

| # | Дія | Sev / Effort | ID |
|---|-----|--------------|-----|
| 1 | Видалити `lib/types/battle.ts`, мігрувати імпорти | High / XS | [1.1](#1.1) |
| 2 | Pusher auth ownership check | High / S | [4.1](#4.1) |
| 3 | `handleApiError(err, ctx)` для всіх catch | High / S | [2.1](#2.1), [3.3](#3.3) |
| 4 | Винести логіку з товстих route.ts у `*-handler.ts` | High / S | [1.3](#1.3)–[1.6](#1.6) |
| 5 | Zod schemas + runtime parsers для JSON-полів | High / M | [3.1](#3.1), [3.7](#3.7) |
| 6 | `useCrudMutation` factory | High / S | [2.4](#2.4) |
| 7 | Unit-тести для `lib/utils/skills/execution/*` | Medium / M | [5.1](#5.1)–[5.5](#5.5) |
| 8 | Rate limiting на battle endpoints | High / M | [4.2](#4.2) |
| 9 | Unit-тести для `extract-skills.ts`, `passive.ts` | Medium / M | [5.6](#5.6), [5.7](#5.7) |
| 10 | Розбиття моноліт-компонентів + спільні Create/Edit форми | Medium / M | [1.10](#1.10)–[1.12](#1.12), [2.7](#2.7), [2.8](#2.8) |
| 11 | Витягти `iterateMatchingEffects` у `damage/skill.ts` | Low / XS | [2.5](#2.5) |
| 12 | `lib/schemas/` каталог для Zod | Medium / S | [2.3](#2.3) |
| 13 | `lib/utils/prisma/includes.ts` з константами | Low / S | [2.6](#2.6) |
| 14 | Уніфікувати trigger evaluation | Medium / M | [2.9](#2.9), [2.10](#2.10) |
| 15 | Structured logger з контекстом | Medium / S | [3.3](#3.3) |
| 16 | `JSON.parse(JSON.stringify())` → `structuredClone` | Medium / XS | [3.5](#3.5) |
| 17 | Видалити debug `console.info` у `damage/impl.ts` | Low / XS | [3.10](#3.10) |

---

<a id="non-issues"></a>
## 8. Що НЕ є проблемою

- **Layering чистий:** немає прямих `fetch`/`prisma` з компонентів, нема імпортів server-only коду з `'use client'`.
- **Нема циклічних залежностей** між `lib/hooks/` ↔ `lib/utils/` (одностороння).
- **Barrel-файли організовані** по доменах, не «export *».
- **Alias-import (`@/`) тримається** скрізь.
- **Hero-scaling константи централізовані** у `lib/constants/hero-scaling.ts`.
- **Damage pipeline уніфікований** — melee/ranged/magic користуються спільним shared pipeline через `calculateSkillDamage{Percent,Flat}Bonus` + `matchesAttackType`.
- **`lib/api/` — тонкі HTTP wrappers**, не імпортують server-only.

Це сильна база — рефакторинг буде цільовим і поетапним, не структурною перекомпоновкою.
