# Battle FX MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every battle action (attack, spell, heal, buff, debuff, death) plays a short animation on the battle scene that shows who acted, on whom and with what element, for every viewer (actor, other players, DM). Every effect that lasts 1+ round keeps a persistent status aura on its holder (e.g. plague → green glow rising from below) for as long as it is active.

**Architecture:** The server enriches spell events with `spellDamageType`, `spellTargeting`, `spellEffectKinds` and `appliedEffects`. The client turns each *new* `BattleAction` from the cached scene log into `FxSpec`s (pure, tested mapper in `lib/utils/battle/fx/`). A single fixed overlay (`BattleFxLayer`) plays them one by one with our own Canvas 2D runtime plus CC0 sprite sheets. Participant DOM nodes carry `data-fx-participant` anchors. There are no animation libraries; one animation = one file in `components/battle/fx/animations/`.

**Tech Stack:** Next.js 16, React 19, TypeScript strict, Vitest, Canvas 2D, CSS `steps()` sprite sheets.

**Spec:** The lab decision in memory `project-battle-fx`, plus the estimate plan `/Users/silentfox/.claude/plans/eager-stirring-newt.md`. Lab prototype on branch `feat/battle-fx-lab`: `components/battle/fx-lab/engines/canvas/*` (canvas runtime) and `engines/sprites/*` (sprite player); assets in `public/fx/sprites/` (CC0, `LICENSE.txt`).

## Global Constraints

- No animation libraries: remove `motion`, `gsap`, `pixi.js`, `@tsparticles/engine` and `@tsparticles/slim` from `package.json`. Use only Canvas 2D, CSS and WAAPI (`element.animate`).
- **One animation = one file** in `components/battle/fx/animations/` (user rule). Shared runtime lives in `components/battle/fx/runtime/`.
- Layering: components never import `@/lib/api/*`. Pure logic goes in `lib/utils/battle/fx/` (tested), React state in `lib/hooks/battle/`, and components only render.
- No new network requests, DB columns or migrations. New fields are optional keys inside `actionDetails` JSON (old events stay valid).
- Every `lib/utils/battle/fx/*` module has a sibling test in `lib/utils/battle/fx/__tests__/`.
- Comments: minimal and only for non-obvious "why"; Ukrainian for user-visible text; identifiers in English.
- Lint rules: `simple-import-sort`, `padding-line-between-statements` (blank lines around const/if/return), `react-hooks/exhaustive-deps` = error, `no-console` (only info/warn/error). Run `pnpm exec eslint --fix <files>`.
- Respect `prefers-reduced-motion` (FX off) and a user toggle stored in `localStorage` key `battle-fx` (`"off"` disables).
- Idle cost is zero: the canvas `requestAnimationFrame` loop runs only while particles/tweens/draws are alive.
- Status auras are CSS-only (transform/opacity keyframes, no JS loop, no canvas), at most `MAX_AURAS = 2` per participant, and hidden when FX is off. Under reduced motion the existing `.battle-hud` rule already stops their animation; they stay as a static glow.
- **Unclear spells/effects are asked, not guessed.** The user offered to clarify any spell whose data is not enough to pick an animation, element or aura. An implementer that meets such a case reports `NEEDS_CONTEXT` with the spell name(s); the controller collects them and asks the user in one batch.
- One aura = one file pair: `components/battle/fx/auras/<kind>.tsx` + `<kind>.module.css` (the keyframes live in the CSS module).

## Review Focus

1. **Page load / refetch must not replay history.** The first render, a full refetch after a Pusher gap, «Показати раніші» (history prepend) and a rollback must play nothing. Tested in Task 3 (`takeNewActions`).
2. **Burst of events** (attack + retaliation + morale + end_turn + deaths in one delta, or a tab returning after minutes) must not queue a long show. Keep at most `MAX_FX_BATCH = 6` newest actions and drop anything older. Tested in Task 3.
3. **Target not on screen** (mobile tab on the other side, scrolled list, a dead or removed participant). The animation must be skipped, never thrown, and the queue must keep moving. Tested in Task 5 (`resolvePoints`) and checked in the browser in Task 7.
4. **Actor not on screen** (mobile: enemy attacks while the Allies tab is shown). The projectile starts from the screen edge on the actor's side. Tested in Task 5.
5. **Cancelled / undone events** (`isCancelled`, or `actionIndex >= cancelledFrom`) never animate. Tested in Task 3.
6. **Many effects on one participant** (plague + burning + curse + blessing): exactly 2 auras by priority, so the row is never a light show. Effects ending (duration 0, removed, cleanse, rollback) remove the aura on the next render. Tested in Task 7 (`aurasOf`).

---

## File Structure

```
lib/utils/battle/fx/
  types.ts            FxArchetype, FxElement, FxSpec
  element.ts          damageType → FxElement
  timing.ts           IMPACT_MS per archetype (shared by animations and hit-sync)
  map-action.ts       BattleAction → FxSpec[]
  new-events.ts       takeNewActions(log, seen) → { actions, seen }
  impact-delay.ts     impactDelayFor(action, participantId)
  queue.ts            advanceFxQueue(state, log, enabled) — pure queue reducer
  aura.ts             aurasOf(effects) → FxAuraKind[] (persistent status auras)
  index.ts            barrel
  __tests__/*.test.ts
lib/utils/battle/spell/applied-effects.ts   diffAppliedEffects(before, after, targetIds)
lib/hooks/battle/useFxEnabled.ts            localStorage toggle + reduced motion
lib/hooks/battle/useBattleFxQueue.ts        new log entries → FxSpec queue
lib/hooks/battle/useFxImpactDelay.ts        delay for HP float/flash/shake of a participant
components/battle/fx/
  fx.css              sprite sheet + layer styles
  runtime/geometry.ts bezier, arcControl, rand, wait, lungeOffset
  runtime/canvas.ts   Stage, glow, sprite, emit, tween, show, ring, flash, shoot
  runtime/sprites.ts  SHEETS, playSheet()
  runtime/palette.ts  FxElement → colours
  runtime/anchors.ts  findAnchor(), resolvePoints()
  animations/types.ts FxRun, FxAnimation
  animations/melee.ts | ranged.ts | bolt.ts | area.ts | heal.ts | buff.ts | debuff.ts | summon.ts | death.ts
  animations/index.ts ANIMATIONS: Record<FxArchetype, FxAnimation>
  auras/<kind>.tsx + <kind>.module.css   one persistent aura per file pair
  auras/StatusAuras.tsx                  renders aurasOf(effects) around a portrait
  BattleFxLayer.tsx   fixed overlay, plays queue
app/dev/fx-lab/page.tsx + components/battle/fx-lab/*   playground re-pointed to the real library
```

---

### Task 1: Clean up the lab; extract the runtime

**Files:**
- Modify: `package.json`, `pnpm-lock.yaml` (via `pnpm remove motion gsap pixi.js @tsparticles/engine @tsparticles/slim`)
- Delete: `components/battle/fx-lab/engines/{css,motion,gsap,particles,pixi}/`
- Create: `components/battle/fx/runtime/geometry.ts` (from `fx-lab/engines/dom.ts`: keep `wait`, `rand`, `arcControl`, `bezier`, `sampleArc`, `lungeOffset`, plus the `FxPoint` type), `components/battle/fx/runtime/canvas.ts` (move `fx-lab/engines/canvas/shared.ts` without the colour constants `FIRE/STEEL/HEAL/CURSE`), `components/battle/fx/runtime/sprites.ts`, `components/battle/fx/fx.css`
- Modify: `components/battle/fx-lab/engines/canvas/*`, `components/battle/fx-lab/engines/sprites/*`, `components/battle/fx-lab/config.ts`, `components/battle/fx-lab/types.ts`, `components/battle/fx-lab/fx-lab.css`

**Interfaces:**
- Produces, `runtime/geometry.ts`:
  - `type FxPoint = { x: number; y: number }`
  - `wait(ms)`
  - `rand(min, max)`
  - `arcControl(from, to, lift): FxPoint`
  - `bezier(from, ctrl, to, t): FxPoint`
  - `sampleArc(from, to, lift, steps?)`
  - `lungeOffset(from, to, max?)`
- Produces, `runtime/canvas.ts`:
  - `interface Stage`
  - `stageFor(layer: HTMLElement): Stage`
  - `glow(color: string): HTMLCanvasElement`
  - `sprite(g, tex, x, y, sx, sy?, alpha?, additive?, anchorY?)`
  - `emit(s, at, opts)`
  - `tween(s, ms, fn): Promise<void>`
  - `show(s, draw): () => void`
  - `ring(s, at, color, ms, to, width?)`
  - `flash(s, at, tint, size, ms)`
  - `shoot(s, from: FxPoint, to: FxPoint, ms, tint, tints, wobble?)`. Note the changed signature: `from`/`to` instead of `ctx`.
- Produces, `runtime/sprites.ts`:
  - `SHEETS`, with keys `fireball`, `explosion`, `rings`, `spark`, `darkBolt`, `lightning` (`{ src, frames, fw, fh }`)
  - `playSheet(layer: HTMLElement, sheet, at: FxPoint, opts: { scale: number; ms: number; filter?: string; rotate?: number; delayMs?: number }): Promise<void>`. It appends a `.fxs-sheet` div, awaits `el.getAnimations()` finished, then removes it.

- [ ] **Step 1: Remove the packages**

Run: `pnpm remove motion gsap pixi.js @tsparticles/engine @tsparticles/slim`
Expected: `package.json` no longer lists them.

- [ ] **Step 2: Delete the rejected engines and move the runtime**

The lab files are untracked (never committed), so plain `rm`/`mv`:

```bash
rm -r components/battle/fx-lab/engines/css components/battle/fx-lab/engines/motion components/battle/fx-lab/engines/gsap components/battle/fx-lab/engines/particles components/battle/fx-lab/engines/pixi
mkdir -p components/battle/fx/runtime components/battle/fx/animations
mv components/battle/fx-lab/engines/dom.ts components/battle/fx/runtime/geometry.ts
mv components/battle/fx-lab/engines/canvas/shared.ts components/battle/fx/runtime/canvas.ts
```

Edit `runtime/geometry.ts`:
- Drop `spawn`, `setVars`, `finished`, `removeAll` and `frame` (DOM helpers only the deleted engines used).
- Add `export interface FxPoint { x: number; y: number }`.
- Change the import of `FxPoint` accordingly.

Edit `runtime/canvas.ts`:
- Import from `./geometry`.
- Delete the `FIRE/STEEL/HEAL/CURSE` constants.
- Change `shoot` to take explicit points:

```ts
export async function shoot(s: Stage, from: FxPoint, to: FxPoint, ms: number, tint: string, tints: string[], wobble = 0) {
  const ctrl = arcControl(from, to, wobble ? 30 : 60);

  let pos = from;

  const halo = glow(tint);

  const core = glow("#ffffff");

  const hide = show(s, (g) => {
    sprite(g, halo, pos.x, pos.y, 30 / 32);
    sprite(g, core, pos.x, pos.y, 30 / 90);
  });

  await tween(s, ms, (k) => {
    const p = bezier(from, ctrl, to, wobble ? k : k ** 1.4);

    pos = { x: p.x, y: p.y + Math.sin(k * Math.PI * 4) * wobble };

    for (let i = 0; i < 3; i++) emit(s, pos, { tints, speed: [10, 50], life: [0.25, 0.5], scale: [0.45, 0.05], spread: 4 });
  });
  hide();
}
```

`stageFor` must size the canvas to `layer.clientWidth/clientHeight × devicePixelRatio` on every call (already does). The `#rrggbb` + alpha-suffix trick in `glow` requires 6-digit hex colours; keep that requirement.

- [ ] **Step 3: Create `runtime/sprites.ts`**

