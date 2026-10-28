# Бойова карта — блок 4: FX і фінальна перевірка — план реалізації

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Анімації бою грають на карті: правильний якір (токен карти, з урахуванням видимої області), AoE — у центр шаблону, плитка обраного учасника реагує на удар, шкода небезпечної місцевості має власний запис журналу, battle-sweep перевіряє бій із картою.

**Architecture:** FX-шар знаходить точки через DOM (`components/battle/fx/runtime/anchors.ts`). Ранжування якорів робимо явним (`map` > `main` > `detail` > `track`) і відсікаємо якорі поза `[data-fx-clip]`. Точку наведення заклинання сервер пише в `actionDetails.aimCell`; `mapAction` переносить її у `FxSpec.at`, а `resolvePoints` перетворює на екранну точку через `polygon[data-fx-cell]`. Шкода небезпеки (рух і початок ходу) пишеться окремим записом журналу з `actionDetails.hazard`.

**Tech Stack:** Next.js 16, React 19, TypeScript strict, Vitest (`environment: node`; DOM-тести — `// @vitest-environment happy-dom`), Prisma 6, tsx-скрипти.

**Spec:** `docs/archive/superpowers/specs/2026-10-18-battle-map.md` — розділи «Контракт з анімаціями», «Ефекти на карті (рішення 2026-10-19)», «Заклинання й шаблони (блок 3)».

## Global Constraints

- Мова: коментарі й тексти UI — українською; ідентифікатори — англійською. Коментарі лише для неочевидного «чому», один рядок (`CLAUDE.md`, глобальні інструкції).
- Шари: компоненти не імпортують `@/lib/api/*`; логіка — у `lib/utils/**` і хуках `lib/hooks/**`; компонент лише викликає й рендерить.
- Параметри й виходи хуків групувати в обʼєкти; для дискримінованих union — handler map замість довгого `switch`.
- Імпорти — `simple-import-sort`; порожній рядок навколо `const`/`let`/`if`/`return`/блоків (`pnpm lint --fix`).
- Без карти й у вигляді «Колонки» поведінка не змінюється (рішення користувача: «Кожна фіча карти мусить мати поведінку без карти»).
- Desktop не змінюється, крім явно описаного; телефонний режим карти (`phone`: обрізка, поворот, вертикальна прокрутка) має працювати з усім, що тут додається.
- Комітити лише свої файли явними шляхами (`git add <paths>`); повідомлення закінчується рядком `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Не мерджити, не пушити, prod не чіпати.
- Перед кожним комітом: `pnpm exec tsc --noEmit` і `pnpm lint` чисті, тести задачі зелені.

## Review Focus

1. **Токен відсунуто з видимої частини карти зумом/панорамою** — анімація не має грати «в порожнечу» над краєм карти: якір поза `[data-fx-clip]` вважається невидимим, береться наступний за рангом видимий якір (рядок, герой) або відступ із краю екрана, як зараз. → тест у Task 1.
2. **Заклинання-шаблон у бою без карти або без `aimCell`** — `area` летить у центроїд цілей, як раніше. → тест у Task 2.
3. **Клітинка центру шаблону невидима** (прокручена за край телефонної карти чи за `data-fx-clip`) — відкат до центроїда цілей, а не точка поза картою. → тест у Task 2.
4. **DOT і небезпека на початку одного ходу** — два окремі записи журналу, сума їхніх змін HP дорівнює фактичній зміні, без подвійного рахунку. → тест у Task 4.
5. **Плитка деталей показує іншого учасника, ніж ціль** — плитка не реагує; реагує лише плитка цілі. → тест у Task 3.

---

### Task 1: Ранжування FX-якорів і відсікання за `[data-fx-clip]`

**Files:**
- Modify: `components/battle/fx/runtime/anchors.ts`
- Modify: `components/battle/hud/Portrait.tsx` (проп `fx` отримує значення `"detail"`; `data-fx-anchor` для `track` і `detail`)
- Test: `components/battle/fx/__tests__/anchors.test.ts`

**Interfaces:**
- Consumes: розмітку з блоку 2: токен `[data-fx-participant][data-fx-anchor="map"]` (`components/battle/map/MapToken.tsx`), контейнер карти `[data-fx-clip]`, портрети `Portrait fx="main" | "track"`.
- Produces:
  - `PortraitProps.fx?: "main" | "track" | "detail"`; `data-fx-anchor` = `"track"` / `"detail"` / відсутній для `main`.
  - `findAnchor(id, root)` повертає видимий якір з найвищим рангом: `map` (0) > без атрибута, тобто `main` (1) > `detail` (2) > `track` (3). Експортувати `anchorRank(el: HTMLElement): number` для тестів.
  - `visible(el)` додатково вимагає перетину з прямокутником найближчого `[data-fx-clip]` (якщо якір усередині нього). Наявна перевірка прокручуваного батька лишається.

- [ ] **Step 1: Write the failing tests** — додати до `anchors.test.ts` (хелпери `anchor`, `mapClip`, `domRect`, `spec` уже є у файлі; допиши хелпер для `data-fx-anchor`):

```ts
function ranked(id: string, rect: Rect, kind: "map" | "detail" | "track" | null, parent: HTMLElement = document.body) {
  const el = anchor(id, rect, false, parent);

  if (kind) el.dataset.fxAnchor = kind;

  return el;
}

