# Code Audit — D&D Combat Tracker

**Дата старту:** 2026-05-09 · **Початково знайдено:** 49 знахідок (High: 11 · Medium: 24 · Low: 14)

## Статус

✅ **42 з 49** знахідок повністю закриті — всі 17 ROI-кроків з оригінального плану виконано.

Документ оновлено — залишено лише пункти, що **не** закриті (5 partial, 3 unfixed). Історія закритих знахідок — у git log: `git log --grep "CODE_AUDIT" --oneline`.

---

## Як читати

| Поле | Значення |
|------|----------|
| **Severity** | `High` — болить зараз; `Medium` — технічний борг; `Low` — nice-to-have |
| **Effort** | `XS` ≤ 30хв · `S` 1–2 год · `M` півдня–день · `L` >1 день |

---

## Незакриті знахідки

### Не закриті (3)

| ID | Sev / Effort | Знахідка | Рекомендація |
|----|--------------|----------|--------------|
| <a id="1.2"></a>**1.2** | Medium / S | Бізнес-логіка прямо в server-page: `prisma.campaign.findUnique({ include: ... })` + access control inline. | Винести в `lib/campaigns/get-campaign-by-id.ts` (або у server-action), залишити в page.tsx тільки render. |
| <a id="1.12"></a>**1.12** | Low / M | Великі page-clients (291 / 209 / 155 рядків) — кандидати на розбиття на presentational + container. | Знайти спільні patterns з Phase 6 monolith refactor; виокремити substate-hooks. |
| <a id="3.8"></a>**3.8** | Medium / M | Switch з ~62 case-ами без розбиття; 150+ рядків. | 16 unit-тестів вже покривають всі гілки (Phase 5.5). Можна розбити на dispatch table з handlerByStat record + помічники buff/dot/message-only. Низька priority бо тести не дають регресії. |

**Файли:**
- **1.2** — `app/campaigns/[id]/page.tsx:31-51`
- **1.12** — `app/campaigns/[id]/dm/{characters,skills,units}/page-client.tsx`
- **3.8** — `lib/utils/skills/execution/effects.ts`

---

### Partially fixed (5)

| ID | Sev / Effort | Що зроблено | Що ще можна зробити |
|----|--------------|-------------|---------------------|
| <a id="1.8"></a>**1.8** | Medium / M | `processSpell` вже розбитий на 5 sub-modules: `process-actions`, `process-branches`, `process-damage`, `process-effects`, `process-helpers`. | Orchestrator залишається 344р — це orchestration glue, реальної user-facing логіки там нема. Подальший split дасть маргінальну користь. **Можна закрити.** |
| <a id="2.2"></a>**2.2** | Medium / XS | `requireAuth/requireCampaignAccess/requireDM` повертають union `Result \| NextResponse`. Most boilerplate тепер за маскою цих хелперів. | Залишилось 7 явних `if (instanceof NextResponse) return …` (з ~30). Повне усунення вимагає змінити helper signatures на throw-pattern, що ламає всі callers. Не варто заради economy у 7 рядків. **Можна закрити.** |
| <a id="3.7"></a>**3.7** | Medium / S | `spell.effects` тепер під `Array.isArray()` guard перед cast (`cast-spell-handler.ts:291-293`). | Cast `as string[]` все ще присутній — можна замінити на `.filter((e): e is string => typeof e === "string")` для повної safety. XS effort. |
| <a id="5.11"></a>**5.11** | Medium / M | Виокремлено 2 найбільші describe-блоки (`bonus-action`, `on-hit-effects`); файл 2847 → 1801р (-1046). | Залишилось 12 describes у головному файлі (~1800 рядків). Подальше розбиття можливе (4–6 файлів), але file уже керований; маргінальна користь. |
| <a id="4.3"></a>**4.3** | Medium / S | `safePusherTrigger(server, channel, event, payload, ctx)` хелпер з structured-логом + 17 fire-and-forget calls мігровано. | Помилка real-time все ще не повертається клієнту (за дизайном — fire-and-forget щоб не блокувати API response; клієнт invalidate-ить query при reconnect). Можна додати opt-in `await` mode, але цінність низька. |

---

<a id="non-issues"></a>
## Що НЕ є проблемою (підтверджено аудитом)

- **Layering чистий:** немає прямих `fetch`/`prisma` з компонентів, нема імпортів server-only коду з `'use client'`.
- **Нема циклічних залежностей** між `lib/hooks/` ↔ `lib/utils/` (одностороння).
- **Barrel-файли організовані** по доменах, не «export *».
- **Alias-import (`@/`) тримається** скрізь.
- **Hero-scaling константи централізовані** у `lib/constants/hero-scaling.ts`.
- **Damage pipeline уніфікований** — melee/ranged/magic користуються спільним shared pipeline через `calculateSkillDamage{Percent,Flat}Bonus` + `matchesAttackType`.
- **`lib/api/` — тонкі HTTP wrappers**, не імпортують server-only.
- **Trigger evaluation типізований** — лише typed switch-case (CODE_AUDIT 2.9, 2.10 закрито: динамічний `new Function()` стрингова-eval видалена як dead code).
- **CSRF захист explicit** — Origin check на mutating /api/* (CODE_AUDIT 4.4).
- **Rate limiting** — Upstash sliding window на battle endpoints (CODE_AUDIT 4.2).

---

## Метрики (на момент закриття roadmap)

| Перевірка | Значення |
|-----------|----------|
| Unit tests | **603 passing** (старт: 349 — +254) |
| Integration tests | **16 passing** (DB + Pusher + Redis) |
| `pnpm exec tsc --noEmit` | 0 errors |
| `pnpm lint` | clean |
| `pnpm build` | OK |
| Vitest 4 deprecation | cleared |