```ts
import type { FxPoint } from "./geometry";

export interface Sheet {
  src: string;
  frames: number;
  fw: number;
  fh: number;
}

export const SHEETS = {
  fireball: { src: "/fx/sprites/fireball.png", frames: 9, fw: 64, fh: 32 },
  explosion: { src: "/fx/sprites/explosion.png", frames: 7, fw: 64, fh: 64 },
  rings: { src: "/fx/sprites/rings.png", frames: 7, fw: 64, fh: 64 },
  spark: { src: "/fx/sprites/spark.png", frames: 7, fw: 32, fh: 32 },
  darkBolt: { src: "/fx/sprites/dark-bolt.png", frames: 11, fw: 64, fh: 88 },
  lightning: { src: "/fx/sprites/lightning.png", frames: 10, fw: 64, fh: 128 },
} satisfies Record<string, Sheet>;

export async function playSheet(layer: HTMLElement, sheet: Sheet, at: FxPoint, opts: { scale: number; ms: number; filter?: string; rotate?: number; delayMs?: number; anchorY?: number }) {
  const el = document.createElement("div");

  const w = sheet.fw * opts.scale;

  const h = sheet.fh * opts.scale;

  el.className = "fxs-sheet";
  el.style.setProperty("--src", `url(${sheet.src})`);
  el.style.setProperty("--frames", String(sheet.frames));
  el.style.setProperty("--w", `${w}px`);
  el.style.setProperty("--h", `${h}px`);
  el.style.setProperty("--sheet-w", `${sheet.frames * w}px`);
  el.style.setProperty("--dur", `${opts.ms}ms`);
  el.style.left = `${at.x - w / 2}px`;
  el.style.top = `${at.y - h * (opts.anchorY ?? 0.5)}px`;

  if (opts.filter) el.style.filter = opts.filter;

  if (opts.rotate) el.style.rotate = `${opts.rotate}rad`;

  if (opts.delayMs) el.style.animationDelay = `${opts.delayMs}ms`;

  layer.appendChild(el);
  await Promise.all(el.getAnimations().map((a) => a.finished.catch(() => undefined)));
  el.remove();
}
```

- [ ] **Step 4: Create `components/battle/fx/fx.css`**

```css
.fx-layer { position: fixed; inset: 0; pointer-events: none; overflow: hidden; z-index: 35; }
.fx-layer canvas { position: absolute; inset: 0; width: 100%; height: 100%; }
.fxs-sheet { position: absolute; pointer-events: none; width: var(--w); height: var(--h); background-image: var(--src); background-size: var(--sheet-w) var(--h); background-repeat: no-repeat; image-rendering: pixelated; animation: fxs-play var(--dur) steps(var(--frames)) both; }
@keyframes fxs-play { from { background-position: 0 0; } to { background-position: calc(-1 * var(--sheet-w)) 0; } }
```

Remove the `.fxs-*` and `.fxc-*` rules from `fx-lab.css`; keep `.fx-layer` there as `position: absolute` for the lab panels, plus `.fx-react-flash-purple`.

- [ ] **Step 5: Point the lab at the runtime**

- `fx-lab/engines/canvas/*` imports from `@/components/battle/fx/runtime/canvas` and `.../geometry`. Move the colour constants into `fx-lab/engines/canvas/colors.ts`. Update `shoot(s, ctx, …)` calls to `shoot(s, ctx.from, ctx.to, …)`.
- `fx-lab/engines/sprites/*` uses `playSheet` and `SHEETS` from the runtime. Delete `fx-lab/engines/sprites/shared.ts`, except `flying` for the fireball flight. Simplify that to `shoot`-like canvas-free WAAPI: `el.animate([{ translate: "0 0" }, { translate: \`${dx}px ${dy}px\` }], { duration: 620, easing: "ease-in" })` on a looping `.fxs-sheet` element with `animation-iteration-count: infinite`.
- In `config.ts` keep only the `canvas` and `sprites` engines; set `FxEngineId = "canvas" | "sprites"`. In `FxLab.tsx` import `@/components/battle/fx/fx.css`.

- [ ] **Step 6: Verify**

Run: `pnpm exec tsc --noEmit -p . 2>&1 | grep -E "fx" ; pnpm exec eslint --fix components/battle/fx components/battle/fx-lab app/dev`
Expected: no errors.
Open `http://localhost:3000/dev/fx-lab` (`pnpm dev`) and play each of the four actions: both panels animate.

- [ ] **Step 7: Commit**

```bash
git add -A components/battle/fx components/battle/fx-lab app/dev public/fx package.json pnpm-lock.yaml lib/supabase/middleware.ts
git commit -m "feat(fx): lab picks sprites + canvas 2D; shared FX runtime"
```

---

### Task 2: Enrich spell events on the server

**Files:**
- Create: `lib/utils/battle/spell/applied-effects.ts`
- Modify: `types/battle.ts` (`BattleAction.actionDetails`), `lib/utils/battle/spell/cast.ts`
- Test: `lib/utils/battle/spell/__tests__/applied-effects.test.ts`, `lib/utils/battle/spell/__tests__/cast.test.ts` (add a `describe("fx metadata")`)

**Interfaces:**
- Produces, in `actionDetails` (all optional):
  - `spellDamageType?: string`: the first `dealDamage`/`dot` effect's `damageType`; also searches inside `randomOf.options`.
  - `spellTargeting?: string`: `definition.targeting.kind`.
  - `spellEffectKinds?: string[]`: distinct effect kinds, including those inside `randomOf`.
  - `appliedEffects` items gain `type?: "buff" | "debuff" | "condition"` and `targetId?: string`.
- Produces, `applied-effects.ts`: `diffAppliedEffects(before: BattleParticipant[], after: BattleParticipant[], targetIds: string[]): Array<{ id: string; name: string; duration: number; type: ActiveEffect["type"]; targetId: string }>`. It returns effects present on a target after the cast whose `id` was not on that target before.

- [ ] **Step 1: Write the failing tests**

`applied-effects.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { makeParticipant } from "@/lib/utils/abilities/__tests__/fixtures";
import { diffAppliedEffects } from "@/lib/utils/battle/spell/applied-effects";
import type { ActiveEffect, BattleParticipant } from "@/types/battle";

const effect = (id: string, type: ActiveEffect["type"]): ActiveEffect => ({ id, name: id, type, duration: 2, appliedAt: { round: 1, timestamp: new Date(0) }, effects: [] });

const withEffects = (p: BattleParticipant, list: ActiveEffect[]): BattleParticipant => ({ ...p, battleData: { ...p.battleData, activeEffects: list } });

describe("diffAppliedEffects", () => {
  it("returns only new effects on the given targets", () => {
    const before = [withEffects(makeParticipant({ id: "a" }), [effect("old", "buff")]), makeParticipant({ id: "b" })];

    const after = [withEffects(makeParticipant({ id: "a" }), [effect("old", "buff"), effect("slow", "debuff")]), withEffects(makeParticipant({ id: "b" }), [effect("haste", "buff")])];

    expect(diffAppliedEffects(before, after, ["a"])).toEqual([{ id: "slow", name: "slow", duration: 2, type: "debuff", targetId: "a" }]);
  });

  it("ignores a target missing after the cast", () => {
    expect(diffAppliedEffects([makeParticipant({ id: "a" })], [], ["a"])).toEqual([]);
  });
});
```

Before writing, check where `activeEffects` lives on `BattleParticipant` (`types/battle.ts:185`, probably `battleData.activeEffects`) and adapt `withEffects`.

Add to `cast.test.ts`:

```ts
describe("fx metadata", () => {
  it("records damage type, targeting and effect kinds", () => {
    const r = cast(spellOf({ targeting: { kind: "allEnemies" } }), ["e1", "e2"], [enemy("e1"), enemy("e2")]);

    expect(r.battleAction.actionDetails).toMatchObject({ spellDamageType: "fire", spellTargeting: "allEnemies", spellEffectKinds: ["dealDamage"] });
  });

  it("records applied debuffs per target", () => {
    const slow: Effect = { kind: "applyCondition", condition: "slowed", duration: { rounds: 2 } } as Effect;

    const r = cast(spellOf({ effects: [slow] }), ["e1"], [enemy("e1")]);

    expect(r.battleAction.actionDetails.appliedEffects?.[0]).toMatchObject({ targetId: "e1" });
  });
});
```

Before writing, check the exact `applyCondition` schema (`lib/utils/abilities/schema/effects.ts:148`) and `CONDITION_KEYS` (`schema/kinds.ts:45`); use a real condition key and duration shape.

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test:run lib/utils/battle/spell/__tests__/applied-effects.test.ts lib/utils/battle/spell/__tests__/cast.test.ts`
Expected: FAIL (module missing / fields undefined).

- [ ] **Step 3: Implement**

`applied-effects.ts`:

```ts
import type { ActiveEffect, BattleParticipant } from "@/types/battle";

export interface AppliedEffect {
  id: string;
  name: string;
  duration: number;
  type: ActiveEffect["type"];
  targetId: string;
}

const effectsOf = (list: BattleParticipant[], id: string) => list.find((p) => p.basicInfo.id === id)?.battleData.activeEffects ?? [];

export function diffAppliedEffects(before: BattleParticipant[], after: BattleParticipant[], targetIds: string[]): AppliedEffect[] {
  return targetIds.flatMap((targetId) => {
    const old = new Set(effectsOf(before, targetId).map((e) => e.id));

    return effectsOf(after, targetId)
      .filter((e) => !old.has(e.id))
      .map((e) => ({ id: e.id, name: e.name, duration: e.duration, type: e.type, targetId }));
  });
}
```

(Adjust the `battleData.activeEffects` path to the real one.)

`types/battle.ts`: in `actionDetails` add `spellDamageType?: string; spellTargeting?: string; spellEffectKinds?: string[];`. Change `appliedEffects` to `Array<{ id: string; name: string; duration: number; type?: "buff" | "debuff" | "condition"; targetId?: string }>`.

`cast.ts`: add helpers near `actionOf`:

```ts
const flatEffects = (effects: Effect[]): Effect[] => effects.flatMap((e) => (e.kind === "randomOf" ? e.options : [e]));

function fxMeta(def: CastableSpell["definition"]) {
  const effects = flatEffects(def.effects);

  const damage = effects.find((e) => e.kind === "dealDamage" || e.kind === "dot") as { damageType?: string } | undefined;

  return { spellDamageType: damage?.damageType, spellTargeting: def.targeting.kind, spellEffectKinds: [...new Set(effects.map((e) => e.kind))] };
}
```

In the success path's `Object.assign(action.actionDetails, { … })`, add:

```ts
    ...fxMeta(def),
    ...(applied.length > 0 && { appliedEffects: applied }),
```

with `const applied = diffAppliedEffects(before, flow.ps, targetsBefore.map((t) => t.basicInfo.id));` computed just before. `spellDamageType` undefined must not be written: wrap as `...(meta.spellDamageType && { spellDamageType: meta.spellDamageType })`. Check that `run-advance-turn-loop.ts:203` (expired effects) still type-checks with the widened `appliedEffects` type.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test:run lib/utils/battle/spell lib/utils/battle/__tests__`
Expected: PASS (including existing spell suites).

- [ ] **Step 5: Commit**

```bash
git add types/battle.ts lib/utils/battle/spell
git commit -m "feat(battle): spell events carry damage type, targeting, effect kinds and applied effects for FX"
```

---

### Task 3: Pure FX model (mapper, element, new-event detection, impact timing)

**Files:**
- Create: `lib/utils/battle/fx/{types,element,timing,map-action,new-events,impact-delay,queue,index}.ts`
- Test: `lib/utils/battle/fx/__tests__/{element,map-action,new-events,impact-delay,queue}.test.ts`

**Interfaces:**
- Produces, `types.ts`:

```ts
export type FxArchetype = "melee" | "ranged" | "bolt" | "area" | "heal" | "buff" | "debuff" | "summon" | "death";

export type FxElement = "fire" | "cold" | "lightning" | "poison" | "necrotic" | "radiant" | "arcane" | "physical" | "nature";

export interface FxSpec {
  key: string;
  archetype: FxArchetype;
  element: FxElement;
  actorId: string;
  actorSide: string;
  targetIds: string[];
  hit: boolean;
  critical: boolean;
}
```