describe("ранжування якорів", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("токен карти важливіший за рядок, плитку деталей і трек — незалежно від порядку в DOM", () => {
    ranked("t", { x: 10, y: 10, w: 20, h: 20 }, "track");
    ranked("t", { x: 40, y: 10, w: 20, h: 20 }, "detail");
    ranked("t", { x: 70, y: 10, w: 20, h: 20 }, null);
    ranked("t", { x: 100, y: 10, w: 20, h: 20 }, "map");

    expect(resolvePoints(spec())?.to[0]).toEqual({ x: 110, y: 20 });
  });

  it("рядок важливіший за плитку деталей", () => {
    ranked("t", { x: 40, y: 10, w: 20, h: 20 }, "detail");
    ranked("t", { x: 70, y: 10, w: 20, h: 20 }, null);

    expect(resolvePoints(spec())?.to[0]).toEqual({ x: 80, y: 20 });
  });
});

describe("відсікання за [data-fx-clip]", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  function clipBox(rect: Rect) {
    const clip = document.createElement("div");

    clip.dataset.fxClip = "";
    clip.getBoundingClientRect = domRect(rect);
    document.body.appendChild(clip);

    return clip;
  }

  it("токен, відсунутий зумом за межі карти, невидимий — береться рядок", () => {
    const clip = clipBox({ x: 0, y: 0, w: 300, h: 200 });

    ranked("t", { x: 400, y: 50, w: 20, h: 20 }, "map", clip);
    ranked("t", { x: 500, y: 300, w: 20, h: 20 }, null);

    expect(resolvePoints(spec())?.to[0]).toEqual({ x: 510, y: 310 });
  });

  it("токен усередині видимої частини карти лишається першим", () => {
    const clip = clipBox({ x: 0, y: 0, w: 300, h: 200 });

    ranked("t", { x: 100, y: 50, w: 20, h: 20 }, "map", clip);
    ranked("t", { x: 500, y: 300, w: 20, h: 20 }, null);

    expect(resolvePoints(spec())?.to[0]).toEqual({ x: 110, y: 60 });
  });

  it("постріл: from — токен стрільця на карті, to — токен цілі", () => {
    const clip = clipBox({ x: 0, y: 0, w: 300, h: 200 });

    ranked("a", { x: 10, y: 10, w: 20, h: 20 }, "map", clip);
    ranked("a", { x: 500, y: 300, w: 20, h: 20 }, null);
    ranked("t", { x: 200, y: 100, w: 20, h: 20 }, "map", clip);

    const points = resolvePoints(spec({ archetype: "ranged" }));

    expect(points?.from).toEqual({ x: 20, y: 20 });
    expect(points?.to[0]).toEqual({ x: 210, y: 110 });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test:run components/battle/fx/__tests__/anchors.test.ts`
Expected: FAIL — нові кейси ранжування й відсікання (поточний `findAnchor` бере перший не-трек якір у порядку DOM і не дивиться на `[data-fx-clip]`).

- [ ] **Step 3: Implement** — у `anchors.ts`:

```ts
const RANK: Record<string, number> = { map: 0, detail: 2, track: 3 };

/** map > main (без атрибута) > detail > track */
export function anchorRank(el: HTMLElement): number {
  return RANK[el.dataset.fxAnchor ?? ""] ?? 1;
}

function clipBox(el: HTMLElement): Box | null {
  return el.closest<HTMLElement>("[data-fx-clip]")?.getBoundingClientRect() ?? null;
}

function visible(el: HTMLElement) {
  const r = el.getBoundingClientRect();

  if (r.width <= 0 || r.height <= 0 || !overlaps(r, { top: 0, left: 0, bottom: window.innerHeight, right: window.innerWidth })) return false;

  // зум і панорама виносять токен за межі карти, хоч він і в межах вікна
  const clip = clipBox(el);

  if (clip && !overlaps(r, clip)) return false;

  const viewport = scrollViewport(el);

  return !viewport || overlaps(r, viewport);
}

function findAnchor(id: string, root: ParentNode = document): HTMLElement | null {
  const all = [...root.querySelectorAll<HTMLElement>(`[data-fx-participant="${escape(id)}"]`)].filter(visible);

  return all.sort((a, b) => anchorRank(a) - anchorRank(b))[0] ?? null;
}
```

У `Portrait.tsx`: `fx?: "main" | "track" | "detail"` і `data-fx-anchor={fx && fx !== "main" ? fx : undefined}`.

- [ ] **Step 4: Run tests** — `pnpm test:run components/battle/fx components/battle/hud` → PASS (наявні тести треку й телефонної прокрутки теж зелені).

- [ ] **Step 5: Commit**

```bash
git add components/battle/fx/runtime/anchors.ts components/battle/hud/Portrait.tsx components/battle/fx/__tests__/anchors.test.ts
git commit -m "feat(battle-fx): rank map anchors first and skip tokens outside the visible map

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: AoE-анімація в центр шаблону (`aimCell` → `FxSpec.at`)

**Files:**
- Modify: `types/battle.ts` (у `BattleAction.actionDetails` додати `aimCell?: GridPoint`)
- Modify: `app/api/campaigns/[id]/battles/[battleId]/spell/spell-mutation.ts` (записати `aimCell`, коли каст пройшов з `targetCell` і на карті)
- Modify: `lib/utils/battle/fx/types.ts` (`FxSpec.at?: { x: number; y: number }` — клітинка), `lib/utils/battle/fx/map-action.ts`
- Modify: `components/battle/fx/runtime/anchors.ts` (`resolvePoints` повертає `at?: FxPoint`), `components/battle/fx/runtime/play.ts` (передати `at` в анімацію, локалізоване), `components/battle/fx/animations/types.ts` (поле `at?: FxPoint` у параметрах анімації), `components/battle/fx/animations/area.ts`
- Test: `lib/utils/battle/fx/__tests__/map-action.test.ts` (створити, якщо немає — перевір `ls lib/utils/battle/fx/__tests__`), `components/battle/fx/__tests__/anchors.test.ts`, тест мутації заклинання поруч із наявними (`grep -rln "createSpellMutation" app/api/__tests__ lib`) — знайди файл, де тестується каст із `targetCell` (блок 3), і додай кейс туди.

**Interfaces:**
- Consumes: `spellSchema.targetCell` (`cast-spell-schema.ts`), `resolveTemplate`/`resolveSkillRadius` (`lib/utils/battle/spell/spell-targeting.ts`) — каст із точкою. Якір клітинки `polygon[data-fx-cell="x:y"]` (BattleMap). Видимість — `visible()` з Task 1.
- Produces:
  - `BattleAction.actionDetails.aimCell?: GridPoint` — лише для кастів, де `targetCell` використано для шаблону або радіуса навички (тобто `resolution.cells` є).
  - `FxSpec.at?: GridPoint` — `mapAction` копіює `actionDetails.aimCell` для `spell`.
  - `resolvePoints(...)` → `{ from, to, at?, targetEls, actorEl }`; `at` — центр bbox видимого `polygon[data-fx-cell="${x}:${y}"]`, або `undefined`.
  - `FxAnimationArgs.at?: FxPoint` (локальні координати шару); `area` бере `at ?? centroid(to)`.

- [ ] **Step 1: Failing tests**

`lib/utils/battle/fx/__tests__/map-action.test.ts` (node env):

```ts
import { describe, expect, it } from "vitest";

import { mapAction } from "@/lib/utils/battle/fx";
import type { BattleAction } from "@/types/battle";

const cast = (details: Partial<BattleAction["actionDetails"]>): BattleAction =>
  ({
    id: "e1", battleId: "b", round: 1, actionIndex: 1, timestamp: new Date(), actorId: "c", actorName: "C", actorSide: "ally",
    actionType: "spell", targets: [{ participantId: "t1", participantName: "T1" }, { participantId: "t2", participantName: "T2" }],
    actionDetails: { spellName: "Вогняна куля", spellTargeting: "template", totalDamage: 12, ...details }, resultText: "", hpChanges: [], isCancelled: false,
  }) as unknown as BattleAction;

describe("mapAction — точка шаблону", () => {
  it("переносить aimCell у FxSpec.at", () => {
    expect(mapAction(cast({ aimCell: { x: 4, y: 2 } }))[0].at).toEqual({ x: 4, y: 2 });
  });

  it("без aimCell (бій без карти) — at відсутнє", () => {
    expect(mapAction(cast({}))[0].at).toBeUndefined();
  });
});
```

У `anchors.test.ts`:

```ts
describe("точка шаблону", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  function cell(key: string, rect: Rect, parent: HTMLElement = document.body) {
    const el = document.createElementNS("http://www.w3.org/2000/svg", "polygon");

    el.setAttribute("data-fx-cell", key);
    (el as unknown as HTMLElement).getBoundingClientRect = domRect(rect);
    parent.appendChild(el);

    return el;
  }

  it("at — центр видимої клітинки центру шаблону", () => {
    anchor("t", { x: 10, y: 10, w: 20, h: 20 });
    cell("4:2", { x: 100, y: 100, w: 30, h: 30 });

    expect(resolvePoints(spec({ archetype: "area", at: { x: 4, y: 2 } }))?.at).toEqual({ x: 115, y: 115 });
  });

  it("клітинка прокручена за край телефонної карти — at відсутнє (відкат до центроїда)", () => {
    const clip = mapClip({ x: 0, y: 0, w: 300, h: 200 }, true);

    anchor("t", { x: 10, y: 10, w: 20, h: 20 }, false, clip);
    cell("4:2", { x: 100, y: 500, w: 30, h: 30 }, clip);

    expect(resolvePoints(spec({ archetype: "area", at: { x: 4, y: 2 } }))?.at).toBeUndefined();
  });
});
```

Тест мутації: каст шаблонного заклинання з `targetCell: { x, y }` на бою з картою → у створеній події `details.actionDetails.aimCell` дорівнює `targetCell`; каст одиночного заклинання без карти → `aimCell` відсутній. Використай фікстури й хелпери того файлу, де вже тестується `targetCell` (блок 3).

- [ ] **Step 2: Run** — `pnpm test:run lib/utils/battle/fx components/battle/fx/__tests__/anchors.test.ts` + файл тесту мутації → FAIL.

- [ ] **Step 3: Implement**

`map-action.ts`, у `primary()` для `spell`:

```ts
if (action.actionType === "spell") return { ...base, ...spellArchetype(action), hit: true, ...(d.aimCell && { at: d.aimCell }) };
```

`anchors.ts`:

```ts
function cellPoint(at: { x: number; y: number }, root: ParentNode): FxPoint | undefined {
  const el = root.querySelector<HTMLElement>(`[data-fx-cell="${at.x}:${at.y}"]`);

  return el && visible(el) ? centerOf(el) : undefined;
}
```

і в `resolvePoints` повернути `...(spec.at && { at: cellPoint(spec.at, root) })` (поле `at` лише коли точка знайдена — `at: undefined` не ставити). `play.ts`: `...(points.at && { at: local(points.at) })` у виклику анімації. `animations/types.ts`: `at?: FxPoint`. `area.ts`:

```ts
export const area: FxAnimation = async ({ stage, from, to, at, palette, spec }) => {
  if (!to.length) return;

  const center = at ?? { x: to.reduce((s, p) => s + p.x, 0) / to.length, y: to.reduce((s, p) => s + p.y, 0) / to.length };
  // далі без змін
```

`spell-mutation.ts`: після успішного розвʼязання цілей, якщо `resolution.cells` є і `data.targetCell` задано — `actionDetails.aimCell = data.targetCell` (там, де мутація доповнює `battleAction.actionDetails`; поле має потрапити і в превʼю, і у збережену подію).

- [ ] **Step 4: Run** — ті самі тести → PASS; `pnpm test:run components/battle/fx lib/utils/battle/fx app/api` → PASS.

- [ ] **Step 5: Commit**

```bash
git add types/battle.ts app/api/campaigns/[id]/battles/[battleId]/spell/spell-mutation.ts lib/utils/battle/fx/types.ts lib/utils/battle/fx/map-action.ts lib/utils/battle/fx/__tests__/map-action.test.ts components/battle/fx/runtime/anchors.ts components/battle/fx/runtime/play.ts components/battle/fx/animations/types.ts components/battle/fx/animations/area.ts components/battle/fx/__tests__/anchors.test.ts <файл тесту мутації>
git commit -m "feat(battle-fx): area spells burst at the template centre on the map

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Плитка обраного учасника реагує на удар

**Files:**
- Modify: `components/battle/participants/ParticipantDetails.tsx`
- Test: `components/battle/participants/__tests__/participant-details-fx.test.tsx` (створити; подивись, як `field.test.tsx` і тести `ParticipantRow` мокають `useBattleSceneData`/`useFxImpacts`)

**Interfaces:**
- Consumes: `useHitFx<T>(hp, impact)` (`lib/hooks/battle/useHitFx.ts`) → `{ change, shakeRef, delayStyle }`; `useFxImpacts()` (`lib/hooks/battle/useFxImpact.ts`) → `(id) => FxImpact | null`; `HitFrame` (`components/battle/fx/PortraitFx.tsx`); `Portrait fx="detail"` (Task 1). Еталон розмітки — `ParticipantRow.tsx` (плаваюче число `hud-float`, спалах `hud-flash-red/green`, `HitFrame`).
- Produces: портрет плитки — додатковий якір `data-fx-participant` з `data-fx-anchor="detail"` (нижчий ранг за токен і рядок, тож основна анімація грає на токені); зміна HP на плитці — плаваюче число + спалах/рамка удару, як у рядку.

- [ ] **Step 1: Failing test** (happy-dom): рендер `ParticipantDetails` для `participant` із HP 50; перерендер із HP 40 і `impactFor(id)` → `{ kind: "damage", delayMs: 0 }` (реальну форму `FxImpact` візьми з `lib/utils/battle/fx/impact.ts`):
  - зʼявляється елемент з текстом `−10` (знак із `signedDelta`), клас `animate-[hud-float`;
  - портрет має `data-fx-participant=id` і `data-fx-anchor="detail"`;
  - **Review Focus 5:** перерендер іншого учасника (інший `id`, `impactFor` повертає impact лише для цілі) — числа немає.

- [ ] **Step 2: Run** — `pnpm test:run components/battle/participants/__tests__/participant-details-fx.test.tsx` → FAIL.

- [ ] **Step 3: Implement** — у `ParticipantDetails`:

```tsx
const impactFor = useFxImpacts();

const { change, shakeRef, delayStyle } = useHitFx<HTMLDivElement>(participant.combatStats.currentHp, impactFor(participant.basicInfo.id));
```

Обгорнути блок портрета й імені в `<div ref={shakeRef} className="relative flex items-center gap-4">`, усередині `<HitFrame change={change} />`, плаваюче число (той самий JSX, що в `ParticipantRow`, з `delayStyle`), а портрет — `<ZoomablePortrait key={`portrait:${change?.id ?? ""}`} participant={participant} fx="detail" size={64} className={cn(change && !change.impact && (change.delta < 0 ? "animate-[hud-flash-red_.5s]" : "animate-[hud-flash-green_.7s]"))} />`. `useHitFx` має скидатися при зміні учасника: додай `key={participant.basicInfo.id}` на `ParticipantDetails` у місцях виклику (`DesktopBattleLayout.tsx`, `MobileBattleLayout.tsx`), щоб перемикання вибору не показало чужу дельту.

- [ ] **Step 4: Run** — `pnpm test:run components/battle/participants components/battle/scene` → PASS.

- [ ] **Step 5: Commit**

```bash
git add components/battle/participants/ParticipantDetails.tsx components/battle/participants/__tests__/participant-details-fx.test.tsx components/battle/scene/DesktopBattleLayout.tsx components/battle/scene/MobileBattleLayout.tsx
git commit -m "feat(battle-fx): the selected participant tile reacts to hits

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Окремий запис журналу для небезпечної місцевості

**Files:**
- Modify: `types/battle.ts` (`actionDetails.hazard?: { label: string; damageType: string; damage: number }`)
- Modify: `lib/utils/battle/turn/start-end.ts` (`StartOfTurnResult.hazard?: { message: string; damage: number; hpBefore: number; hpAfter: number; label: string; damageType: string }`; повідомлення небезпеки більше не йде в `damageMessages`)
- Modify: `lib/utils/battle/turn/run-advance-turn-loop.ts` (окремий запис для небезпеки; запис DOT — лише якщо є DOT-повідомлення, його `hpChanges` — до шкоди небезпеки)
- Modify: `app/api/campaigns/[id]/battles/[battleId]/move/move-mutation.ts` (`resolveHazardHit`: додати `actionDetails.hazard`)
- Modify: `lib/utils/battle/view/log-entry.ts` (`kindLabel: "небезпека"`, `kind: "hazard"` у `LogEntryView` для записів з `actionDetails.hazard`), `components/battle/log/LogEntryCard.tsx` (іконка `Flame` для `view.kind === "hazard"`)
- Test: `lib/utils/battle/turn/__tests__/` (знайди тест `processStartOfTurn`/небезпеки з блоку 2d: `grep -rln "hazardHitRound\|hazardUnder" lib/utils/battle/turn/__tests__ lib/utils/battle/__tests__`), `lib/utils/battle/view/__tests__/log-entry.test.ts` (або наявний тест `logEntryView`), тест мутації руху з небезпекою.

**Interfaces:**
- Consumes: `hazardHit(...)` → `{ participant, message, damage }` (`lib/utils/battle/grid/hazard.ts`), `hazardUnder(map, p)` → `TerrainCell | null`.
- Produces: `actionDetails.hazard` у подіях «небезпека» (рух і початок ходу); `LogEntryView.kind?: "hazard"`; `BATTLE_ACTION_LABELS` не змінюється — підміна мітки лише в `logEntryView`.

- [ ] **Step 1: Failing tests**
  - `processStartOfTurn` для учасника з DOT-ефектом, що стоїть на небезпеці: `damageMessages` містить лише DOT; `hazard` заповнений; `hazard.hpBefore` = HP після DOT, `hazard.hpAfter` = HP після небезпеки.
  - Цикл ходу (`run-advance-turn-loop` через наявний тест advance turn): **Review Focus 4** — два записи, перший з `damageRolls[0].dice === "DOT"`, другий з `actionDetails.hazard`; `-(change₁ + change₂)` дорівнює загальній втраті HP; запис DOT не виникає, якщо є лише небезпека.
  - Мутація руху на небезпечну клітинку: подія має `details.actionDetails.hazard.label` (мітка клітинки або «Небезпечна місцевість»).
  - `logEntryView` для запису з `hazard` → `kindLabel === "небезпека"`, `kind === "hazard"`.

- [ ] **Step 2: Run** — `pnpm test:run lib/utils/battle/turn lib/utils/battle/view app/api` → FAIL.

- [ ] **Step 3: Implement**
  - `start-end.ts`: замість `damageMessages.push(hit.message)` → `hazardResult = { message: hit.message, damage: hit.damage, hpBefore: updatedParticipant.combatStats.currentHp /* до hit */, hpAfter: hit.participant.combatStats.currentHp, label: hazard.label ?? "Небезпечна місцевість", damageType: hazard.damage?.type ?? "" }`; повернути `...(hazardResult && { hazard: hazardResult })`.
  - `run-advance-turn-loop.ts`: запис DOT — як зараз, але `newHp: turnResult.hazard?.hpBefore ?? turnResult.participant.combatStats.currentHp`; після нього, якщо `turnResult.hazard`, — новий запис `actionType: "ability"`, `id: hazard-${nextTurnIndex}-${Date.now()}-${attempts}`, `actionDetails: { hazard: { label, damageType, damage }, damageRolls: [{ dice: "", results: [], total: damage, damageType }] }`, `resultText: hazard.message`, `hpChanges` від `hpBefore` до `hpAfter`, решта полів — як у записі DOT.
  - `move-mutation.ts` `resolveHazardHit`: `actionDetails: { hazard: { label: cell.label ?? "Небезпечна місцевість", damageType: cell.damage?.type ?? "", damage: hit.damage }, damageRolls: [...] }`.
  - `log-entry.ts`: `const hazard = !!e.actionDetails?.hazard;` → `kindLabel: hazard ? "небезпека" : (BATTLE_ACTION_LABELS[e.actionType] ?? "подія")`, `...(hazard && { kind: "hazard" as const })`; тип `LogEntryView` доповнити `kind?: "hazard"`.
  - `LogEntryCard.tsx`: `const Icon = view.kind === "hazard" ? Flame : (ICON[entry.actionType] ?? Sparkles);`.

- [ ] **Step 4: Run** — ті самі тести → PASS; `pnpm test:run lib/utils/battle components/battle/log app/api` → PASS.

- [ ] **Step 5: Commit**

```bash
git add types/battle.ts lib/utils/battle/turn/start-end.ts lib/utils/battle/turn/run-advance-turn-loop.ts app/api/campaigns/[id]/battles/[battleId]/move/move-mutation.ts lib/utils/battle/view/log-entry.ts components/battle/log/LogEntryCard.tsx <змінені тести>
git commit -m "feat(battle-map): hazard damage gets its own log entry instead of DOT

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: battle-sweep — сценарій бою з картою

**Files:**
- Modify: `scripts/sim/battle-sweep.ts`

**Interfaces:**
- Consumes: хелпери скрипта `call(label, options, body, as?)`, `tcheck(name, ok, detail)`, `untilTurnOf(pred)`, `P()`, `byId`, `current()`, `heroRows`, `ctx`, `state`, `readState()`, `applyRotation(0)`; константи `START`, `NEXT`, `ATTACK`, `SPELL`; мутації `moveMutation`/`moveSchema` (`move/move-mutation.ts`) і `mapTerrainMutation`/`mapTerrainSchema` (`map-terrain/map-terrain-mutation.ts`). `runBattleMutation` сам розставляє учасників на карті (`placeParticipants`), якщо в бою є карта.
- Produces: `async function mapCheck(spells: Map<string, any>)`, викликається в `main()` поруч з `auraZoneCheck()`/`reserveCheck()`; додає рядки `tcheck` у звіт.

- [ ] **Step 1: Додати константи**

```ts
const MOVE = { access: "currentController", requireStatus: "active", schema: moveSchema, mutate: moveMutation };

const MAP_TERRAIN = { access: "dm", requireStatus: "active", schema: mapTerrainSchema, mutate: mapTerrainMutation };
```

(звір поля `access`/`requireStatus` з route.ts цих двох маршрутів і використай ті самі значення).

- [ ] **Step 2: Написати `mapCheck`** — бій `ТЕСТ Карта` з героями й двома юнітами, `map: { cols: 12, rows: 8, background: null, opacity: 0.5 }` у `prisma.battleScene.create`, старт через `START`. Перевірки (кожна — `tcheck`):
  1. **Розстановка:** після старту всі активні учасники мають `battleData.position`.
  2. **Рух:** поточний учасник рухається на сусідню вільну клітинку → 200, позиція змінилась.
  3. **Досяжність ближньої атаки:** герой атакує ближньою атакою ворога на відстані > 1 клітинки → 422 з текстом про «не поруч».
  4. **Шаблон:** DM-каст (`free: true`) «Вогняна куля» від героя з `targetCell` = позиція ворога → 200; остання подія має `actionDetails.aimCell` = `targetCell` (Task 2) і серед цілей є цей ворог.
  5. **Небезпека:** `MAP_TERRAIN` ставить `hazard` з `damage: { dice: "1d4", type: "fire" }` під героєм, `untilTurnOf` до його ходу → HP зменшився, у журналі запис з `actionDetails.hazard` (Task 4).

- [ ] **Step 3: Run**

Run: `DATABASE_URL=postgresql://postgres:postgres@localhost:54322/prodcopy pnpm battle-sweep`
Expected: рядки `✅ Карта: …` для всіх п'яти перевірок; підсумок `помилок: 0`.

- [ ] **Step 4: Commit**

```bash
git add scripts/sim/battle-sweep.ts
git commit -m "test(sweep): a battle on a map — placement, move, reach, template aim, hazard log

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Браузерна перевірка (виконує контролер, не субагент)

Локально: `pnpm dev --port 3123`, бої HOMM5 `cmveetc330004ey7047tsw1b2` (гробниця) і `cmvea2gxs026veyk7mcfddzje`. Телефон — iframe 390×700 у тій самій вкладці; клітинки — dispatch pointer-подій на `polygon[data-fx-cell]`.

- [ ] Desktop, карта: атака ближня/дальня — анімація з токена в токен; зум колесом, токен цілі за межами видимої частини — анімація не грає над порожнім краєм.
- [ ] Desktop, Вогняна куля через «Навести на карті» — вибух у центрі шаблону (скриншот у момент вибуху: `computer screenshot` одразу після «Підтвердити»).
- [ ] Desktop, обраний учасник у правій колонці отримує удар — плаваюче число й рамка на плитці.
- [ ] Небезпека: Вогняна стіна → учасник на лінії на початку ходу → у журналі запис «небезпека» з іконкою полумʼя, окремо від DOT.
- [ ] Телефон (iframe): атака й шаблон на поверненій/обрізаній карті — анімації в правильних точках; токен прокручений за край — анімації немає.
- [ ] Два гравці одночасно: дві вкладки (ДМ і друга вкладка з тим самим акаунтом, що контролює іншого героя, або ДМ-вкладка + вкладка гравця, якщо доступна) — дія в одній вкладці програє FX в іншій (Pusher-дельта). Якщо другий акаунт недоступний — зафіксувати це як неперевірене.
- [ ] Скриншоти зберегти й перелічити у звіті користувачу.
