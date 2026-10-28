import { computeRig, DICE_FADE_MS, DICE_HOLD_MS, DICE_TOTAL_MS, type DiceThrowSpec, DIE_RADIUS, type DieSlot, getPolyhedron, layoutDice, lowestY, planThrow, type Quat, type Rig, sampleThrow, settleProgress, slotPosition, THROW_MS, type ThrowPlan, type Vec3 } from "@/lib/utils/battle/fx/dice";
import type { DieSides } from "@/types/battle";

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
  createDie: (die: { sides: DieSides; value: number; dropped?: boolean }) => DieHandle;
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

const gridOf = (slots: DieSlot[]) => ({ cols: Math.max(1, ...slots.map((s) => s.rowLength)), rows: Math.max(1, ...slots.map((s) => s.row + 1)) });

export function createDiceEngine(host: HTMLElement, makeBackend: (host: HTMLElement) => Backend): DiceEngine {
  const backend = makeBackend(host);

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
  }

  function stop() {
    cancelAnimationFrame(frame);
    frame = 0;
    dice.forEach((d) => d.handle.dispose());
    dice = [];
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

    dice.forEach((d) => {
      const k = (elapsedMs / 1000 - d.plan.delay) / d.plan.duration;

      if (k < 0) {
        d.handle.setPose(HIDDEN);

        return;
      }

      const settleMs = (k - 1) * d.plan.duration * 1000;

      const pose = sampleThrow(d.plan, k);

      d.handle.setPose({ x: pose.x, y: pose.height - lowestY(d.vertices, pose.q, DIE_RADIUS), z: pose.z, q: pose.q, settle: settleProgress(settleMs), visible: true });
    });

    const fade = (elapsedMs - THROW_MS - DICE_HOLD_MS) / DICE_FADE_MS;

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

      const { slots } = layoutDice(spec.groups);

      if (!slots.length) return Promise.resolve();

      const shapes = slots.map((slot) => {
        const poly = getPolyhedron(slot.sides);

        const face = poly.faces.find((f) => f.value === slot.value);

        if (!face) throw new Error(`d${slot.sides}: no face ${slot.value}`);

        return { face, vertices: poly.vertices };
      });

      grid = gridOf(slots);
      layout();
      dice = slots.map((slot, i) => ({
        handle: backend.createDie(slot),
        plan: planThrow(spec.seed, i, shapes[i].face, slotPosition(slot, grid.rows), rig),
        slot,
        vertices: shapes[i].vertices,
      }));
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
      backend.dispose();
    },
  };
}