- Produces:
  - `element.ts`: `elementOf(damageType: string | undefined, fallback: FxElement): FxElement`
  - `timing.ts`: `IMPACT_MS: Record<FxArchetype, number>` and `MAX_FX_BATCH = 6`
  - `map-action.ts`: `mapAction(action: BattleAction): FxSpec[]`
  - `new-events.ts`: `takeNewActions(log: BattleAction[], seen: number | null): { actions: BattleAction[]; seen: number }`
  - `impact-delay.ts`: `impactDelayFor(action: BattleAction | undefined, participantId: string): number` (ms; 0 when not a target)
  - `queue.ts`: `interface FxQueueState { log: BattleAction[] | null; seen: number | null; queue: FxSpec[] }`, `INITIAL_FX_QUEUE: FxQueueState`, `advanceFxQueue(state: FxQueueState, log: BattleAction[], enabled: boolean): FxQueueState` (returns `state` unchanged when `state.log === log`; otherwise runs `takeNewActions`, appends `mapAction` results only when `enabled`, caps the queue at `MAX_FX_QUEUE = 12` keeping the newest), `shiftFxQueue(state): FxQueueState`
  - `index.ts` re-exports all of these.

- [ ] **Step 1: Write the failing tests**

`element.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { elementOf } from "@/lib/utils/battle/fx";

describe("elementOf", () => {
  it.each([
    ["fire", "fire"], ["cold", "cold"], ["lightning", "lightning"], ["thunder", "lightning"], ["acid", "poison"], ["poison", "poison"],
    ["necrotic", "necrotic"], ["radiant", "radiant"], ["psychic", "arcane"], ["force", "arcane"], ["magic", "arcane"],
    ["slashing", "physical"], ["piercing", "physical"], ["bludgeoning", "physical"], ["bleed", "physical"],
  ])("%s → %s", (type, el) => expect(elementOf(type, "arcane")).toBe(el));

  it("unknown or missing → fallback", () => {
    expect(elementOf(undefined, "nature")).toBe("nature");
    expect(elementOf("all", "arcane")).toBe("arcane");
  });
});
```

`map-action.test.ts` (build actions with a local `action(over)` factory filling the required `BattleAction` fields: `id: "b-1"`, `battleId: "b"`, `round: 1`, `actionIndex: 1`, `timestamp: new Date(0)`, `actorId: "a"`, `actorName: "A"`, `actorSide: ParticipantSide.ALLY`, `targets: [{ participantId: "t", participantName: "T" }]`, `actionDetails: {}`, `resultText: ""`, `hpChanges: []`, `isCancelled: false`):

```ts
describe("mapAction", () => {
  it("melee hit with slashing → melee/physical", () => {
    expect(mapAction(action({ actionType: "attack", actionDetails: { attackKind: "melee", isHit: true, damageRolls: [{ dice: "1d8", results: [5], total: 5, damageType: "slashing" }] } }))).toEqual([
      { key: "b-1:0", archetype: "melee", element: "physical", actorId: "a", actorSide: "ally", targetIds: ["t"], hit: true, critical: false },
    ]);
  });

  it("ranged miss keeps the archetype with hit=false", () => {
    expect(mapAction(action({ actionType: "attack", actionDetails: { attackKind: "ranged", isHit: false } }))[0]).toMatchObject({ archetype: "ranged", hit: false });
  });

  it("critical fail is a miss", () => {
    expect(mapAction(action({ actionType: "attack", actionDetails: { isHit: true, isCriticalFail: true } }))[0].hit).toBe(false);
  });

  it("retaliation animates like an attack", () => {
    expect(mapAction(action({ actionType: "retaliation", actionDetails: { attackKind: "melee", isHit: true } }))[0].archetype).toBe("melee");
  });

  it("single-target damage spell → bolt with its element", () => {
    expect(mapAction(action({ actionType: "spell", actionDetails: { spellDamageType: "fire", spellTargeting: "enemy", spellEffectKinds: ["dealDamage"], totalDamage: 9 } }))[0]).toMatchObject({ archetype: "bolt", element: "fire" });
  });

  it("area/all-enemies damage spell → area", () => {
    const a = action({ actionType: "spell", targets: [{ participantId: "t1", participantName: "1" }, { participantId: "t2", participantName: "2" }], actionDetails: { spellDamageType: "cold", spellTargeting: "allEnemies", spellEffectKinds: ["dealDamage"] } });

    expect(mapAction(a)[0]).toMatchObject({ archetype: "area", element: "cold", targetIds: ["t1", "t2"] });
  });

  it("healing spell → heal/nature", () => {
    expect(mapAction(action({ actionType: "spell", actionDetails: { spellEffectKinds: ["heal"], totalHealing: 7 } }))[0]).toMatchObject({ archetype: "heal", element: "nature" });
  });

  it("buff spell → buff/radiant; debuff spell → debuff/necrotic", () => {
    expect(mapAction(action({ actionType: "spell", actionDetails: { spellEffectKinds: ["modifyStat"], appliedEffects: [{ id: "h", name: "h", duration: 2, type: "buff", targetId: "t" }] } }))[0]).toMatchObject({ archetype: "buff", element: "radiant" });
    expect(mapAction(action({ actionType: "spell", actionDetails: { spellEffectKinds: ["applyCondition"], appliedEffects: [{ id: "s", name: "s", duration: 2, type: "condition", targetId: "t" }] } }))[0]).toMatchObject({ archetype: "debuff", element: "necrotic" });
  });

  it("summon / raise dead → summon", () => {
    expect(mapAction(action({ actionType: "spell", actionDetails: { spellEffectKinds: ["summon"] } }))[0].archetype).toBe("summon");
  });

  it("damage spell that also debuffs stays a bolt (damage wins)", () => {
    expect(mapAction(action({ actionType: "spell", actionDetails: { spellDamageType: "necrotic", spellEffectKinds: ["dealDamage", "applyCondition"], totalDamage: 4 } }))[0].archetype).toBe("bolt");
  });

  it("appends a death spec per participant brought to 0 HP", () => {
    const a = action({ actionType: "attack", actionDetails: { attackKind: "melee", isHit: true }, hpChanges: [{ participantId: "t", participantName: "T", oldHp: 5, newHp: 0, change: 5 }] });

    expect(mapAction(a).map((s) => s.archetype)).toEqual(["melee", "death"]);
    expect(mapAction(a)[1]).toMatchObject({ key: "b-1:death:t", targetIds: ["t"] });
  });

  it("cancelled, end_turn, skip_turn, morale_skip → nothing", () => {
    expect(mapAction(action({ actionType: "attack", isCancelled: true }))).toEqual([]);
    expect(mapAction(action({ actionType: "end_turn" }))).toEqual([]);
    expect(mapAction(action({ actionType: "morale_skip" }))).toEqual([]);
  });

  it("ability events only produce deaths", () => {
    expect(mapAction(action({ actionType: "ability", hpChanges: [{ participantId: "t", participantName: "T", oldHp: 3, newHp: 0, change: 3 }] })).map((s) => s.archetype)).toEqual(["death"]);
  });
});
```

`new-events.test.ts`:

```ts
const at = (i: number, over: Partial<BattleAction> = {}) => ({ ...action({ actionIndex: i, id: `b-${i}` }), ...over });

describe("takeNewActions", () => {
  it("first look marks everything as seen", () => {
    expect(takeNewActions([at(1), at(2)], null)).toEqual({ actions: [], seen: 2 });
  });

  it("empty log on first look → seen -1", () => {
    expect(takeNewActions([], null)).toEqual({ actions: [], seen: -1 });
  });

  it("returns entries newer than seen, oldest first", () => {
    expect(takeNewActions([at(1), at(3), at(2)], 1).actions.map((a) => a.actionIndex)).toEqual([2, 3]);
  });

  it("skips cancelled entries", () => {
    expect(takeNewActions([at(1), at(2, { isCancelled: true })], 1).actions).toEqual([]);
  });

  it("rollback (max index dropped) plays nothing and lowers seen", () => {
    expect(takeNewActions([at(1)], 4)).toEqual({ actions: [], seen: 1 });
  });

  it("history prepend (older entries only) plays nothing", () => {
    expect(takeNewActions([at(-5), at(-4), at(1), at(2)], 2).actions).toEqual([]);
  });

  it(`keeps only the newest ${MAX_FX_BATCH}`, () => {
    const log = Array.from({ length: 10 }, (_, i) => at(i + 1));

    expect(takeNewActions(log, 0).actions.map((a) => a.actionIndex)).toEqual([5, 6, 7, 8, 9, 10]);
  });
});
```

`impact-delay.test.ts`:

```ts
describe("impactDelayFor", () => {
  it("target of a bolt waits for the bolt", () => {
    const a = action({ actionType: "spell", actionDetails: { spellDamageType: "fire", spellEffectKinds: ["dealDamage"] } });

    expect(impactDelayFor(a, "t")).toBe(IMPACT_MS.bolt);
  });

  it("non-target / no action → 0", () => {
    expect(impactDelayFor(undefined, "t")).toBe(0);
    expect(impactDelayFor(action({ actionType: "attack", actionDetails: { attackKind: "melee", isHit: true } }), "x")).toBe(0);
  });
});
```

`queue.test.ts`:

```ts
describe("advanceFxQueue", () => {
  const melee = (i: number) => action({ actionIndex: i, id: `b-${i}`, actionType: "attack", actionDetails: { attackKind: "melee", isHit: true } });

  it("same log reference → same state", () => {
    const log = [melee(1)];

    const s = advanceFxQueue(INITIAL_FX_QUEUE, log, true);

    expect(advanceFxQueue(s, log, true)).toBe(s);
  });

  it("first log queues nothing, a newer entry queues its specs", () => {
    const s1 = advanceFxQueue(INITIAL_FX_QUEUE, [melee(1)], true);

    expect(s1.queue).toEqual([]);

    const s2 = advanceFxQueue(s1, [melee(1), melee(2)], true);

    expect(s2.queue.map((q) => q.key)).toEqual(["b-2:0"]);
    expect(shiftFxQueue(s2).queue).toEqual([]);
  });

  it("disabled advances seen without queueing", () => {
    const s1 = advanceFxQueue(INITIAL_FX_QUEUE, [melee(1)], false);

    const s2 = advanceFxQueue(s1, [melee(1), melee(2)], false);

    expect(s2).toMatchObject({ seen: 2, queue: [] });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test:run lib/utils/battle/fx`
Expected: FAIL (modules missing).

- [ ] **Step 3: Implement**

`element.ts`:

```ts
import type { FxElement } from "./types";

const ELEMENTS: Record<string, FxElement> = {
  fire: "fire",
  cold: "cold",
  lightning: "lightning",
  thunder: "lightning",
  acid: "poison",
  poison: "poison",
  necrotic: "necrotic",
  radiant: "radiant",
  psychic: "arcane",
  force: "arcane",
  magic: "arcane",
  slashing: "physical",
  piercing: "physical",
  bludgeoning: "physical",
  physical: "physical",
  bleed: "physical",
};

export function elementOf(damageType: string | undefined, fallback: FxElement): FxElement {
  return (damageType && ELEMENTS[damageType]) || fallback;
}
```

`timing.ts`:

```ts
import type { FxArchetype } from "./types";

export const IMPACT_MS: Record<FxArchetype, number> = { melee: 230, ranged: 380, bolt: 600, area: 650, heal: 450, buff: 400, debuff: 650, summon: 500, death: 0 };

export const MAX_FX_BATCH = 6;
```

`map-action.ts`:

