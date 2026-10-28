# Відпочинок на карті світу — план реалізації

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Кроки з `- [ ]`. Один фінальний Opus-рев'ю, без рев'ю по задачах; повний `pnpm test:run` один раз наприкінці (під час роботи — `pnpm test:related <files>`).

**Goal:** ДМ відпочиває партією з `TravelPanel` (short/long): ресурси героїв відновлюються за правилами кампанії, у журналі подорожі з'являється `kind: "rest"`; `rest` разом із подорожжю теж відновлює ресурси.

**Architecture:** тонкий шар над наявним `restParty` (`lib/server/characters/core/rest-handler.ts`). Новий `applyWorldRest` (без помилки, якщо `persistResources` вимкнено), новий `POST /world/rest`, виклик `applyWorldRest` перед `commitTravel` у travel/enter/exit. Клієнт: `lib/api` → `useWorldTravel` → `useTravelPanel` → `TravelPanel`.

**Tech Stack:** Next.js route handlers, Zod, Prisma, TanStack Query, Vitest (`happy-dom` для UI).

**Spec:** `docs/superpowers/specs/2026-10-28-world-rest-design.md`

## Global Constraints

- Шари з CLAUDE.md: `route.ts` тонкий; handler окремо; компоненти не імпортують `@/lib/api/*`; барель-імпорти з `@/lib/hooks/<domain>`.
- Без міграції (`world_travel_log.kind` — String), без нових правил, `rest-handler.ts` не змінювати.
- Тексти для користувача — українською; коментарі мінімальні (глобальний CLAUDE.md); ідентифікатори англійською.
- Помилки через `ContentError` (його ловить `handleApiError`) або `errorResponse` з `lib/constants/api-errors.ts`.
- Після змін: `pnpm lint --fix` на торкнутих файлах і `pnpm exec tsc --noEmit`.
- Коміти з рядком `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

## Review Focus

- Герой із запиту не на цій мапі → відпочинок відхиляється (`WORLD_HERO_INVALID`), запису в журнал немає.
- Правила вимкнено + `rest: "long"` у подорожі → подорож проходить як зараз, ресурси не чіпаються.
- Герой в активному бою + `rest ≠ none` у подорожі → 409 і позиція героя не змінилась.
- Мертвий герой (`resources.dead`) → відпочинок не падає (це вже вміє `applyRest`).
- Гравець бачить запис `rest` у своєму журналі лише з іменами своїх героїв (наявна логіка `readTravelLog`).

## Файли

- Create: `lib/server/world/rest.ts`, `app/api/campaigns/[id]/world/rest/route.ts`, `lib/server/world/__tests__/rest.test.ts`, `lib/server/world/__tests__/travel-handlers-rest.test.ts`
- Modify: `types/world.ts`, `lib/schemas/world.ts`, `lib/server/world/travel-store.ts`, `lib/server/world/travel-handlers.ts`, `lib/api/world.ts`, `lib/hooks/world/useWorldTravel.ts`, `lib/hooks/world/useTravelPanel.ts`, `components/world/travel/TravelPanel.tsx`, `components/world/travel/TravelLog.tsx`, тести `TravelPanel.test.tsx`/`TravelLog.test.tsx`/`useWorldHooks.test.tsx`, `lib/onboarding/whats-new.ts`, `docs/architecture/world-map.md`, `docs/STATUS.md`

---

### Task 1: Сервер — типи, схема, `applyWorldRest`, запис журналу

**Files:** `types/world.ts`, `lib/schemas/world.ts`, `lib/server/world/rest.ts`, `lib/server/world/travel-store.ts`, `lib/server/world/__tests__/rest.test.ts`

**Interfaces:**
- Produces: `TRAVEL_KINDS` містить `"rest"`; `restWorldSchema` (`{ mapId, characterIds, kind: "short"|"long" }`) + `type RestWorldInput`; `applyWorldRest(access: CampaignAccessResult, kind: "short" | "long", characterIds: string[]): Promise<{ applied: boolean }>`; `writeRestLog(args: { campaignId; userId; mapId; kind: "short"|"long"; characterIds: string[]; at: { x: number; y: number } }): Promise<void>` у `travel-store.ts`.

- [ ] **Step 1: Тест `rest.test.ts`** (мок `@/lib/server/characters/core/rest-handler`): (a) `persistResources: false` → `{ applied: false }`, `restParty` не викликано; (b) `true` → `restParty` викликано з `access`, `{ kind, characterIds }`, результат `{ applied: true }`; (c) помилка `restParty` (ContentError 409) пробивається нагору. Access — мінімальний об'єкт `{ campaign: { rules: { outOfCombat: { persistResources } } } } as CampaignAccessResult`.
- [ ] **Step 2:** `pnpm test:run lib/server/world/__tests__/rest.test.ts` → FAIL.
- [ ] **Step 3: Реалізація.**

```ts
// lib/server/world/rest.ts
import { restParty } from "@/lib/server/characters/core/rest-handler";
import type { CampaignAccessResult } from "@/lib/utils/api/api-auth";

