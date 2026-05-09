# Code Audit — D&D Combat Tracker

**Дата старту:** 2026-05-09 · **Початково знайдено:** 49 знахідок (High: 11 · Medium: 24 · Low: 14)

## Статус

✅ **Усі 49 знахідок закриті.**

Історія закритих знахідок — у git log: `git log --grep "CODE_AUDIT" --oneline`. Цей документ перетворився на короткий реєстр **prevention rules** і non-issues, виведених із аудиту.

---

## Prevention rules (правила для майбутніх змін)

Виведені з закритих знахідок. Дотримання запобігає тому, щоб накопичений технічний борг повернувся.

### Server-pages

- **Завжди** використовувати `requireCampaignMember(id)` / `requireCampaignDM(id)` / `requireCampaignWithMembers(id)` з `lib/campaigns/access.ts` для access-check. Ніколи inline `prisma.campaign.findUnique` + `members.find` + redirect.
- Бізнес-логіка (фетчі, маппінги) — у `lib/<domain>/` хелперах, не в page.tsx. У page.tsx лишається лише render + minimal data orchestration.

### API routes

- **Завжди** використовувати `handleApiError(err, ctx)` з `lib/utils/api/error-handler.ts` у catch-блоках. Ніколи raw `console.error` з рядковим повідомленням.
- Тонкі route.ts: валідація + auth + delegate до `*-handler.ts` sibling. Великі handler-и (>150 рядків) — розбивати.
- Mutating endpoints (POST/PATCH/PUT/DELETE) на battle-mutations — обгортати `checkRateLimit` (Upstash sliding window).
- Pusher trigger у API route — через `safePusherTrigger(server, channel, event, payload, ctx)` з `lib/utils/pusher/safe-trigger.ts`.

### Domain-логіка

- Prisma JSON fields — **завжди** через `safeParseOrDefault(schema, value, fallback)` з `lib/schemas`. Ніколи `as Foo` без runtime validation. Schemas додавати у `lib/schemas/<domain>.ts`.
- TanStack Query mutations для CRUD — через `useCrudMutation(...)` factory з `lib/hooks/common`. Дублювати invalidateQueries не треба.
- HTTP wrapper для нового domain у `lib/api/<domain>.ts` — через `createCampaignCrudApi(basePath)` factory з `lib/api/client.ts`.
- Trigger evaluation — лише typed switch-case (на `SkillTrigger.type` дискримінант). Динамічного string-eval (`new Function()`) немає — не повертати.

### Безпека

- API auth — `requireAuth` / `requireCampaignAccess` / `requireDM`. Ownership check на Pusher channels — через `pusher-channels.ts` private prefix + auth route з ownership validation.
- CSRF: middleware у `lib/supabase/middleware.ts` робить explicit Origin check на mutating /api/* (поверх SameSite cookie). Не вимикати без причини.

### Тести

- Vitest unit-тести — у sibling `__tests__/` папках. Інтеграційні тести `*.integration.test.ts` — через `pnpm test:integration` (окремий config з `.env.local`).
- Mocking Prisma — `vi.mock("@/lib/db", () => ({ prisma: { ... } }))` (приклад: `lib/utils/battle/participant/__tests__/extract-skills.test.ts`).
- Magic numbers у calculations — у `BATTLE_CONSTANTS` (`lib/constants/battle.ts`). Ніколи inline `100`, `0.5` для percent/cap.

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

---

## Метрики (на момент закриття)

| Перевірка | Значення |
|-----------|----------|
| Unit tests | **603 passing** (старт: 349 — +254) |
| Integration tests | **16 passing** (DB + Pusher + Redis) |
| `pnpm exec tsc --noEmit` | 0 errors |
| `pnpm lint` | clean |
| `pnpm build` | OK |
| Vitest 4 deprecation | cleared |

---

## Roadmap архів

Оригінальний план з 17 ROI-кроків зберігся у `/Users/silentfox/.claude/plans/graceful-toasting-cookie.md`. Усі кроки виконано. Рефакторинг проведено за принципом "пораз — закрив".
