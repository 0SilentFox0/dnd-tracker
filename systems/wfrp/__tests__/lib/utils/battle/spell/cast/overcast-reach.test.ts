import { describe, expect, it } from 'vitest';

import { ParticipantSide } from '@/lib/constants/battle';
import { makeParticipant } from '@/lib/utils/abilities/__tests__/fixtures';
import { castSpell } from '@/lib/utils/battle/spell';
import type {
    CastableSpell,
    CastSpellParams,
} from '@/lib/utils/battle/types/spell-process';
import { RulesetSchema } from '@/lib/utils/rules/schema';
import type { CastExtension } from '@/lib/utils/rules/systems/types';
import type { SpellDefinition } from '@/lib/utils/spells/model/schema';
import { caster as wfrpCaster } from '@/systems/wfrp/rules/magic/__tests__/fixtures';
import { WFRP_RULES } from '@/systems/wfrp/rules/rules-preset';
import { WfrpFortuneInputSchema } from '@/systems/wfrp/server/attack-input';
import type { BattleParticipant } from '@/types/battle';

const canon = RulesetSchema.parse({
    ...WFRP_RULES,
    edition: { preset: 'canon5e' },
});

const spell: CastableSpell = {
    id: 'sp',
    name: 'Bolt',
    level: 1,
    groupId: null,
    definition: {
        dice: 0,
        cost: 'action',
        targeting: { kind: 'enemy', range: 60 },
        resolution: { kind: 'auto' },
        effects: [
            {
                kind: 'applyCondition',
                condition: 'skip_action',
                duration: { rounds: 4 },
            },
        ],
        raceModifiers: [],
        casting: { magic: { cn: 1, kind: 'arcane', overcast: null } },
    } as unknown as SpellDefinition,
};

const foe = (id: string): BattleParticipant =>
    makeParticipant({ id, side: ParticipantSide.ENEMY, hp: 20, maxHp: 20 });

const run = (plan: Record<string, number>, extra: Partial<CastSpellParams>) => {
    const caster = wfrpCaster({ base: { int: 50, wp: 50 } });

    return castSpell({
        rules: canon,
        caster,
        spell,
        targetIds: ['a', 'b'],
        allParticipants: [caster, foe('a'), foe('b')],
        currentRound: 1,
        battleId: 'b',
        diceRolls: [],
        rng: () => 0.4,
        castTest: {
            roll: 5,
            system: WfrpFortuneInputSchema.parse({
                system: {
                    key: 'wfrp',
                    data: { kind: 'none', overcast: plan },
                },
            }),
        },
        ...extra,
    });
};

const affected = (r: ReturnType<typeof castSpell>) =>
    r.allParticipantsUpdated.filter(
        (p) => p.basicInfo.id !== 'c' && p.battleData.activeEffects.length > 0
    );

describe('overcast reach of a cast', () => {
    it('hands the rolled reach to retarget and drops the extra targets', () => {
        const seen: CastExtension[] = [];

        const r = run(
            { targets: 2 },
            {
                retarget: (ext) => {
                    seen.push(ext);

                    return ext.targets >= 1 ? ['a', 'b'] : ['a'];
                },
            }
        );

        expect(seen).toHaveLength(1);
        expect(seen[0].targets).toBe(1);
        expect(r.extension?.targets).toBe(1);
        expect(affected(r).map((p) => p.basicInfo.id)).toEqual(['a', 'b']);
    });

    it('a plan the roll cannot pay for leaves the base target only, with a log line', () => {
        const short = run(
            { targets: 1 },
            { retarget: (ext) => (ext.targets >= 1 ? ['a', 'b'] : ['a']) }
        );

        expect(short.extension).toBeUndefined();
        expect(affected(short).map((p) => p.basicInfo.id)).toEqual(['a']);
        expect(
            short.messages.some(
                (m) =>
                    typeof m === 'object' &&
                    'message' in m &&
                    m.message === 'battleLog.spellFx.beyondOvercast'
            )
        ).toBe(true);
    });

    it('extends the duration of the effects it applies', () => {
        const r = run({ duration: 3 }, { targetIds: ['a'] });

        expect(r.extension?.durationMul).toBe(2);

        const rounds = affected(r)[0]?.battleData.activeEffects.map((e) => e.duration);

        expect(rounds?.some((d) => d === 8)).toBe(true);
    });
});