```ts
import type { BattleAction } from "@/types/battle";

import { elementOf } from "./element";
import type { FxArchetype, FxElement, FxSpec } from "./types";

const AREA_TARGETING = new Set(["area", "allEnemies", "allAllies", "everyone"]);

const DAMAGE_KINDS = new Set(["dealDamage", "dot"]);

const HEAL_KINDS = new Set(["heal", "hot"]);

const SUMMON_KINDS = new Set(["summon", "raiseDead"]);

function spellArchetype(action: BattleAction): { archetype: FxArchetype; element: FxElement } {
  const d = action.actionDetails;

  const kinds = new Set(d.spellEffectKinds ?? []);

  const many = action.targets.length > 1 || AREA_TARGETING.has(d.spellTargeting ?? "");

  if ([...kinds].some((k) => SUMMON_KINDS.has(k))) return { archetype: "summon", element: "radiant" };

  if ((d.totalDamage ?? 0) > 0 || [...kinds].some((k) => DAMAGE_KINDS.has(k))) return { archetype: many ? "area" : "bolt", element: elementOf(d.spellDamageType, "arcane") };

  if ((d.totalHealing ?? 0) > 0 || [...kinds].some((k) => HEAL_KINDS.has(k))) return { archetype: "heal", element: "nature" };

  if ((d.appliedEffects ?? []).some((e) => e.type === "debuff" || e.type === "condition") || kinds.has("applyCondition") || kinds.has("charm")) return { archetype: "debuff", element: "necrotic" };

  return { archetype: "buff", element: "radiant" };
}

function primary(action: BattleAction): FxSpec | null {
  const d = action.actionDetails;

  const base = { key: `${action.id}:0`, actorId: action.actorId, actorSide: String(action.actorSide), targetIds: action.targets.map((t) => t.participantId), critical: d.isCritical === true };

  if (action.actionType === "attack" || action.actionType === "retaliation") {
    return { ...base, archetype: d.attackKind === "ranged" ? "ranged" : "melee", element: elementOf(d.damageRolls?.[0]?.damageType, "physical"), hit: d.isHit !== false && d.isCriticalFail !== true };
  }

  if (action.actionType === "spell") return { ...base, ...spellArchetype(action), hit: true };

  return null;
}

export function mapAction(action: BattleAction): FxSpec[] {
  if (action.isCancelled) return [];

  const main = primary(action);

  const deaths: FxSpec[] = action.hpChanges
    .filter((h) => h.oldHp > 0 && h.newHp <= 0)
    .map((h) => ({ key: `${action.id}:death:${h.participantId}`, archetype: "death", element: "necrotic", actorId: action.actorId, actorSide: String(action.actorSide), targetIds: [h.participantId], hit: true, critical: false }));

  return [...(main ? [main] : []), ...deaths];
}
```

`new-events.ts`:

```ts
import type { BattleAction } from "@/types/battle";

import { MAX_FX_BATCH } from "./timing";

export function takeNewActions(log: BattleAction[], seen: number | null): { actions: BattleAction[]; seen: number } {
  const max = log.reduce((m, a) => Math.max(m, a.actionIndex), -1);

  if (seen === null || max <= seen) return { actions: [], seen: seen === null ? max : Math.min(seen, max) };

  const fresh = log.filter((a) => a.actionIndex > seen && !a.isCancelled).sort((a, b) => a.actionIndex - b.actionIndex);

  return { actions: fresh.slice(-MAX_FX_BATCH), seen: max };
}
```

`impact-delay.ts`:

```ts
import type { BattleAction } from "@/types/battle";

import { mapAction } from "./map-action";
import { IMPACT_MS } from "./timing";

export function impactDelayFor(action: BattleAction | undefined, participantId: string): number {
  const spec = action ? mapAction(action)[0] : undefined;

  return spec && spec.targetIds.includes(participantId) ? IMPACT_MS[spec.archetype] : 0;
}
```

`queue.ts`:

```ts
import type { BattleAction } from "@/types/battle";

import { mapAction } from "./map-action";
import { takeNewActions } from "./new-events";
import type { FxSpec } from "./types";

export interface FxQueueState {
  log: BattleAction[] | null;
  seen: number | null;
  queue: FxSpec[];
}

export const INITIAL_FX_QUEUE: FxQueueState = { log: null, seen: null, queue: [] };

const MAX_FX_QUEUE = 12;

export function advanceFxQueue(state: FxQueueState, log: BattleAction[], enabled: boolean): FxQueueState {
  if (state.log === log) return state;

  const { actions, seen } = takeNewActions(log, state.seen);

  const added = enabled ? actions.flatMap(mapAction) : [];

  return { log, seen, queue: [...state.queue, ...added].slice(-MAX_FX_QUEUE) };
}

export function shiftFxQueue(state: FxQueueState): FxQueueState {
  return { ...state, queue: state.queue.slice(1) };
}
```

`index.ts`:

```ts
export { elementOf } from "./element";
export { impactDelayFor } from "./impact-delay";
export { mapAction } from "./map-action";
export { takeNewActions } from "./new-events";
export { advanceFxQueue, type FxQueueState, INITIAL_FX_QUEUE, shiftFxQueue } from "./queue";
export { IMPACT_MS, MAX_FX_BATCH } from "./timing";
export type { FxArchetype, FxElement, FxSpec } from "./types";
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test:run lib/utils/battle/fx`
Expected: PASS.

- [ ] **Step 5: Mapping report for the library spells**

Write a throwaway script `scripts/sim/fx-spell-report.ts` (run with `pnpm exec tsx --tsconfig tsconfig.scripts.json scripts/sim/fx-spell-report.ts`). For every spell in `data/library/spells.ts` it builds a fake spell `BattleAction` the way `castSpell` would:
- `spellDamageType`, `spellTargeting` and `spellEffectKinds` come from `definition`;
- `totalDamage`/`totalHealing` are set when there is a damage/heal effect;
- `appliedEffects` types are derived from the effect kinds: `applyCondition`/`charm`/`dot`/negative `modifyStat` → debuff/condition; positive `modifyStat`/`hot`/`guard` → buff.

It then runs `mapAction` and prints a Markdown table to `<tmp>/fx-spell-report.md`:

| school | spell | effect kinds | targeting | archetype | element | flagged |

Mark a row `flagged` when:
- (a) it falls into the `buff` fallback without any buff-type effect;
- (b) it has both damage and a lasting effect;
- (c) its `damageType` is missing/`all`/`spell`;
- (d) it has `randomOf`.

The controller reads the report and asks the user about the flagged rows. Answers go into `map-action.ts` (or a per-spell override map `lib/utils/battle/fx/overrides.ts` keyed by spell name, if needed) with a test per answered case. Do not commit the script.

- [ ] **Step 6: Commit**

```bash
git add lib/utils/battle/fx
git commit -m "feat(fx): pure mapper from battle events to FX specs"
```

---

### Task 4: Animation library (one archetype = one file)

**Files:**
- Create:
  - `components/battle/fx/runtime/palette.ts`
  - `components/battle/fx/animations/types.ts`
  - `components/battle/fx/animations/{melee,ranged,bolt,area,heal,buff,debuff,summon,death}.ts`
  - `components/battle/fx/animations/index.ts`
- Modify: `components/battle/fx-lab/*` (the playground plays real animations)

**Interfaces:**
- Consumes: the runtime from Task 1; `FxSpec`, `FxArchetype`, `FxElement` and `IMPACT_MS` from Task 3.
- Produces, `palette.ts`: `PALETTE: Record<FxElement, { core: string; tints: string[]; sprite?: keyof typeof SHEETS; filter?: string }>`. Colours are 6-digit hex:
  - fire: core `#ff7a1a`; tints `#fff3b0 #ffd25a #ff8a1f #ff4a00`; sprite `explosion`
  - cold: core `#6fd3ff`; tints `#ffffff #c8f1ff #6fd3ff #2a8bd6`; sprite `rings`; filter `hue-rotate(0deg)`
  - lightning: core `#9fd8ff`; tints `#ffffff #fff6a8 #9fd8ff`; sprite `lightning`
  - poison: core `#8fe04a`; tints `#e8ffb0 #8fe04a #4a9a1a`
  - necrotic: core `#9b3dff`; tints `#f3d0ff #b04dff #8a2be2`; sprite `darkBolt`
  - radiant: core `#ffd86b`; tints `#ffffff #fff1b8 #ffd86b`
  - arcane: core `#c27aff`; tints `#ffffff #e3c6ff #c27aff #7a3dff`
  - physical: core `#ffe7a8`; tints `#ffffff #e3eeff #ffe7a8`; sprite `spark`; filter `hue-rotate(170deg) saturate(.5) brightness(1.7)`
  - nature: core `#6dff8a`; tints `#ffffff #c8ffd0 #7dff98 #3fd46a`; sprite `rings`; filter `hue-rotate(-75deg) brightness(1.2)`
- Produces, `animations/types.ts`:

```ts
import type { FxSpec } from "@/lib/utils/battle/fx";

import type { Stage } from "../runtime/canvas";
import type { FxPoint } from "../runtime/geometry";
import type { PALETTE } from "../runtime/palette";

export interface FxRun {
  spec: FxSpec;
  stage: Stage;
  layer: HTMLElement;
  from: FxPoint;
  to: FxPoint[];
  actorEl: HTMLElement | null;
  palette: (typeof PALETTE)[keyof typeof PALETTE];
}

export type FxAnimation = (run: FxRun) => Promise<void>;
```

- Produces, `animations/index.ts`: `export const ANIMATIONS: Record<FxArchetype, FxAnimation>`.

Behaviour of each file. Timings must hit their `IMPACT_MS` value at the moment the effect reaches the target; ±50 ms is fine.
- `melee.ts`: if `actorEl`, run a WAAPI lunge on it (420 ms; see lab `canvas/slash.ts`). At 190 ms draw 1 slash arc (2 when `critical`) with `show` + `tween`. At 230 ms emit 40 particles in `palette.tints` with gravity 700, and play `SHEETS.spark` with `palette.filter` (physical) when `hit`. When `!hit`, draw the arc offset 30 px beside the target and emit no sparks.
- `ranged.ts`: a thin arrow streak: a `show` that draws a 2 px line 24 px long along the bezier with a glow head. 380 ms flight. On hit, emit 20 particles; on a miss, end 40 px past the target with alpha fading.
- `bolt.ts`: `shoot(stage, from, to[0], 600, palette.core, palette.tints)`, then emit 90 particles, `flash` and `ring`. If `palette.sprite`, also `playSheet(layer, SHEETS[palette.sprite], to[0], { scale: 2.6, ms: 560, filter: palette.filter })`. When `critical`, double the particles and scale the flash ×1.4.
- `area.ts`: one `shoot` to the centroid of `to` (lift 90). Then, for every target with a 70 ms stagger, play `flash` + 40 particles + sprite (if any).
- `heal.ts`: port lab `canvas/heal.ts` (beam + rising particles + ring) applied to every target. Use `palette` for colours.
- `buff.ts`: a golden rising ring and slow sparkles around the target (no projectile): `ring` growing from 50 to 10 px inverted (shrink inward), 24 particles with angle up and gravity −40.
- `debuff.ts`: port lab `canvas/curse.ts` (wobbling orb + sigil + smoke). Add `playSheet(SHEETS.darkBolt, { scale: 2, ms: 900, anchorY: 0.8 })` on each target.
- `summon.ts`: a vertical light pillar at each target (`sprite` stretched like the heal beam, radiant colours) and a `ring`.
- `death.ts`: no projectile. 30 slow, dark, non-additive particles drift up from the target, plus a grey `ring`. Duration ~700 ms.

Template for every file (shown for `bolt.ts`; the others follow the same shape with their own body):

```ts
import { emit, flash, ring, shoot } from "../runtime/canvas";
import { wait } from "../runtime/geometry";
import { playSheet, SHEETS } from "../runtime/sprites";
import type { FxAnimation } from "./types";

export const bolt: FxAnimation = async ({ stage, layer, from, to, palette, spec }) => {
  const target = to[0];

  if (!target) return;

  await shoot(stage, from, target, 600, palette.core, palette.tints);

  const count = spec.critical ? 180 : 90;

  for (let i = 0; i < count; i++) emit(stage, target, { tints: palette.tints, speed: [60, 340], life: [0.4, 0.9], scale: [0.6, 0.05], drag: 3.5, gravity: 60 });

  await Promise.all([
    flash(stage, target, palette.core, spec.critical ? 180 : 130, 450),
    ring(stage, target, palette.tints[1] ?? palette.core, 550, 60, 5),
    palette.sprite ? playSheet(layer, SHEETS[palette.sprite], target, { scale: 2.6, ms: 560, filter: palette.filter }) : wait(0),
    wait(700),
  ]);
};
```

- [ ] **Step 1: Write `palette.ts`, `animations/types.ts`, the nine animation files and `animations/index.ts`**

