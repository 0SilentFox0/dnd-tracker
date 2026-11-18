import { DICE_TOTAL_MS } from '@/lib/utils/battle/fx/dice';

const waiters = new Set<() => void>();

// headroom for the three.js chunk and a delta not yet in the FX queue
const WAIT_SLACK_MS = 1500;

export function moraleDiceDone() {
    for (const resolve of [...waiters]) resolve();
}

/** The morale result overlay waits for its d10 to land, otherwise it covers the die. */
export function afterMoraleDice(signal?: AbortSignal): Promise<void> {
    return new Promise((resolve) => {
        const finish = () => {
            waiters.delete(finish);
            clearTimeout(timer);
            signal?.removeEventListener('abort', finish);
            resolve();
        };

        const timer = setTimeout(finish, DICE_TOTAL_MS + WAIT_SLACK_MS);

        waiters.add(finish);
        signal?.addEventListener('abort', finish);
    });
}
