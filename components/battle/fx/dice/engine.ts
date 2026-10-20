import { type BadgeSpec, createBadgeLayer } from "./badges";

import { computeRig, DIE_RADIUS, type DiceThrowSpec, type DieSlot, getPolyhedron, layoutDice, lowestY, planThrow, project, type Quat, type Rig, sampleThrow, settleProgress, slotPosition, THROW_MS, type ThrowPlan, type Vec3 } from "@/lib/utils/battle/fx/dice";
import type { DieSides } from "@/types/battle";

const HOLD_MS = 350;

const FADE_OUT_MS = 400;

// останній кубик стартує до 0.3 с пізніше (planThrow) — все одно встигає лягти в межах показу
export const DICE_TOTAL_MS = THROW_MS + HOLD_MS + FADE_OUT_MS;

const CAPTION_GAP_PX = 56;

export interface DiceEngine {
  roll(spec: DiceThrowSpec): Promise<void>;
  cancel(): void;
  dispose(): void;
}

export interface DiePose {
  x: number;
  y: number;
  z: number;
  q: Quat;
  settle: number;
  visible: boolean;
}

export interface DieHandle {
  setPose: (pose: DiePose) => void;
  dispose: () => void;
}

export interface Backend {
  resize: (width: number, height: number, rig: Rig) => void;
  createDie: (sides: DieSides, value: number) => DieHandle;
  render: () => void;
  dispose: () => void;
}

interface ActiveDie {
  handle: DieHandle;
  plan: ThrowPlan;
  slot: DieSlot;
  vertices: Vec3[];
}

const HIDDEN: DiePose = { x: 0, y: 0, z: 0, q: [0, 0, 0, 1], settle: 0, visible: false };

const plural = (n: number, one: string, few: string, many: string) => {
  const d = n % 10;

  const dd = n % 100;

  if (d === 1 && dd !== 11) return one;

  return d >= 2 && d <= 4 && (dd < 12 || dd > 14) ? few : many;
};

export function captionLines(spec: DiceThrowSpec, overflow: number): string[] {
  const extra = [
    spec.extraSaves > 0 && `+${spec.extraSaves} ${plural(spec.extraSaves, "рятунок", "рятунки", "рятунків")}`,
    overflow > 0 && `+${overflow} ${plural(overflow, "кубик", "кубики", "кубиків")}`,
  ].filter((s): s is string => Boolean(s));

  return [spec.caption, ...(extra.length ? [extra.join(" · ")] : [])].filter(Boolean);
}

const badgeState = (slot: DieSlot): BadgeSpec["state"] => (slot.chosen ? "chosen" : slot.dropped ? "dropped" : "plain");

const gridOf = (slots: DieSlot[]) => ({ cols: Math.max(1, ...slots.map((s) => s.rowLength)), rows: Math.max(1, ...slots.map((s) => s.row + 1)) });

export function createDiceEngine(host: HTMLElement, makeBackend: (host: HTMLElement) => Backend): DiceEngine {
  const backend = makeBackend(host);

  const badges = createBadgeLayer(host);

  let dice: ActiveDie[] = [];

  let grid = { cols: 1, rows: 1 };

  let rig = computeRig(grid, { width: 1, height: 1 });

  let startedAt = 0;

  let frame = 0;

  let finish: (() => void) | null = null;

  function layout() {
    const w = host.clientWidth || 1;

    const h = host.clientHeight || 1;

    rig = computeRig(grid, { width: w, height: h });
    backend.resize(w, h, rig);

    const r = DIE_RADIUS * 1.2;

    let top = Infinity;

    dice.forEach((d, i) => {
      const end = slotPosition(d.slot, grid.rows);

      const [x, y] = project(rig, [end[0] + rig.up[0] * r, end[1] + rig.up[1] * r, end[2] + rig.up[2] * r], w, h);

      badges.move(i, x, y);
      top = Math.min(top, y);
    });

    if (Number.isFinite(top)) badges.moveCaption(w / 2, Math.max(CAPTION_GAP_PX, top - CAPTION_GAP_PX));
  }

  function stop() {
    cancelAnimationFrame(frame);
    frame = 0;
    dice.forEach((d) => d.handle.dispose());
    dice = [];
    badges.clear();
    host.style.opacity = "";
    backend.render();

    const done = finish;

    finish = null;
    done?.();
  }

  function tick(now: number) {
    const elapsedMs = now - startedAt;

    if (elapsedMs >= DICE_TOTAL_MS) {
      stop();

      return;
    }

    dice.forEach((d, i) => {
      const k = (elapsedMs / 1000 - d.plan.delay) / d.plan.duration;

      if (k < 0) {
        d.handle.setPose(HIDDEN);

        return;
      }

      const settleMs = (k - 1) * d.plan.duration * 1000;

      const pose = sampleThrow(d.plan, k);

      d.handle.setPose({ x: pose.x, y: pose.height - lowestY(d.vertices, pose.q, DIE_RADIUS), z: pose.z, q: pose.q, settle: settleProgress(settleMs), visible: true });

      if (settleMs >= 0) badges.reveal(i);
    });

    const fade = (elapsedMs - THROW_MS - HOLD_MS) / FADE_OUT_MS;

    host.style.opacity = fade > 0 ? String(1 - Math.min(1, fade)) : "";
    backend.render();
    frame = requestAnimationFrame(tick);
  }

  const observer = new ResizeObserver(() => {
    layout();

    if (!frame) backend.render();
  });

  observer.observe(host);
  layout();

  return {
    roll(spec) {
      stop();

      const { slots, overflow } = layoutDice(spec.groups);

      if (!slots.length) return Promise.resolve();

      const shapes = slots.map((slot) => {
        const poly = getPolyhedron(slot.sides);

        const face = poly.faces.find((f) => f.value === slot.value);

        if (!face) throw new Error(`d${slot.sides}: no face ${slot.value}`);

        return { face, vertices: poly.vertices };
      });

      grid = gridOf(slots);
      layout();
      badges.reset(
        slots.map((s) => ({ value: s.value, state: badgeState(s) })),
        captionLines(spec, overflow),
      );
      dice = slots.map((slot, i) => ({
        handle: backend.createDie(slot.sides, slot.value),
        plan: planThrow(spec.seed, i, shapes[i].face, slotPosition(slot, grid.rows), rig),
        slot,
        vertices: shapes[i].vertices,
      }));
      layout();
      startedAt = performance.now();

      return new Promise<void>((resolve) => {
        finish = resolve;
        frame = requestAnimationFrame(tick);
      });
    },
    cancel: stop,
    dispose() {
      stop();
      observer.disconnect();
      badges.dispose();
      backend.dispose();
    },
  };
}