export async function applyWorldRest(access: CampaignAccessResult, kind: "short" | "long", characterIds: string[]): Promise<{ applied: boolean }> {
  if (!access.campaign.rules.outOfCombat.persistResources) return { applied: false };

  await restParty(access, { kind, characterIds });

  return { applied: true };
}
```

`types/world.ts`: `TRAVEL_KINDS = ["travel", "enter", "exit", "rest"]`. `lib/schemas/world.ts`: після `exitSchema` —
`export const restWorldSchema = z.object({ mapId: z.string().min(1), characterIds, kind: z.enum(["short", "long"]) });` і `export type RestWorldInput = z.infer<typeof restWorldSchema>;`.
`travel-store.ts`: `writeRestLog` робить один `prisma.worldTravelLog.create({ data: { campaignId, mapId, characterIds, from: { mapId, ...at }, to: { mapId, ...at }, toMarkerId: null, rest: kind, kind: "rest", byUserId: userId } })`.
- [ ] **Step 4:** тест проходить; `pnpm exec tsc --noEmit` (додавання `"rest"` у `TRAVEL_KINDS` може зламати `Record<TravelKind, …>` у `TravelLog.tsx` — це чиниться в Task 3; якщо tsc червоний лише там — ок, зафіксувати в коміті).
- [ ] **Step 5: Commit** `feat(world-rest): applyWorldRest, rest schema and log writer`.

### Task 2: Сервер — маршрут `rest` та відпочинок у travel/enter/exit

**Files:** `lib/server/world/travel-handlers.ts`, `app/api/campaigns/[id]/world/rest/route.ts`, `lib/server/world/__tests__/travel-handlers-rest.test.ts`

**Interfaces:**
- Consumes: `applyWorldRest`, `writeRestLog`, `restWorldSchema` з Task 1.
- Produces: `restHandler(req: Request, campaignId: string)` → `NextResponse` з `{ ok: true, applied: boolean }`.

- [ ] **Step 1: Тести** (мок `@/lib/db`, `@/lib/utils/api/api-auth` `requireDM`, `@/lib/server/world/rest`, `@/lib/server/world/world-events`, при потребі `map-handlers`/`travel-store` як у сусідніх тестах; подивись стиль мок-ів у `lib/server/world/__tests__/world-events.test.ts` та інших `__tests__` проєкту). Кейси:
  1. `restHandler` успіх: герої на мапі, `applied: true` → `writeRestLog` викликано з `at` = позиція першого героя, `publishWorldChanged(campaignId, mapId)` викликано, відповідь `{ ok: true, applied: true }`.
  2. `applied: false` → `writeRestLog` і `publishWorldChanged` не викликано, відповідь `{ ok: true, applied: false }`.
  3. Герой не на цій мапі (`readPositions` повертає іншу `mapId` або нічого) → 400 `WORLD_HERO_INVALID`, `applyWorldRest` не викликано.
  4. `travelHandler` з `rest: "long"` → `applyWorldRest` викликано ДО `commitTravel`; з `rest: "none"` — не викликано; `applyWorldRest` кидає `ContentError(…, 409)` → відповідь 409, `commitTravel` не викликано.
- [ ] **Step 2:** запустити → FAIL.
- [ ] **Step 3: Реалізація.**

```ts
export function restHandler(req: Request, campaignId: string) {
  return withDM(campaignId, "world rest", async (access) => {
    const body = await parseBody(restWorldSchema, req);

    if (body instanceof NextResponse) return body;

    const map = await ownedMap(campaignId, body.mapId);

    if (map instanceof NextResponse) return map;

    const heroes = await validHeroes(campaignId, body.characterIds);

    if (heroes instanceof NextResponse) return heroes;

    const positions = await readPositions(body.characterIds);

    const first = positions.get(body.characterIds[0]);

    if (body.characterIds.some((id) => positions.get(id)?.mapId !== map.id) || !first) return errorResponse(API_ERRORS.WORLD_HERO_INVALID, 400);

    const { applied } = await applyWorldRest(access, body.kind, body.characterIds);

    if (applied) {
      await writeRestLog({ campaignId, userId: access.userId, mapId: map.id, kind: body.kind, characterIds: body.characterIds, at: { x: first.x, y: first.y } });

      publishWorldChanged(campaignId, map.id);
    }

    return NextResponse.json({ ok: true, applied });
  });
}
```

У `travelHandler`, `enterHandler`, `exitHandler` одразу після `validHeroes` (в `exitHandler` — після перевірки позицій) і перед `commitTravel`:
`if (body.rest !== "none") await applyWorldRest(access, body.rest, body.characterIds);`
`route.ts` — копія `travel/route.ts` з `restHandler`.
- [ ] **Step 4:** тести проходять; `pnpm test:related lib/server/world/travel-handlers.ts`; tsc.
- [ ] **Step 5: Commit** `feat(world-rest): POST /world/rest and rest restoration on travel`.

### Task 3: Клієнт — api, хуки, панель, журнал

**Files:** `lib/api/world.ts`, `lib/hooks/world/useWorldTravel.ts`, `lib/hooks/world/useTravelPanel.ts`, `components/world/travel/TravelPanel.tsx`, `components/world/travel/TravelLog.tsx`, тести `TravelPanel.test.tsx`, `TravelLog.test.tsx`

**Interfaces:**
- Consumes: `POST /world/rest` з Task 2; `useCampaignRules(campaignId)` з `@/lib/hooks/campaigns` (`data?.outOfCombat.persistResources`).
- Produces: `restHeroes(campaignId, data: { mapId: string; characterIds: string[]; kind: "short" | "long" }): Promise<{ ok: true; applied: boolean }>`; `useWorldTravel` повертає ще `rest`; `useTravelPanel` повертає `restEnabled: boolean`, `canRest: boolean`, `restNow(): void`.

- [ ] **Step 1: Тести.** `TravelPanel.test.tsx`: додати `vi.mock("@/lib/api/rules")` і `vi.mocked(getCampaignRules).mockResolvedValue({ ...DEFAULT_RULES })` у `beforeEach` (`DEFAULT_RULES` з `@/lib/utils/rules`; `persistResources` там `false`, тож у тестах «увімкнено» передавати `outOfCombat: { ...DEFAULT_RULES.outOfCombat, persistResources: true }`). Кейси: (a) правила вимкнено → кнопка «Відпочити» disabled і є підказка «Ресурси між боями вимкнені в правилах кампанії»; (b) правила ввімкнено, обрано героя й «Довгий» → клік викликає `api.restHeroes("c1", { mapId: "m1", characterIds: ["h1"], kind: "long" })`; (c) вибір «Без відпочинку» → кнопка disabled; (d) вибір відпочинку при вимкнених правилах не ламає «Перемістити». `TravelLog.test.tsx`: запис `kind: "rest"` рендерить бейдж «Відпочинок».
- [ ] **Step 2:** запустити → FAIL.
- [ ] **Step 3: Реалізація.**
  - `lib/api/world.ts`: `type RestResult = { ok: true; applied: boolean };` `export const restHeroes = (campaignId: string, data: { mapId: string; characterIds: string[]; kind: "short" | "long" }) => campaignPost<RestResult>(campaignId, "/world/rest", data);`
  - `useWorldTravel`: мутація `rest` (`restHeroes`, ті самі `invalidateKeys`, `errorText: "Не вдалося провести відпочинок"`); додати в `isPending` і повернення.
  - `useTravelPanel`: `const { data: rules } = useCampaignRules(campaignId)`; `restEnabled = !!rules?.outOfCombat.persistResources`; `canRest = ready && restEnabled && rest !== "none"`; `restNow: () => { if (canRest && rest !== "none") run(() => rest_mutation.mutateAsync({ mapId, characterIds: selected, kind: rest })); }` (уникнути конфлікту імені зі станом `rest`, напр. змінну мутації назвати `restMutation`).
  - `TravelPanel`: поруч із кнопками дій `Button` «Відпочити» (іконка `Moon`) з `disabled={!panel.canRest}` і `onClick={panel.restNow}`; під ним, коли `!panel.restEnabled`, `<p className="text-xs text-hud-muted">Ресурси між боями вимкнені в правилах кампанії.</p>`.
  - `TravelLog`: `KIND_BADGE.rest = { label: "Відпочинок", tone: "muted", icon: <Moon className="size-3" aria-hidden /> }`; для `kind === "rest"` не дублювати пілюлю `REST_LABEL` (показується лише бейдж kind + підпис short/long можна лишити як є).
- [ ] **Step 4:** `pnpm test:related components/world/travel/TravelPanel.tsx lib/hooks/world/useTravelPanel.ts`; `pnpm lint --fix` на торкнутих; tsc чистий.
- [ ] **Step 5: Commit** `feat(world-rest): rest button in travel panel and rest log badge`.

### Task 4: Документація та фінал

**Files:** `lib/onboarding/whats-new.ts`, `docs/architecture/world-map.md`, `docs/STATUS.md`

- [ ] Додати запис у `whats-new.ts` (формат сусідніх, `id: "2026-10-28-world-rest"`, `audience: "dm"` якщо такий варіант є в типі, інакше `"all"`; текст: «Відпочинок на карті світу: ДМ відпочиває партією з панелі подорожі — ресурси героїв відновлюються за правилами кампанії, запис потрапляє в журнал.»).
- [ ] `world-map.md`: замінити рядок про «Rest лише запис» на опис `POST /world/rest`, `applyWorldRest`, поведінки при вимкнених правилах і `kind: "rest"` у журналі.
- [ ] `STATUS.md`: у рядку «Карта світу» прибрати `restParty лише після constructor`, додати «відпочинок на карті (short/long)».
- [ ] Commit `docs(world-rest): whats-new, architecture and status`.
- [ ] Далі за CLAUDE.md: `/simplify` на diff гілки, повний `pnpm test:run` один раз, `pnpm lint`, `pnpm exec tsc --noEmit`, один фінальний Opus-рев'ю, merge у `main`, `git mv` спеки й плану в `docs/archive/superpowers/`.

## Self-review

Покриття спеки: сервіс (T1), маршрут + travel-інтеграція + 409 (T2), клієнт/UI/журнал (T3), документація (T4). Імена збігаються: `applyWorldRest`, `writeRestLog`, `restWorldSchema`, `restHeroes`, `restEnabled`/`canRest`/`restNow`. Хук правил — `useCampaignRules` (`lib/hooks/campaigns`).
