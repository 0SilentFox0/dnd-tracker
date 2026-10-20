import { DICE_TOTAL_MS } from "@/lib/utils/battle/fx/dice";

const waiters = new Set<() => void>();

// запас на чанк three.js і дельту, що ще не дійшла до черги FX
const WAIT_SLACK_MS = 1500;

export function moraleDiceDone() {
  for (const resolve of [...waiters]) resolve();
}

/** Оверлей результату моралі чекає, поки ляже її d10: інакше він заступає кубик. */
export function afterMoraleDice(signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const finish = () => {
      waiters.delete(finish);
      clearTimeout(timer);
      signal?.removeEventListener("abort", finish);
      resolve();
    };

    const timer = setTimeout(finish, DICE_TOTAL_MS + WAIT_SLACK_MS);

    waiters.add(finish);
    signal?.addEventListener("abort", finish);
  });
}
