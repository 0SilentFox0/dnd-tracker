import { describe, expect, it } from 'vitest';

import { ParticipantSide } from '@/lib/constants/battle';
import { makeParticipant } from '@/lib/utils/abilities/__tests__/fixtures';
import { applyEffect } from '@/lib/utils/abilities/registry/effects';
import type { Effect } from '@/lib/utils/abilities/schema';
import { castSpell } from '@/lib/utils/battle/spell';
import type { CastableSpell } from '@/lib/utils/battle/types/spell-process';
import { DEFAULT_RULES } from '@/lib/utils/rules/__tests__/fixtures/default-rules';
import type { SpellEffect } from '@/lib/utils/spells/model/schema';
import type { BattleParticipant } from '@/types/battle';
import type { BattleMapConfig, GridPoint } from '@/types/battle-grid';

const map: BattleMapConfig = {
    cols: 20,
    rows: 10,
    background: null,
    opacity: 0.3,
};

const at = (p: BattleParticipant, position: GridPoint): BattleParticipant => ({
    ...p,
    battleData: { ...p.battleData, position },
});

const caster = () => {
    const c = at(makeParticipant({ id: 'c' }), { x: 0, y: 5 });

    return {
        ...c,
        spellcasting: {
            ...c.spellcasting,
            spellSlots: { '2': { max: 1, current: 1 } },
        },
    };
};

const misty: CastableSpell = {
    id: 'misty',
    name: 'Misty Step',
    level: 2,
    groupId: 'Conjuration',
    definition: {
        dice: 0,
        cost: 'bonusAction',
        targeting: {
            kind: 'template',
            shape: 'circle',
            size: 5,
            side: 'all',
            maxTargets: 20,
            exact: true,
            range: 30,
        },
        resolution: { kind: 'auto' },
        effects: [{ kind: 'teleportSelf' }] as SpellEffect[],
        raceModifiers: [],
    },
};

const cast = (aim: GridPoint | undefined, extra: BattleParticipant[] = []) => {
    const c = caster();

    const r = castSpell({
        rules: DEFAULT_RULES,
        caster: c,
        spell: misty,
        targetIds: [],
        allParticipants: [c, ...extra],
        currentRound: 1,
        battleId: 'b',
        diceRolls: [],
        rng: () => 0.5,
        map,
        ...(aim && { aim }),
    });

    return r.allParticipantsUpdated.find((p) => p.basicInfo.id === 'c')!;
};

describe('teleportSelf', () => {
    it('moves the caster to the aimed free cell', () => {
        expect(cast({ x: 5, y: 5 }).battleData.position).toEqual({
            x: 5,
            y: 5,
        });
    });

    it('stays put when the aimed cell is occupied', () => {
        const blocker = at(
            makeParticipant({ id: 'b', side: ParticipantSide.ENEMY }),
            { x: 5, y: 5 }
        );

        expect(cast({ x: 5, y: 5 }, [blocker]).battleData.position).toEqual({
            x: 0,
            y: 5,
        });
    });

    it('stays put without an aimed cell', () => {
        expect(cast(undefined).battleData.position).toEqual({ x: 0, y: 5 });
    });
});

const apply = (effect: Effect, target: BattleParticipant) => {
    const owner = makeParticipant({ id: 'o' });

    return applyEffect({
        participants: [owner, target],
        ability: {
            id: 'a',
            name: 'Aid',
            trigger: { event: 'spellCast', phase: 'after', role: 'caster' },
            effects: [effect],
        },
        effectIndex: 0,
        ownerId: 'o',
        effect,
        targetIds: [target.basicInfo.id],
        event: { type: 'spellCast', phase: 'after', actorId: 'o', targetIds: [] },
        ctx: { round: 1, rng: () => 0.5, rules: DEFAULT_RULES },
    }).participants.find((p) => p.basicInfo.id === target.basicInfo.id)!;
};

describe('maxHpBoost', () => {
    it('raises both maximum and current HP', () => {
        const t = makeParticipant({ id: 't', hp: 20, maxHp: 30 });

        const r = apply({ kind: 'maxHpBoost', amount: 10 }, t);

        expect(r.combatStats.maxHp).toBe(40);
        expect(r.combatStats.currentHp).toBe(30);
    });
});

describe('mark positive', () => {
    it('applies a beneficial marker instead of a debuff', () => {
        const t = makeParticipant({ id: 't' });

        const r = apply(
            {
                kind: 'mark',
                markId: 'detect-magic',
                positive: true,
                duration: { rounds: 100 },
            },
            t
        );

        expect(r.battleData.activeEffects.map((e) => e.type)).toEqual([
            'buff',
        ]);
    });
});

describe('cleanse includeBuffs', () => {
    it('dispels beneficial effects only when asked', () => {
        const marked = apply(
            {
                kind: 'mark',
                markId: 'shield',
                positive: true,
                duration: { rounds: 10 },
            },
            makeParticipant({ id: 't' })
        );

        expect(
            apply({ kind: 'cleanse' }, marked).battleData.activeEffects
        ).toHaveLength(1);
        expect(
            apply({ kind: 'cleanse', includeBuffs: true }, marked).battleData
                .activeEffects
        ).toHaveLength(0);
    });
});