```ts
import type { FxArchetype } from "@/lib/utils/battle/fx";

import { area } from "./area";
import { bolt } from "./bolt";
import { buff } from "./buff";
import { death } from "./death";
import { debuff } from "./debuff";
import { heal } from "./heal";
import { melee } from "./melee";
import { ranged } from "./ranged";
import { summon } from "./summon";
import type { FxAnimation } from "./types";

export const ANIMATIONS: Record<FxArchetype, FxAnimation> = { melee, ranged, bolt, area, heal, buff, debuff, summon, death };
```

- [ ] **Step 2: Re-point the lab playground to the real library**

- Replace the lab's engine/scenario model with two selectors:
  - archetype, using `HudChipTabs` over `Object.keys(ANIMATIONS)`;
  - element, a `HudChipTabs` over the `PALETTE` keys.
- Add toggles «Крит» and «Промах».
- Keep a single arena (`FxLabPanel`) whose cards carry `data-fx-participant`.
- A ▶ button builds an `FxSpec` from the selection: actor `a1`/`a2`, target `e1` (for `heal`/`buff`, target `a1`; for `area`, targets `e1,e2`). It then calls `ANIMATIONS[archetype]({ spec, stage: stageFor(layer), layer, from, to, actorEl, palette: PALETTE[element] })`.
- Delete `fx-lab/engines/`, `fx-lab/config.ts`'s `LAB_ENGINES`, `LAB_SCENARIOS` and `fx-lab/types.ts`.

- [ ] **Step 3: Verify visually**

Run `pnpm dev`, open `http://localhost:3000/dev/fx-lab` and play each archetype with at least fire, cold, necrotic, physical and nature. Confirm:
- no console errors;
- the animation ends (the ▶ button can be pressed again);
- crit is larger;
- a miss shows no impact sparks.

Run: `pnpm exec tsc --noEmit -p . 2>&1 | grep fx; pnpm exec eslint --fix components/battle/fx components/battle/fx-lab`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add -A components/battle/fx components/battle/fx-lab
git commit -m "feat(fx): archetype animation library (one file per animation) + playground"
```

---

### Task 4b: User decisions on unclear spells (overrides, new archetypes/elements)

The user answered the flagged-spell questions (2026-10-18):
1. «Шал» (spell effect kind `berserk`, cast on an enemy) → **debuff, red frenzy**. Rule (not by name): any spell whose `spellEffectKinds` contains `berserk` → `{ archetype: "debuff", element: "fury" }`.
2. Damage + lasting effect (Крижаний болт, Блискавка, Коло зими, Глибока заморозка, Місячний промінь, Рій ос, Землетрус, Шторм природи) → **only the hit animation; the lasting effect is shown later by the persistent aura (Task 7)**. No mapper change — current behaviour (bolt/area) is correct; add one test pinning it for a dealDamage+applyCondition spell.
3. «Рій ос» → **a swarm**: yellow-black insect swarm flies to the target(s). «Землетрус» → **new element "earth"**: brown dust, cracks and debris under the enemies.
4. «Телепортація» (no mechanics, `note` effect only) → **blink**: a blue-white flash on the target as if it vanishes and reappears.

**Files:**
- Modify: `lib/utils/battle/fx/types.ts` (FxArchetype += `"swarm" | "quake" | "teleport"`; FxElement += `"earth" | "fury"`), `lib/utils/battle/fx/timing.ts` (IMPACT_MS: `swarm: 700, quake: 400, teleport: 300`), `lib/utils/battle/fx/map-action.ts`, `lib/utils/battle/fx/index.ts`
- Create: `lib/utils/battle/fx/overrides.ts` — `SPELL_FX_OVERRIDES: Record<string, { archetype?: FxArchetype; element?: FxElement }>` keyed by exact spell name: `"Рій ос": { archetype: "swarm", element: "nature" }`, `"Землетрус": { archetype: "quake", element: "earth" }`, `"Телепортація": { archetype: "teleport", element: "arcane" }`. Applied in `spellArchetype` AFTER the rules (override fields replace the computed ones). Names are what library spells are called in every campaign (seeded from data/library/spells.ts — verify the exact names there).
- Modify: `components/battle/fx/runtime/palette.ts` — add `earth` (core `#b08850`, tints `#e8d3a8 #c8a26a #8a6234 #5a3e20`, non-additive feel is fine via colours) and `fury` (core `#ff3030`, tints `#ffd0c0 #ff6a4a #e01818 #7a0808`).
- Create (one animation = one file): `components/battle/fx/animations/swarm.ts`, `quake.ts`, `teleport.ts`; register them in `animations/index.ts` (the Record<FxArchetype, FxAnimation> must stay exhaustive).
  - `swarm.ts`: ~40 small dark/yellow dots (non-additive dark `#2a2210` and additive `#ffd23a`) flying from the actor to each target along jittery noisy paths (each dot its own bezier + sine jitter), arriving around 700 ms, then buzzing in a tight cloud around the target for ~500 ms and dispersing.
  - `quake.ts`: no projectile. For every target at once: screen-space shake of the target anchors is NOT allowed (DOM is owned by React) — instead draw on canvas: 3–4 jagged crack lines (brown, `#5a3e20`, width 2–3) growing outward from under the target (y + 20), dust particles (non-additive, earth tints, rising and spreading), and 6–10 debris chunks (small dark squares/circles) thrown up with gravity. Impact (cracks reach full length) at ~400 ms.
  - `teleport.ts`: on each target: a tall thin blue-white vertical flash (stretched glow sprite) that collapses to a line and fades, a burst of 20 small arcane particles, then ~250 ms later a reverse expand (reappear). Total ~800 ms.
- Modify: `components/battle/fx-lab/*` — the playground must list the new archetypes and elements automatically (it iterates ANIMATIONS / PALETTE keys; verify).
- Test: `lib/utils/battle/fx/__tests__/map-action.test.ts` — add:
  - berserk spell → `{ archetype: "debuff", element: "fury" }`
  - `spellName: "Рій ос"` with dealDamage/piercing on area → `{ archetype: "swarm", element: "nature" }`
  - `spellName: "Землетрус"` → `{ archetype: "quake", element: "earth" }`
  - `spellName: "Телепортація"` with kinds ["note"] → `{ archetype: "teleport", element: "arcane" }`
  - dealDamage + applyCondition single target (e.g. «Глибока заморозка») → still `bolt` with its damage element.

Steps: RED tests → implement → GREEN (`pnpm test:run lib/utils/battle/fx`) → tsc + eslint --fix → headless screenshots of /dev/fx-lab for swarm, quake (earth), teleport, debuff (fury) — look at them → commit `feat(fx): swarm, quake and teleport animations; fury and earth elements (user decisions)`.

---

### Task 5: Anchors, queue hook and the battle overlay

**Files:**
- Create: `components/battle/fx/runtime/anchors.ts`, `components/battle/fx/BattleFxLayer.tsx`, `lib/hooks/battle/useFxEnabled.ts`, `lib/hooks/battle/useBattleFxQueue.ts`
- Modify: `components/battle/participants/ParticipantRow.tsx` (portrait wrapper), `components/battle/participants/MyHeroPanel.tsx`, `components/battle/participants/InitiativeTrack.tsx`, `components/battle/scene/BattleScreen.tsx`, `lib/hooks/battle/index.ts`
- Test: `components/battle/fx/__tests__/anchors.test.ts` (`// @vitest-environment happy-dom`). The queue logic itself is tested purely in Task 3 (`queue.test.ts`).

**Interfaces:**
- Consumes: `takeNewActions`, `mapAction`, `FxSpec` (Task 3); `ANIMATIONS` (Task 4); `PALETTE`, `stageFor` (Tasks 1/4).
- Produces:
  - DOM: every participant portrait has `data-fx-participant={participant.basicInfo.id}`. That covers `ParticipantRow`'s `Portrait`, `MyHeroPanel`'s portrait and the `InitiativeTrack` buttons. `InitiativeTrack` gets `data-fx-anchor="track"` so it ranks last.
  - `anchors.ts`:
    - `findAnchor(id: string, root?: ParentNode): HTMLElement | null`: the first `[data-fx-participant="id"]` whose rect is non-empty and inside the viewport. Row/hero anchors win over `data-fx-anchor="track"`.
    - `centerOf(el): FxPoint` (viewport coordinates).
    - `resolvePoints(spec: FxSpec, root?: ParentNode): { from: FxPoint; to: FxPoint[]; actorEl: HTMLElement | null } | null`. Returns `null` when no target anchor is visible. When the actor anchor is missing, `from` is the screen edge: an ally comes from below (`{ x: to[0].x, y: innerHeight + 20 }`), an enemy from above (`{ x: to[0].x, y: -20 }`). For `death`, `from = to[0]`.
  - `useFxEnabled(): { enabled: boolean; setEnabled(v: boolean): void }`. It uses `useSyncExternalStore` over `localStorage["battle-fx"]` (`"off"` disables, default on), wrapped in try/catch, plus `matchMedia("(prefers-reduced-motion: reduce)")`.
  - `useBattleFxQueue(enabled: boolean): { current: FxSpec | null; done: () => void }`. It watches `useBattleSceneData().battle.battleLog` and applies `advanceFxQueue` with the "adjust state during render" pattern: `if (state.log !== log) setState(advanceFxQueue(state, log, enabled))`. That is used because `react-hooks` v7 recommended rules (on in `eslint.config.mjs`) forbid `setState` inside `useEffect` and reading `ref.current` during render.

- [ ] **Step 1: Write the failing tests**

`anchors.test.ts`:

```ts
// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";

import { resolvePoints } from "@/components/battle/fx/runtime/anchors";
import type { FxSpec } from "@/lib/utils/battle/fx";

const spec = (over: Partial<FxSpec> = {}): FxSpec => ({ key: "k", archetype: "bolt", element: "fire", actorId: "a", actorSide: "ally", targetIds: ["t"], hit: true, critical: false, ...over });

function anchor(id: string, rect: { x: number; y: number; w: number; h: number }, track = false) {
  const el = document.createElement("span");

  el.dataset.fxParticipant = id;

  if (track) el.dataset.fxAnchor = "track";

  el.getBoundingClientRect = () => ({ left: rect.x, top: rect.y, width: rect.w, height: rect.h, right: rect.x + rect.w, bottom: rect.y + rect.h, x: rect.x, y: rect.y, toJSON: () => ({}) }) as DOMRect;
  document.body.appendChild(el);

  return el;
}

beforeEach(() => {
  document.body.innerHTML = "";
  vi.stubGlobal("innerWidth", 1000);
  vi.stubGlobal("innerHeight", 800);
});

describe("resolvePoints", () => {
  it("uses actor and target centres", () => {
    anchor("a", { x: 0, y: 0, w: 40, h: 40 });
    anchor("t", { x: 500, y: 100, w: 40, h: 40 });

    expect(resolvePoints(spec())).toMatchObject({ from: { x: 20, y: 20 }, to: [{ x: 520, y: 120 }] });
  });

  it("no visible target → null", () => {
    anchor("a", { x: 0, y: 0, w: 40, h: 40 });
    anchor("t", { x: 0, y: 0, w: 0, h: 0 });

    expect(resolvePoints(spec())).toBeNull();
  });

  it("hidden enemy actor comes from the top edge", () => {
    anchor("t", { x: 500, y: 600, w: 40, h: 40 });

    expect(resolvePoints(spec({ actorSide: "enemy" }))?.from).toEqual({ x: 520, y: -20 });
  });

  it("prefers a row anchor over the initiative track", () => {
    anchor("t", { x: 10, y: 10, w: 20, h: 20 }, true);
    anchor("t", { x: 500, y: 300, w: 40, h: 40 });
    anchor("a", { x: 0, y: 0, w: 40, h: 40 });

    expect(resolvePoints(spec())?.to).toEqual([{ x: 520, y: 320 }]);
  });

  it("drops targets that are not visible but keeps the rest", () => {
    anchor("a", { x: 0, y: 0, w: 40, h: 40 });
    anchor("t1", { x: 500, y: 100, w: 40, h: 40 });

    expect(resolvePoints(spec({ targetIds: ["t1", "t2"] }))?.to).toEqual([{ x: 520, y: 120 }]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test:run components/battle/fx`
