import type { BattleAttack, BattleParticipant } from '@/types/battle';

export type AmmoStatus = 'ok' | 'empty' | 'reloading';

export function ammoStatus(
    p: BattleParticipant,
    attack: BattleAttack
): AmmoStatus {
    const { ammo, reload } = p.battleData;

    if (!attack.id || !attack.ammo?.capacity) return 'ok';

    if ((reload?.[attack.id] ?? 0) > 0) return 'reloading';

    return ammo && ammo[attack.id] !== undefined && ammo[attack.id] <= 0
        ? 'empty'
        : 'ok';
}

export function emptyAmmo(
    p: BattleParticipant,
    attack: BattleAttack
): BattleParticipant {
    const { ammo } = p.battleData;

    if (!attack.id || !attack.ammo?.capacity || !ammo) return p;

    const reload = attack.ammo.reload ?? 0;

    const armed = (p.battleData.reload?.[attack.id] ?? 0) > 0;

    return {
        ...p,
        battleData: {
            ...p.battleData,
            ammo: { ...ammo, [attack.id]: 0 },
            ...(reload > 0 &&
                !armed && {
                    reload: { ...p.battleData.reload, [attack.id]: reload + 1 },
                }),
        },
    };
}

/** Reload X is armed as X+1: the end of the emptying turn itself does not count. */
export function spendAmmo(
    p: BattleParticipant,
    attack: BattleAttack
): BattleParticipant {
    const { ammo } = p.battleData;

    if (
        !attack.id ||
        !attack.ammo?.capacity ||
        !ammo ||
        ammo[attack.id] === undefined
    )
        return p;

    const left = Math.max(0, ammo[attack.id] - 1);

    const reload = attack.ammo.reload ?? 0;

    return {
        ...p,
        battleData: {
            ...p.battleData,
            ammo: { ...ammo, [attack.id]: left },
            ...(left === 0 &&
                reload > 0 && {
                    reload: { ...p.battleData.reload, [attack.id]: reload + 1 },
                }),
        },
    };
}
