import { describe, expect, it } from 'vitest';

import { dispelMutation } from '../battle/dispel-mutation';
import { malignantMutation } from '../battle/malignant-mutation';

import '@/lib/server/systems/registry';
import { ParticipantSide } from '@/lib/constants/battle';
import {
    context,
    participant,
} from '@/lib/server/battles/__tests__/mutations/fixtures';
import { RulesetSchema } from '@/lib/utils/rules/schema';
import { bookExample } from '@/systems/wfrp/__tests__/canon/book-example';
import { slotOf } from '@/systems/wfrp/rules/__tests__/slot-fixtures';
import { DEFAULT_CHARACTERISTICS } from '@/systems/wfrp/rules/characteristics/keys';
import { WFRP_RULES } from '@/systems/wfrp/rules/rules-preset';
import { wfrpState, withWfrpState } from '@/systems/wfrp/rules/state';
import type { BattleParticipant } from '@/types/battle';

const rulesOf = (preset: 'canon5e' | 'legacy') =>
    RulesetSchema.parse({ ...WFRP_RULES, edition: { preset } });

const chars = slotOf({
    ...DEFAULT_CHARACTERISTICS,
    base: { ...DEFAULT_CHARACTERISTICS.base, int: 60, wp: 40 },
    skillAdvances: { 'language:magick': 10 },
});

const hero = (): BattleParticipant => {
    const base = participant('hero', { controlledBy: 'user-1' });

    return { ...base, abilities: { ...base.abilities, system: chars } };
};

const foe = (): BattleParticipant =>
    withWfrpState(
        participant('foe', {
            side: ParticipantSide.ENEMY,
            controlledBy: 'dm',
        }),
        { lastCast: { spell: 'Bolt', sl: 1 } }
    );

const ctxOf = (
    participants: BattleParticipant[],
    preset: 'canon5e' | 'legacy' = 'canon5e'
) => {
    const c = context({ participants, rng: () => 0.5 });

    return { ...c, meta: { ...c.meta, rules: rulesOf(preset) } };
};

const body = { participantId: 'hero', targetId: 'foe', mode: 'reactive' } as const;

const find = (out: { participants: BattleParticipant[] }, id: string) =>
    out.participants.find((p) => p.basicInfo.id === id)!;

describe('Dispel action', () => {
    bookExample(237, 'a won opposed test clears the last cast and uses the round', () => {
        const out = dispelMutation(ctxOf([hero(), foe()]), { ...body, roll: 10 });

        expect(wfrpState(find(out, 'foe')).lastCast).toBeUndefined();
        expect(wfrpState(find(out, 'hero')).dispelRound).toBeDefined();
        expect(out.events).toHaveLength(1);
    });

    it('only one reactive attempt per round', () => {
        const c = ctxOf([hero(), foe()]);

        const used = withWfrpState(hero(), { dispelRound: c.scene.round });

        expect(() =>
            dispelMutation(ctxOf([used, foe()]), { ...body, roll: 10 })
        ).toThrow('errors.dispelUsed');
    });

    it('needs a spell to dispel', () => {
        const bare = participant('foe', { side: ParticipantSide.ENEMY });

        expect(() =>
            dispelMutation(ctxOf([hero(), bare]), { ...body, roll: 10 })
        ).toThrow('errors.dispelNoTarget');
    });

    it('a persistent attempt needs a held spell with a CN', () => {
        expect(() =>
            dispelMutation(ctxOf([hero(), foe()]), {
                ...body,
                mode: 'persistent',
                roll: 10,
            })
        ).toThrow();
    });

    it('is unavailable outside canon5e', () => {
        expect(() =>
            dispelMutation(ctxOf([hero(), foe()], 'legacy'), { ...body, roll: 10 })
        ).toThrow();
    });
});

describe('Malignant Influence toggle', () => {
    it('sets and clears the flag', () => {
        const on = malignantMutation(ctxOf([hero()]), {
            participantId: 'hero',
            on: true,
        });

        expect(wfrpState(find(on, 'hero')).malignant).toBe(true);

        const off = malignantMutation(ctxOf(on.participants), {
            participantId: 'hero',
            on: false,
        });

        expect(wfrpState(find(off, 'hero')).malignant).toBeUndefined();
    });
});