Expected: FAIL.

- [ ] **Step 3: Implement**

`anchors.ts`:

```ts
import type { FxSpec } from "@/lib/utils/battle/fx";

import type { FxPoint } from "./geometry";

function visible(el: HTMLElement) {
  const r = el.getBoundingClientRect();

  return r.width > 0 && r.height > 0 && r.bottom > 0 && r.right > 0 && r.top < window.innerHeight && r.left < window.innerWidth;
}

export function findAnchor(id: string, root: ParentNode = document): HTMLElement | null {
  const all = [...root.querySelectorAll<HTMLElement>(`[data-fx-participant="${CSS.escape(id)}"]`)].filter(visible);

  return all.find((el) => el.dataset.fxAnchor !== "track") ?? all[0] ?? null;
}

export function centerOf(el: HTMLElement): FxPoint {
  const r = el.getBoundingClientRect();

  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

export function resolvePoints(spec: FxSpec, root: ParentNode = document): { from: FxPoint; to: FxPoint[]; actorEl: HTMLElement | null } | null {
  const to = spec.targetIds.flatMap((id) => {
    const el = findAnchor(id, root);

    return el ? [centerOf(el)] : [];
  });

  if (to.length === 0) return null;

  if (spec.archetype === "death") return { from: to[0], to, actorEl: null };

  const actorEl = findAnchor(spec.actorId, root);

  const from = actorEl ? centerOf(actorEl) : { x: to[0].x, y: spec.actorSide === "enemy" ? -20 : window.innerHeight + 20 };

  return { from, to, actorEl };
}
```

If `CSS.escape` is missing in happy-dom, fall back to `id.replace(/"/g, '\\"')`.

`useFxEnabled.ts`:

```ts
"use client";

import { useCallback, useSyncExternalStore } from "react";

const KEY = "battle-fx";

const listeners = new Set<() => void>();

function read(): boolean {
  try {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return false;

    return window.localStorage.getItem(KEY) !== "off";
  } catch {
    return true;
  }
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);

  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

export function useFxEnabled() {
  const enabled = useSyncExternalStore(subscribe, read, () => false);

  const setEnabled = useCallback((v: boolean) => {
    try {
      window.localStorage.setItem(KEY, v ? "on" : "off");
    } catch {
      // private mode: the toggle just won't persist
    }

    listeners.forEach((l) => l());
  }, []);

  return { enabled, setEnabled };
}
```

`useBattleFxQueue.ts`:

```ts
"use client";

import { useCallback, useState } from "react";

import { advanceFxQueue, INITIAL_FX_QUEUE, shiftFxQueue } from "@/lib/utils/battle/fx";

import { useBattleSceneData } from "./useBattleScene";

export function useBattleFxQueue(enabled: boolean) {
  const log = useBattleSceneData().battle.battleLog;

  const [state, setState] = useState(INITIAL_FX_QUEUE);

  if (state.log !== log) setState(advanceFxQueue(state, log, enabled));

  const done = useCallback(() => setState(shiftFxQueue), []);

  return { current: state.queue[0] ?? null, done };
}
```

`BattleFxLayer.tsx`:

```tsx
"use client";

import { useEffect, useRef } from "react";

import { ANIMATIONS } from "@/components/battle/fx/animations";
import { stageFor } from "@/components/battle/fx/runtime/canvas";
import { PALETTE } from "@/components/battle/fx/runtime/palette";
import { resolvePoints } from "@/components/battle/fx/runtime/anchors";
import { useBattleFxQueue, useFxEnabled } from "@/lib/hooks/battle";

import "@/components/battle/fx/fx.css";

const MAX_FX_MS = 3000;

export function BattleFxLayer() {
  const layer = useRef<HTMLDivElement>(null);

  const { enabled } = useFxEnabled();

  const { current, done } = useBattleFxQueue(enabled);

  useEffect(() => {
    const el = layer.current;

    if (!current || !el) return;

    let finished = false;

    const finish = () => {
      if (finished) return;

      finished = true;
      done();
    };

    // a broken animation must never stall the queue
    const guard = window.setTimeout(finish, MAX_FX_MS);

    // everything async, so done() never runs synchronously inside the effect
    Promise.resolve()
      .then(() => {
        const points = resolvePoints(current);

        return points ? ANIMATIONS[current.archetype]({ spec: current, stage: stageFor(el), layer: el, ...points, palette: PALETTE[current.element] }) : undefined;
      })
      .catch((e: unknown) => console.warn("battle fx", e))
      .finally(() => {
        window.clearTimeout(guard);
        finish();
      });
  }, [current, done]);

  return <div ref={layer} className="fx-layer" aria-hidden />;
}
```

Mount it in `BattleScreen.tsx` as the last child of the non-prepared `battle-hud` div, via `next/dynamic` with `ssr: false` (like `ResultOverlay`) so the FX code stays out of the entry chunk:

```tsx
const BattleFxLayer = dynamic(() => import("@/components/battle/fx/BattleFxLayer").then((m) => m.BattleFxLayer), { ssr: false });
```

Export `useBattleFxQueue` and `useFxEnabled` from `lib/hooks/battle/index.ts`.

Anchors: `Portrait` (`components/battle/hud/Portrait.tsx`) renders the portrait `span`. Add an optional prop `fxId?: string` that sets `data-fx-participant`. Pass `fxId={participant.basicInfo.id}` from `ParticipantRow` and `MyHeroPanel`. In `InitiativeTrack`, put `data-fx-participant` + `data-fx-anchor="track"` on each button.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test:run components/battle/fx lib/hooks/battle lib/utils/battle/fx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/battle lib/hooks/battle
git commit -m "feat(battle): FX overlay plays new battle events for every viewer"
```

---

### Task 6: Hit sync and the on/off toggle

**Files:**
- Create: `lib/hooks/battle/useFxImpactDelay.ts`
- Modify: `components/battle/participants/ParticipantRow.tsx`, `components/battle/participants/MyHeroPanel.tsx`, `lib/hooks/battle/useHpChange.ts` (`useDamageShake` gets an optional `delayMs`), `components/battle/scene/BattleTopBar.tsx` (toggle), `lib/hooks/battle/index.ts`
- Test: `lib/hooks/battle/__tests__/useHpChange.test.ts` (extend or create: the shake starts after the delay, using fake timers)

**Interfaces:**
- Consumes: `impactDelayFor` (Task 3), `useFxEnabled` (Task 5).
- Produces: `useFxImpactDelay(participantId: string): number`. It returns 0 when FX is disabled; otherwise `impactDelayFor(lastLoggedAction, participantId)`. `lastLoggedAction` is the entry with the max `actionIndex` that is not cancelled.

- [ ] **Step 1: Write the failing test** for `useDamageShake(change, delayMs)`. With fake timers, `el.animate` is not called before `delayMs` and is called after it.

- [ ] **Step 2: Run it**

Run: `pnpm test:run lib/hooks/battle/__tests__/useHpChange.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

- `useDamageShake(change, delayMs = 0)`: wrap the existing animate call in `setTimeout(..., delayMs)` and clear it on cleanup.
- `useFxImpactDelay`:

```ts
"use client";

import { useMemo } from "react";

import { impactDelayFor } from "@/lib/utils/battle/fx";

import { useBattleSceneData } from "./useBattleScene";
import { useFxEnabled } from "./useFxEnabled";

export function useFxImpactDelay(participantId: string): number {
  const log = useBattleSceneData().battle.battleLog;

  const { enabled } = useFxEnabled();

  return useMemo(() => {
    if (!enabled) return 0;

    const last = log.reduce<(typeof log)[number] | undefined>((m, a) => (!a.isCancelled && (!m || a.actionIndex > m.actionIndex) ? a : m), undefined);

    return impactDelayFor(last, participantId);
  }, [log, enabled, participantId]);
}
```

- In `ParticipantRow` and `MyHeroPanel`: `const delay = useFxImpactDelay(participant.basicInfo.id);`, then:
  - pass `delay` to `useDamageShake(change, delay)`;
  - add `style={{ animationDelay: \`${delay}ms\` }}` to the floating number span and to the Portrait flash (Portrait gets `style` passthrough, or wrap it).
  - The float already starts at `opacity-0` (keyframe 0%), so a delay keeps it hidden until impact. The flash keyframe has no visible 0% frame, so it is safe too.
- In `BattleTopBar`, add an icon button (lucide `Sparkles` / `SparklesIcon` off state) with `aria-label` «Анімації дій: увімк.» / «… вимк.» that calls `setEnabled(!enabled)`. Read the file first and match the existing button style.

- [ ] **Step 4: Run tests**

