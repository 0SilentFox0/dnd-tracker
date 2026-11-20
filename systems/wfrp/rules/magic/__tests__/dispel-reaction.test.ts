import { describe, expect, it } from 'vitest';

import { DEFAULT_CHARACTERISTICS } from '../../characteristics/keys';
import { wfrpAbilitiesOf } from '../../combat/participant';
import { PARTICIPANT_STATE } from '../../slots';
import { wfrpState, withWfrpState } from '../../state';
import { wfrpCastReaction } from '../dispel-reaction';

import { ParticipantSide } from '@/lib/constants/battle';
import { participant } from '@/lib/server/battles/__tests__/mutations/fixtures';
import { mulberry32 } from '@/lib/utils/common/rng';
import { RulesetSchema } from '@/lib/utils/rules/schema';
import { WFRP_RULES } from '@/systems/wfrp/rules/rules-preset';
import type { BattleParticipant } from '@/types/battle';
import type { BattleMapConfig } from '@/types/battle-grid';

const rulesOf = (preset: 'canon5e' | 'legacy') =>
    RulesetSchema.parse({ ...WFRP_RULES, edition: { preset } });

const canon = rulesOf('canon5e');

const map = { cols: 40, rows: 40 } as unknown as BattleMapConfig;

const mage = (
    id: string,
    over: {
        side?: (typeof ParticipantSide)[keyof typeof ParticipantSide];
        magick?: boolean;
        wp?: number;
        at?: { x: number; y: number };
        int?: number;
        dead?: true;
    } = {}
): BattleParticipant => {
    const characteristics = {
        ...DEFAULT_CHARACTERISTICS,
        base: {
            ...DEFAULT_CHARACTERISTICS.base,
            int: over.int ?? 40,
            wp: over.wp ?? 40,
        },
        skillAdvances: (over.magick === false
            ? {}
            : { 'language:magick': 10 }) as Record<string, number>,
    };

    const base = participant(id, { side: over.side ?? ParticipantSide.ENEMY });

    return {
        ...base,
        combatStats: {
            ...base.combatStats,
            ...(over.dead && { status: 'dead' as const }),
        },
        battleData: {
            ...base.battleData,
            position: over.at ?? { x: 0, y: 0 },
        },
        abilities: { ...base.abilities, ...wfrpAbilitiesOf(characteristics) },
    };
};

const hero = mage('hero', { side: ParticipantSide.ALLY, at: { x: 10, y: 0 } });

const resolvedOf = (
    last: object | undefined,
    caster = hero
): BattleParticipant[] => [withWfrpState(caster, { lastCast: last as never })];

const args = (participants: BattleParticipant[], rules = canon) => ({
    casterId: 'hero',
    participants,
    rules,
    map,
    round: 3,
});

const LAST = { spell: 'Bolt', sl: 2, at: { x: 10, y: 0 } };

describe('wfrp cast reaction: mayReact', () => {
    it('needs a canon ruleset', () => {
        const foe = mage('foe');

        expect(wfrpCastReaction.mayReact(args([hero, foe]))).toBe(true);
        expect(
            wfrpCastReaction.mayReact(args([hero, foe], rulesOf('legacy')))
        ).toBe(false);
    });

    it('needs an active hostile with Language (Magick) who has not dispelled this round', () => {
        const ally = mage('ally', { side: ParticipantSide.ALLY });

        const untrained = mage('rookie', { magick: false });

        const dead = mage('dead', { dead: true });

        const spent = withWfrpState(mage('spent'), { dispelRound: 3 });

        expect(
            wfrpCastReaction.mayReact(
                args([hero, ally, untrained, dead, spent])
            )
        ).toBe(false);
        expect(
            wfrpCastReaction.mayReact(
                args([
                    hero,
                    ally,
                    untrained,
                    dead,
                    withWfrpState(spent, { dispelRound: 2 }),
                ])
            )
        ).toBe(true);
    });
});

describe('wfrp cast reaction: open', () => {
    const base = [hero, mage('near', { at: { x: 12, y: 0 } })];

    it('offers every eligible foe in range and keeps the held cast as data', () => {
        const far = mage('far', { at: { x: 39, y: 39 } });

        const out = wfrpCastReaction.open({
            ...args([...base, far]),
            resolved: resolvedOf(LAST),
        });

        expect(out?.offers).toEqual([
            { reactorId: 'near', label: 'wfrpMagic.dispel.react' },
        ]);
        expect(PARTICIPANT_STATE.read(out?.data)?.lastCast).toMatchObject({
            spell: 'Bolt',
            sl: 2,
        });
    });

    it('measures range to any landing cell', () => {
        const out = wfrpCastReaction.open({
            ...args([hero, mage('far', { at: { x: 39, y: 39 } })]),
            resolved: resolvedOf({
                ...LAST,
                at: { x: 10, y: 0 },
                targets: [
                    { x: 10, y: 0 },
                    { x: 38, y: 39 },
                ],
            }),
        });

        expect(out?.offers.map((o) => o.reactorId)).toEqual(['far']);
    });

    it('a foe killed by the probe still gets the offer (state before the cast)', () => {
        const out = wfrpCastReaction.open({
            ...args(base),
            resolved: [
                ...resolvedOf(LAST),
                mage('near', { dead: true, at: { x: 12, y: 0 } }),
            ],
        });

        expect(out?.offers).toHaveLength(1);
    });

    it('no window without a stored cast, for an Unstoppable Force, or without candidates', () => {
        expect(
            wfrpCastReaction.open({
                ...args(base),
                resolved: resolvedOf(undefined),
            })
        ).toBeNull();
        expect(
            wfrpCastReaction.open({
                ...args(base),
                resolved: resolvedOf({
                    ...LAST,
                    critBonus: 'unstoppableForce',
                }),
            })
        ).toBeNull();
        expect(
            wfrpCastReaction.open({
                ...args([hero, mage('far', { at: { x: 39, y: 39 } })]),
                resolved: resolvedOf(LAST),
            })
        ).toBeNull();
    });
});

describe('wfrp cast reaction: answer', () => {
    const data = PARTICIPANT_STATE.write({ lastCast: LAST });

    const answer = (participants: BattleParticipant[], seed: number) =>
        wfrpCastReaction.answer({
            ...args(participants),
            reactorId: 'near',
            data,
            rng: mulberry32(seed),
        });

    const near = mage('near', { int: 50, at: { x: 12, y: 0 } });

    const outcomes = () =>
        Array.from({ length: 40 }, (_, i) =>
            answer([hero, near], (i + 1) * 7919)
        );

    it('rolls an opposed test against the cast SL and marks the round', () => {
        const all = outcomes();

        expect(all.some((r) => r.cancelled)).toBe(true);
        expect(all.some((r) => !r.cancelled)).toBe(true);

        all.forEach((r) => {
            expect(r.lines.length).toBeGreaterThan(0);
            expect(
                wfrpState(
                    r.participants.find((p) => p.basicInfo.id === 'near')!
                ).dispelRound
            ).toBe(3);
        });
    });

    it('a second attempt in the same round is refused without a roll', () => {
        const used = withWfrpState(near, { dispelRound: 3 });

        const out = answer([hero, used], 1);

        expect(out.cancelled).toBe(false);
        expect(out.lines).toEqual([]);
    });
});
