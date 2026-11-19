import type { Amount } from '@/lib/utils/abilities/schema';
import type { ActiveEffect, BattleParticipant } from '@/types/battle';

export const HELD_DIE_EFFECT = 'd20Rider';

export interface HeldRider {
    effectId: string;
    die: number;
}

const DIE_RE = /d\s*(\d+)/i;

/** Die size of a held-die amount: a number, a "D6"/"1d8" string, or a resolved formula result */
export function dieSizeOf(amount: Amount, resolved: number): number {
    if (typeof amount === 'string') {
        const match = DIE_RE.exec(amount);

        return match ? Number(match[1]) : 0;
    }

    return Math.max(0, Math.floor(resolved));
}

const dieOf = (e: ActiveEffect): number =>
    e.effects.find((x) => x.type === HELD_DIE_EFFECT)?.value ?? 0;

export function heldRider(p: BattleParticipant): HeldRider | null {
    const best = p.battleData.activeEffects
        .filter((e) => dieOf(e) > 0)
        .sort((a, b) => dieOf(b) - dieOf(a))[0];

    return best ? { effectId: best.id, die: dieOf(best) } : null;
}

export function consumeRider(
    ps: BattleParticipant[],
    holderId: string,
    effectId: string
): BattleParticipant[] {
    return ps.map((p) =>
        p.basicInfo.id === holderId
            ? {
                  ...p,
                  battleData: {
                      ...p.battleData,
                      activeEffects: p.battleData.activeEffects.filter(
                          (e) => e.id !== effectId
                      ),
                  },
              }
            : p
    );
}