Run: `pnpm test:run lib/hooks/battle components/battle`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/hooks/battle components/battle
git commit -m "feat(battle): damage numbers wait for the FX impact; FX toggle in the top bar"
```

---

### Task 7: Persistent status auras (effects lasting 1+ round)

**Files:**
- Create: `lib/utils/battle/fx/aura.ts`
- Create: `components/battle/fx/auras/{plague,burning,frost,decay,bleeding,static,regen,blessing,shield,curse,marked,stun,bind,charm}.tsx`, each with a sibling `.module.css`
- Create: `components/battle/fx/auras/StatusAuras.tsx`
- Modify: `components/battle/participants/ParticipantRow.tsx`, `components/battle/participants/MyHeroPanel.tsx`, `lib/utils/battle/fx/index.ts`, `components/battle/fx-lab/*` (aura gallery)
- Test: `lib/utils/battle/fx/__tests__/aura.test.ts`

**Interfaces:**
- Consumes: `ActiveEffect` (`types/battle.ts:16`); `useFxEnabled` (Task 5).
- Produces:
  - `aura.ts`:
    - `type FxAuraKind = "stun" | "charm" | "bind" | "plague" | "burning" | "frost" | "decay" | "bleeding" | "static" | "marked" | "curse" | "regen" | "shield" | "blessing"`
    - `MAX_AURAS = 2`
    - `auraOf(effect: ActiveEffect): FxAuraKind | null`
    - `aurasOf(effects: ActiveEffect[]): FxAuraKind[]`: distinct kinds, sorted by `AURA_PRIORITY`, at most `MAX_AURAS`.
  - `StatusAuras({ effects, size }: { effects: ActiveEffect[]; size: number })`: renders `null` when FX is off. Otherwise it renders an absolutely positioned layer (`pointer-events-none absolute inset-0`) with one aura component per kind. The parent must be `relative`; the portrait wrapper already is.

Rules for `auraOf`, checked in this order:
1. `permanent` or `zone` effects → `null`. Passives and zone auras are not "hanging" effects.
2. `duration < 1` → `null`.
3. `charmOrigin` → `"charm"`.
4. `type === "condition"`: if `effects` contains `skip_action` → `"stun"`, else `"bind"` (no_bonus_action, no_reaction, disable_*).
5. `dotDamage`, by `dotDamage.damageType`:
   - `poison`/`acid` → `"plague"`
   - `fire` → `"burning"`
   - `cold` → `"frost"`
   - `necrotic` → `"decay"`
   - `bleed`/`slashing`/`piercing`/`bludgeoning`/`physical` → `"bleeding"`
   - `lightning`/`thunder` → `"static"`
   - anything else → `"decay"`
6. `hotHeal` → `"regen"`.
7. `abilityEffects` has a flag `advantageForAttackers` → `"marked"`.
8. `type === "buff"`: an armor/`guard`-like effect (any `effects[].type` in `armor`, `ac`, `guard`, or `abilityEffects` with `modifyStat` on `armor`) → `"shield"`, else `"blessing"`.
9. `type === "debuff"` → `"curse"`.

`AURA_PRIORITY` (first wins): stun, charm, bind, plague, burning, frost, decay, bleeding, static, marked, curse, regen, shield, blessing.

Look of each aura. Everything is CSS: gradients, a few `<span>` particles, keyframes on transform/opacity only. Sized relative to the portrait (`size` prop → CSS var `--s`).
- `plague`: green (`#7dff5a` → transparent) radial glow rising from below the portrait, pulsing (2.4 s). 4 small green spores drift up and fade.
- `burning`: orange glow at the bottom, 5 embers rising with sideways drift and flicker.
- `frost`: pale blue rim (`box-shadow` inset + outer) and 3 slow sparkles; slight blue tint overlay.
- `decay`: dark violet smoke ring that slowly rotates (conic gradient with blur).
- `bleeding`: 2 red drops falling from the portrait's lower edge on a loop.
- `static`: a blue-white flicker outline with 2 short arcs blinking at random-looking offsets (staggered delays).
- `regen`: soft green motes rising inside the portrait circle and a slow green breathing rim.
- `blessing`: golden halo ring above the head, gently bobbing.
- `shield`: a thin translucent blue hex/rounded shell around the portrait with a slow shine sweep.
- `curse`: purple glow sinking from above with a faint downward drift.
- `marked`: a small emerald leaf sigil above the portrait (CSS shape or an inline SVG path), pulsing (Hunter's mark).
- `stun`: 3 small stars orbiting above the head (rotating container).
- `bind`: a grey chain-like dashed ring tightening/loosening around the portrait.
- `charm`: 2 pink hearts floating up beside the portrait.

- [ ] **Step 1: Write the failing test** (`aura.test.ts`):

```ts
import { describe, expect, it } from "vitest";

import { auraOf, aurasOf, MAX_AURAS } from "@/lib/utils/battle/fx";
import type { ActiveEffect } from "@/types/battle";

const fx = (over: Partial<ActiveEffect>): ActiveEffect => ({ id: over.id ?? "e", name: "e", type: "debuff", duration: 2, appliedAt: { round: 1, timestamp: new Date(0) }, effects: [], ...over });

describe("auraOf", () => {
  it("poison dot → plague, fire dot → burning, cold → frost, necrotic → decay, bleed → bleeding", () => {
    expect(auraOf(fx({ dotDamage: { damagePerRound: 3, damageType: "poison" } }))).toBe("plague");
    expect(auraOf(fx({ dotDamage: { damagePerRound: 3, damageType: "fire" } }))).toBe("burning");
    expect(auraOf(fx({ dotDamage: { damagePerRound: 3, damageType: "cold" } }))).toBe("frost");
    expect(auraOf(fx({ dotDamage: { damagePerRound: 3, damageType: "necrotic" } }))).toBe("decay");
    expect(auraOf(fx({ dotDamage: { damagePerRound: 3, damageType: "bleed" } }))).toBe("bleeding");
  });

  it("conditions: skip_action → stun, others → bind", () => {
    expect(auraOf(fx({ type: "condition", effects: [{ type: "skip_action", value: 100 }] }))).toBe("stun");
    expect(auraOf(fx({ type: "condition", effects: [{ type: "no_reaction", value: 1 }] }))).toBe("bind");
  });

  it("charm, regen, mark, buff, debuff", () => {
    expect(auraOf(fx({ charmOrigin: { side: "ally" as never, controlledBy: "u" } }))).toBe("charm");
    expect(auraOf(fx({ type: "buff", hotHeal: { healPerRound: 4 } }))).toBe("regen");
    expect(auraOf(fx({ abilityEffects: [{ kind: "flag", flag: "advantageForAttackers" }] as ActiveEffect["abilityEffects"] }))).toBe("marked");
    expect(auraOf(fx({ type: "buff" }))).toBe("blessing");
    expect(auraOf(fx({ type: "debuff" }))).toBe("curse");
  });

  it("permanent, zone and expired effects have no aura", () => {
    expect(auraOf(fx({ type: "buff", permanent: true }))).toBeNull();
    expect(auraOf(fx({ type: "buff", zone: { ownerId: "o", key: "z" } }))).toBeNull();
    expect(auraOf(fx({ type: "buff", duration: 0 }))).toBeNull();
  });
});

describe("aurasOf", () => {
  it(`keeps at most ${MAX_AURAS}, by priority, without duplicates`, () => {
    const list = [
      fx({ id: "1", type: "buff" }),
      fx({ id: "2", dotDamage: { damagePerRound: 2, damageType: "poison" } }),
      fx({ id: "3", dotDamage: { damagePerRound: 2, damageType: "poison" } }),
      fx({ id: "4", type: "condition", effects: [{ type: "skip_action", value: 100 }] }),
    ];

    expect(aurasOf(list)).toEqual(["stun", "plague"]);
  });

  it("no effects → []", () => {
    expect(aurasOf([])).toEqual([]);
  });
});
```

Before writing, check `ParticipantSide` values for `charmOrigin.side` and the `StaticEffect` shape for `abilityEffects`, and adjust the casts.

- [ ] **Step 2: Run it**

Run: `pnpm test:run lib/utils/battle/fx/__tests__/aura.test.ts`
Expected: FAIL (module missing).

- [ ] **Step 3: Implement `aura.ts`** following the rules above, and export `auraOf`, `aurasOf`, `MAX_AURAS` and `type FxAuraKind` from `lib/utils/battle/fx/index.ts`. Run the test → PASS.

- [ ] **Step 4: Build the aura files.** Full example (`plague.tsx` + `plague.module.css`); the other 13 follow the same shape with their own look from the list above:

```tsx
import styles from "./plague.module.css";

export function PlagueAura() {
  return (
    <span className={styles.root}>
      <span className={styles.glow} />
      {[0, 1, 2, 3].map((i) => <span key={i} className={styles.spore} style={{ left: `${20 + i * 20}%`, animationDelay: `${i * 0.6}s` }} />)}
    </span>
  );
}
```

```css
.root { position: absolute; inset: 0; pointer-events: none; }
.glow { position: absolute; left: -20%; right: -20%; bottom: -25%; height: 70%; border-radius: 50%; background: radial-gradient(ellipse at 50% 100%, rgba(125, 255, 90, .55), rgba(70, 200, 40, .2) 45%, transparent 70%); filter: blur(2px); mix-blend-mode: screen; animation: plague-pulse 2.4s ease-in-out infinite; }
.spore { position: absolute; bottom: 0; width: 4px; height: 4px; border-radius: 50%; background: #b6ff8a; box-shadow: 0 0 6px #7dff5a; opacity: 0; animation: plague-rise 2.4s ease-out infinite; }
@keyframes plague-pulse { 50% { opacity: .55; transform: scaleY(.85); } }
@keyframes plague-rise { 15% { opacity: .9; } to { opacity: 0; transform: translateY(calc(var(--s, 48px) * -0.9)) translateX(4px); } }
```

`StatusAuras.tsx`:

```tsx
"use client";

import { useFxEnabled } from "@/lib/hooks/battle";
import { aurasOf, type FxAuraKind } from "@/lib/utils/battle/fx";
import type { ActiveEffect } from "@/types/battle";

import { BindAura } from "./bind";
import { BleedingAura } from "./bleeding";
import { BlessingAura } from "./blessing";
import { BurningAura } from "./burning";
import { CharmAura } from "./charm";
import { CurseAura } from "./curse";
import { DecayAura } from "./decay";
import { FrostAura } from "./frost";
import { MarkedAura } from "./marked";
import { PlagueAura } from "./plague";
import { RegenAura } from "./regen";
import { ShieldAura } from "./shield";
import { StaticAura } from "./static";
import { StunAura } from "./stun";

const AURAS: Record<FxAuraKind, () => React.JSX.Element> = { stun: StunAura, charm: CharmAura, bind: BindAura, plague: PlagueAura, burning: BurningAura, frost: FrostAura, decay: DecayAura, bleeding: BleedingAura, static: StaticAura, marked: MarkedAura, curse: CurseAura, regen: RegenAura, shield: ShieldAura, blessing: BlessingAura };

export function StatusAuras({ effects, size }: { effects: ActiveEffect[]; size: number }) {
  const { enabled } = useFxEnabled();

  if (!enabled) return null;

  return (
    <span aria-hidden className="pointer-events-none absolute inset-0" style={{ ["--s" as string]: `${size}px` }}>
      {aurasOf(effects).map((kind) => {
        const Aura = AURAS[kind];

        return <Aura key={kind} />;
      })}
    </span>
  );
}
```

Mount it inside the portrait's relative wrapper:
- `ParticipantRow`: wrap the `Portrait` in `<span className="relative">…<StatusAuras effects={effects} size={48} /></span>`, using the `effects` prop the row already receives (the same list `EffectLine` shows, so enemy visibility rules stay intact).
- `MyHeroPanel`: same, with the hero's effects and its portrait size.

Keep `overflow` visible on those wrappers so glows can extend below and above the portrait.

- [ ] **Step 5: Aura gallery in the playground.** Add a «Аури» section to `/dev/fx-lab` that renders every `FxAuraKind` on a sample portrait (48 px), so all 14 can be seen at once.

- [ ] **Step 6: Verify**

Run: `pnpm test:run lib/utils/battle/fx && pnpm exec tsc --noEmit -p . && pnpm exec eslint --fix components/battle/fx components/battle/participants lib/utils/battle/fx`
Expected: green.

Visually in `/dev/fx-lab`: every aura is distinct, stays within ~25 % around the portrait, and has no layout shift.

- [ ] **Step 7: Commit**

```bash
git add lib/utils/battle/fx components/battle/fx components/battle/participants components/battle/fx-lab
git commit -m "feat(battle): persistent status auras for effects lasting 1+ round"
```

---

### Task 7b: Element hit frames on the target tile (user request 2026-10-18)

User: «якщо шкода вогнем — рамки не просто червоні, а з вогнем; якщо холодом — плитка ворога замерзає за декілька секунд, і так далі».
Today a hit only flashes the portrait red (`hud-flash-red`), floats the number and shakes the row. With FX enabled, the moment the hit lands (the same `delay` the row already uses from `useFxImpactDelay`), the whole participant tile (row on desktop/mobile lists, and the hero panel) gets an element-themed frame/overlay that lives 1.5–3 s and then fades. The red portrait flash stays only when FX is off.

**Files:**
- Create: `lib/utils/battle/fx/impact.ts` — `interface FxImpact { element: FxElement; kind: "damage" | "heal"; delayMs: number }`, `impactFor(action: BattleAction | undefined, participantId: string): FxImpact | null` (uses `mapAction(action)[0]`; null when the participant is not a target or the spec is a miss (`hit === false`); `kind` = `"heal"` for archetype `heal`, else `"damage"`; `delayMs` = `IMPACT_MS[archetype]`). Re-implement `impactDelayFor` as `impactFor(...)?.delayMs ?? 0` (keep its export and tests green). Export from the barrel.
- Create: `lib/hooks/battle/useFxImpact.ts` — `useFxImpact(participantId): FxImpact | null` (same last-non-cancelled-action logic as `useFxImpactDelay`, returns null when FX disabled). `useFxImpactDelay` may delegate to it.
- Create (one frame = one file pair, `components/battle/fx/frames/<name>.tsx` + `<name>.module.css`), CSS-only (transform/opacity/filter/background keyframes, no JS timers), each a `pointer-events-none absolute inset-0` overlay that plays once and ends fully transparent:
  - `fire`: flames licking along the tile border — orange/yellow gradient tongues rising from the bottom edge and sides (a few `<span>` flame shapes with flicker keyframes) + orange inner glow; 1.6 s, fades out.
  - `cold`: the tile freezes over a few seconds — frost creeps in from the edges (radial/linear white-blue gradients with a frosty noise-like layered gradient), icy blue border, slight blue `backdrop-filter`/tint; creep 1.2 s, hold 1.5 s, thaw 0.8 s (total ~3.5 s).
  - `lightning`: electric crackle — 2–3 zigzag bolts (inline SVG polylines) blinking along the border, white-blue flicker of the whole tile; 1.2 s.
  - `poison`: green bubbles rising from the bottom edge + sickly green inner glow; 1.8 s.
  - `necrotic`: the tile withers — dark violet vignette closing in from edges, desaturate via a dark overlay; 1.8 s.
  - `radiant`: bright golden rim burst + light rays from the target; 1.2 s.
  - `arcane`: violet runic ring sweeping around the border (conic gradient rotating); 1.4 s.
  - `physical`: red flash + a short diagonal white slash mark across the tile; 0.8 s.
  - `earth`: brown dust puff at the bottom + small debris + a crack line; 1.4 s.
  - `fury`: deep red pulsing border (2 pulses); 1.2 s.
  - `nature` (damage, e.g. Рій ос): green-yellow leaf/insect specks swirling around the border; 1.4 s.
  - `heal` (kind heal, any element): soft green glow + small "+" sparkles rising inside the tile; 1.4 s.
- Create: `components/battle/fx/frames/ImpactFrame.tsx` — `ImpactFrame({ impact }: { impact: FxImpact })` picks the frame component (`impact.kind === "heal"` → heal frame, else by `impact.element`) and wraps it in a span with `style={{ animationDelay: `${impact.delayMs}ms` }}` propagated to children via a CSS custom property `--fx-delay` used in every frame's `animation-delay` (so the frame starts exactly at impact). Respect reduced motion: `.battle-hud` already stops animations — make sure frames then render nothing visible (base opacity 0).
- Modify: `components/battle/participants/ParticipantRow.tsx` and `MyHeroPanel.tsx` — render `{change && impact && <ImpactFrame key={change.id} impact={impact} />}` inside the relative tile root (keyed by the HP change id so it replays per hit). When `impact` is non-null, skip the portrait `hud-flash-red`/`hud-flash-green` class (the frame replaces it); keep it when FX is off/impact null. Keep the hero panel's full-screen vignette.
- Modify: `/dev/fx-lab` — add «Рамки» gallery: a sample tile per element + heal with a ▶ that replays the frame.
- Test: `lib/utils/battle/fx/__tests__/impact.test.ts` — fire bolt target → `{ element: "fire", kind: "damage", delayMs: IMPACT_MS.bolt }`; heal spell target → kind heal; miss (ranged, isHit false) → null; non-target → null; undefined action → null; existing impact-delay tests still green.

Steps: RED → GREEN (`pnpm test:run lib/utils/battle/fx lib/hooks/battle components/battle`) → tsc + eslint --fix → headless screenshots of the «Рамки» gallery mid-animation (fire, cold at ~1.5 s, lightning, heal) — look at them → commit `feat(battle): element-themed hit frames on the target tile (fire burns, cold freezes)`.

---

### Task 7c: Persistent status auras on Canvas 2D (user request 2026-10-18)

Context: Task 7 shipped 15 persistent status auras as CSS-only file pairs (`components/battle/fx/auras/<kind>.tsx` + `.module.css`), rendered by `AuraLayer`/`StatusAuras` (`components/battle/fx/auras/StatusAuras.tsx`) around the portrait in `ParticipantRow` and `MyHeroPanel`, plus a gallery in `/dev/fx-lab`. The pure logic `aurasOf(effects)` / `auraOf` / `FxAuraKind` / `MAX_AURAS` in `lib/utils/battle/fx/aura.ts` is correct — keep it untouched. The user rejected CSS-only element frames as ugly and approved Canvas 2D particle frames (`components/battle/fx/frames/canvas/*`, e.g. fire.ts, cold.ts). The user now wants the auras on Canvas too.

**Goal:** same 15 aura kinds, same placement and rules, rendered with Canvas 2D particles/glows in the style of the approved frames — looping for as long as the effect is active.

**Architecture (binding):**
- One aura = one file: `components/battle/fx/auras/canvas/<kind>.ts` exporting `AuraAnimation = { start?(ctx): State; frame(g: CanvasRenderingContext2D, ctx: AuraCtx, t: number, dt: number): void }` (or an equivalent small interface you define in `auras/canvas/types.ts`) — an *endless* per-frame painter, not a promise. `AuraCtx` gives the portrait centre/radius inside the aura canvas (canvas is the portrait box + padding, e.g. pad = 0.6 × size so glows/particles can extend below/above) and a tiny per-aura particle list helper (spawn/update/draw with additive glow sprites — reuse `glow()`/`sprite()` from `components/battle/fx/runtime/canvas.ts`; do not create a Stage per aura).
- **One shared animation loop for all auras on the page** (`auras/canvas/loop.ts`): a registry of mounted aura canvases; a single `requestAnimationFrame` loop throttled to ~30 fps paints every *visible* registered canvas (IntersectionObserver marks visibility; offscreen canvases are skipped), stops completely when the registry is empty, and naturally pauses in hidden tabs. Per canvas, clear then paint its kinds (max 2).
- `AuraCanvas` component (`auras/canvas/AuraCanvas.tsx`): `{ kinds: FxAuraKind[]; size: number }` → a `pointer-events-none absolute` span centred on the portrait with a DPR-scaled canvas; registers in the loop on mount, unregisters on unmount/kinds change. `StatusAuras` keeps its props/behaviour (FX off → null) but renders `AuraCanvas`. Keep `AuraLayer`'s role for the lab gallery or replace it — your call, keep imports consistent.
- Reduced motion (`matchMedia("(prefers-reduced-motion: reduce)")`): paint a single static frame (t fixed) and do not register in the loop.
- Rows are memo'd and must not subscribe to the battle scene context (render-count tests in components/battle must stay green).
- Delete the 15 CSS file pairs once replaced.

**Look of each aura** (keep the Task 7 intent; make them read clearly at 48 px):
- plague: green glow rising from below + green spores drifting up and fading.
- burning: flames licking up from below the portrait + embers.
- frost: icy rim, a few ice needles around the circle, slow sparkles.
- decay: dark violet smoke curling around the portrait.
- bleeding: red drops falling from the lower edge.
- static: tiny white-blue arcs crackling on the rim.
- regen: soft green motes rising inside/around the circle, breathing green rim.
- blessing: golden halo ring above the head, gently bobbing, sparkles.
- shield: translucent blue shell around the portrait with a slow shine sweep.
- curse: purple glow sinking from above, faint downward wisps.
- marked: emerald leaf sigil above the portrait, pulsing (Hunter's mark).
- stun: 3 small stars orbiting above the head.
- bind: grey chain links (dashed ring) tightening/loosening around the portrait.
- charm: pink hearts floating up beside the portrait.
- rage: deep red pulsing glow + rising red wisps.

**Files:**
- Create: `components/battle/fx/auras/canvas/{types.ts,loop.ts,AuraCanvas.tsx,index.ts}` + 15 `<kind>.ts`
- Modify: `components/battle/fx/auras/StatusAuras.tsx`, `components/battle/fx-lab/FxLab.tsx` (gallery uses the canvas auras)
- Delete: `components/battle/fx/auras/*.module.css` and the CSS `<kind>.tsx` files
- Test: `components/battle/fx/auras/canvas/__tests__/loop.test.ts` (happy-dom; fake rAF/IntersectionObserver): registering starts the loop, unregistering the last canvas stops it, offscreen canvases are not painted, reduced motion paints once without registering.

**Verify:** `pnpm test:run lib/utils/battle/fx lib/hooks/battle components/battle` (incl. render-count), tsc, eslint --fix; headless screenshots of the «Аури» gallery (deviceScaleFactor 2) at two moments — every aura distinct and recognisable; also open the gallery in the profiler-free sense: confirm via a quick `performance.now()` sample in the page that the loop runs ≤ ~30 fps and stops when the gallery section is removed/scrolled away (IntersectionObserver).
**Commit:** `feat(battle): status auras on Canvas 2D with one shared throttled loop` + blank line + `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

---

### Task 7d: Physical hit frames split into melee and ranged (arrow) (user request 2026-10-18)

User: «до фізичної атаки додай окремо атаку ближню і дальню стрілою». Today every physical hit plays the single `physicalFrame` (components/battle/fx/frames/canvas/physical.ts). Split it:

- `physical-melee.ts` (rename/rework the current physical.ts): a weapon strike — 1–2 bright slash streaks across the tile (diagonal, fast wipe-in then fade), short red flash, steel sparks flying from the cut point, slight dent/shadow line left for ~0.5 s. ~0.9 s.
- `physical-ranged.ts` (new): an arrow hit — the arrow streaks in from the attacker's side (left for an ally shooter / right for an enemy shooter is not known inside the frame → come in from the side nearest the tile's horizontal edge closest to screen centre is overkill; just come in from the left at a slight downward angle) and **sticks into the tile** near the portrait/left third: draw a shaft (thin brown line) with fletching (two small angled strokes) and a dark head buried in the tile; on impact a small thunk ring + wood splinters/dust particles; the arrow stays stuck ~0.8 s, quivers (small sinusoidal wobble of the tail for 0.3 s), then fades. ~1.4 s.

Plumbing:
- `lib/utils/battle/fx/impact.ts`: `FxImpact` gains `attack?: "melee" | "ranged"` — set from the primary spec's archetype (`melee` → "melee", `ranged` → "ranged"; otherwise undefined). Tests in `lib/utils/battle/fx/__tests__/impact.test.ts`: melee physical hit → attack "melee"; ranged physical hit → attack "ranged"; spell bolt → attack undefined.
- `components/battle/fx/frames/canvas/index.ts`: export `frameFor(impact: FxImpact): FrameAnimation` — heal → HEAL_FRAME; `element === "physical"` → `impact.attack === "ranged" ? physicalRangedFrame : physicalMeleeFrame`; else `FRAME_ANIMATIONS[element]` (keep `FRAME_ANIMATIONS` with `physical: physicalMeleeFrame` so the Record stays exhaustive). `ImpactFrame` uses `frameFor`.
- Elemental ranged attacks (e.g. a fire arrow, if `damageRolls[0].damageType` is fire) keep their element frame — only physical splits.
- `/dev/fx-lab` «Рамки» gallery: replace the single «Фізичний» tile by «Ближня атака» and «Стріла».

Verify: `pnpm test:run lib/utils/battle/fx lib/hooks/battle components/battle`, tsc, eslint --fix; headless screenshots of both new tiles at ~3 moments (deviceScaleFactor 2) — the arrow must read as an arrow stuck in the tile.
Commit: `feat(battle): separate melee and arrow hit frames for physical attacks` + blank line + `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

---

### Task 8: Full verification

- [ ] **Step 1: Static checks and tests**

Run: `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test:run`
Expected: all green.

- [ ] **Step 2: Battle sweep on a prod copy**

Run: `./scripts/db/prodcopy-db.sh && DATABASE_URL=postgresql://postgres:postgres@localhost:54322/prodcopy pnpm battle-sweep`
Expected: exit 0. The report has no errors; the new `actionDetails` fields appear on spell events.

- [ ] **Step 3: Browser check** (`pnpm dev`, Claude in Chrome, a real battle in a local campaign)
  - Desktop 1440×900: melee hit, melee miss, ranged, fire bolt, area spell, heal, buff, debuff, a kill (death). Each plays once and the damage number appears at impact.
  - Second tab as another member: the same animations arrive via Pusher.
  - Mobile 390×844: an enemy attack while the Allies tab is shown comes from the top edge. An attack on a target on the hidden tab plays nothing and the queue continues.
  - Reload the page: nothing replays. «Показати раніші»: nothing plays. DM undo: nothing plays.
  - Toggle off in the top bar: no animations, numbers not delayed, no auras. Reload: the setting persists.
  - Hit frames: fire damage → the target tile burns; cold → the tile freezes over for ~3 s and thaws; lightning crackle; heal glow; miss → no frame.
  - Status auras: cast a poison DoT (plague glow from below), a fire DoT, a stun, a buff and the elves' Hunter mark. Each aura appears on cast, stays across turns and disappears when the effect expires or is cleansed. A participant with 4 effects shows exactly 2 auras. Mobile: auras visible on rows and on the hero panel.
  - Console: no errors.

- [ ] **Step 4: Bundle check**

Run: `pnpm build`. Confirm that the battle page entry chunk does not contain `components/battle/fx` (it loads via `dynamic`) and that no removed library appears in `.next` (`grep -r "pixi\|gsap\|tsparticles" .next/static | head` → empty).

- [ ] **Step 5: Final review**

Run one whole-branch review (opus) and one fix wave. Then hand over to the user: `superpowers:finishing-a-development-branch`.
