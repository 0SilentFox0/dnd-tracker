import { describe, expect, it } from 'vitest';

import {
    makeEffect,
    makeParticipant,
    seq,
} from '@/lib/utils/abilities/__tests__/fixtures';
import type { StaticEffect } from '@/lib/utils/abilities/schema';
import { createCritGate } from '@/lib/utils/battle/crit-choice/gate';
import { HELD_DIE_EFFECT } from '@/lib/utils/battle/d20-rider/held';
import type { Ruleset } from '@/lib/utils/rules';
import { DEFAULT_RULES } from '@/lib/utils/rules/__tests__/fixtures/default-rules';
import { concentrationCheck } from '@/systems/d20/rules/concentration/check';
import {
    beginConcentration,
    dropBarredConcentration,
    hasConcentration,
} from '@/systems/d20/rules/concentration/sustain';
import type { BattleParticipant } from '@/types/battle';

const rules = (rageBreaks?: boolean): Ruleset => ({
    ...DEFAULT_RULES,
    concentration: { enabled: true, dcCap: null, rageBreaks },
});

const withEffects = (
    p: BattleParticipant,
    effects: BattleParticipant['battleData']['activeEffects']
): BattleParticipant => ({
    ...p,
    battleData: {
        ...p.battleData,
        activeEffects: [...p.battleData.activeEffects, ...effects],
    },
});

const concentrating = (): BattleParticipant[] =>
    beginConcentration(
        [makeParticipant({ id: 'c' })],
        'c',
        'c:sp@1#0',
        'Bless',
        10
    ).participants;

const rage = makeEffect('rage', {
    abilityEffects: [
        { kind: 'flag', flag: 'noSpellcasting' },
    ] as StaticEffect[],
});

describe('dropBarredConcentration', () => {
    it('drops the hold of a caster under noSpellcasting when the flag is on', () => {
        const [c] = concentrating();

        const ps = [withEffects(c, [rage])];

        const r = dropBarredConcentration(ps, rules(true));

        expect(hasConcentration(r.participants[0])).toBe(false);
        expect(r.messages).toHaveLength(1);
    });

    it('keeps the hold when the flag is off or nothing bars casting', () => {
        const [c] = concentrating();

        const raging = [withEffects(c, [rage])];

        expect(dropBarredConcentration(raging, rules(false)).participants).toBe(
            raging
        );
        expect(dropBarredConcentration([c], rules(true)).participants).toEqual([
            c,
        ]);
    });
});

describe('concentration save and the held die', () => {
    it('offers the held die on the CON save', () => {
        const [c] = concentrating();

        const holder = withEffects(c, [
            makeEffect('insp', {
                effects: [{ type: HELD_DIE_EFFECT, value: 6 }],
            }),
        ]);

        const gate = createCritGate({ rng: seq(0.1, 0.1, 0.1) });

        concentrationCheck({
            caster: holder,
            damage: 40,
            participants: [holder],
            rules: rules(),
            rng: seq(0.1),
            rider: gate.pick.rider,
        });

        expect(gate.offers).toHaveLength(1);
        expect(gate.offers[0]).toMatchObject({ holderId: 'c', kind: 'save' });
    });
});
