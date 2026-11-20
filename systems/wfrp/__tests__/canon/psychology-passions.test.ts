import { describe, expect, it } from 'vitest';

import { bookExample } from './book-example';

import '@/lib/server/systems/registry';
import {
    AttackType,
    ParticipantSide,
} from '@/lib/constants/battle';
import { context } from '@/lib/server/battles/__tests__/mutations/fixtures';
import { makeParticipant } from '@/lib/utils/abilities/__tests__/fixtures';
import { type Ruleset, RulesetSchema } from '@/lib/utils/rules/schema';
import { DEFAULT_CHARACTERISTICS } from '@/systems/wfrp/rules/characteristics/keys';
import { assertWfrpAction } from '@/systems/wfrp/rules/combat/assert-action';
import { wfrpAbilitiesOf } from '@/systems/wfrp/rules/combat/participant';
import { wfrpVentAfterAttack } from '@/systems/wfrp/rules/combat/vent-after-attack';
import { WFRP_RULES } from '@/systems/wfrp/rules/rules-preset';
import { wfrpState, withWfrpState } from '@/systems/wfrp/rules/state';
import { trait } from '@/systems/wfrp/rules/traits/__tests__/fixtures';
import {
    frenzyMoveAllowed,
    nearestFoes,
} from '@/systems/wfrp/rules/traits/frenzy';
import {
    groupKey,
    inGroup,
    tryEnterFrenzy,
    wfrpFrenzyTurnStart,
    wfrpPassionsJoin,
    wfrpPassionsRoundStart,
} from '@/systems/wfrp/rules/traits/passions';
import { wfrpOnMoveEnd } from '@/systems/wfrp/rules/turn/move-end';
import { wfrpPsychologyGate } from '@/systems/wfrp/rules/turn/psychology-gate';
import { frenzyMutation } from '@/systems/wfrp/server/battle/frenzy-mutation';
import { intimidateMutation } from '@/systems/wfrp/server/battle/intimidate-mutation';
import { passionMutation } from '@/systems/wfrp/server/battle/passion-mutation';
import type { BattleAttack, BattleParticipant } from '@/types/battle';

const RULES = RulesetSchema.parse({
    ...WFRP_RULES,
    edition: { preset: 'canon5e' },
}) as Ruleset;

const WP40 = {
    ...DEFAULT_CHARACTERISTICS,
    base: { ...DEFAULT_CHARACTERISTICS.base, wp: 40, fel: 40 },
};

const rollOf = (...rolls: number[]) => {
    const queue = [...rolls];

    return () => ((queue.shift() ?? 50) - 1) / 100 + 0.001;
};

const passion = (passion: string, group?: string) => ({
    kind: 'wfrpPassion',
    passion,
    ...(group && { group }),
});

const make = (
    id: string,
    side: ParticipantSide,
    pos: { x: number; y: number } | null,
    opts: { race?: string; effects?: unknown[] } = {}
): BattleParticipant => {
    const p = makeParticipant({
        id,
        side,
        abilities: opts.effects?.length
            ? [trait(opts.effects, { key: `t-${id}` })]
            : [],
    });

    return {
        ...p,
        basicInfo: { ...p.basicInfo, controlledBy: 'user-1' },
        abilities: {
            ...p.abilities,
            ...wfrpAbilitiesOf(WP40),
            ...(opts.race && { race: opts.race }),
        },
        battleData: { ...p.battleData, ...(pos && { position: pos }) },
    };
};

const hero = (
    pos: { x: number; y: number } | null = { x: 0, y: 0 },
    ...effects: unknown[]
) => make('h', ParticipantSide.ALLY, pos, { effects });

const foe = (id: string, x: number, y: number, race?: string) =>
    make(id, ParticipantSide.ENEMY, { x, y }, { race });

const find = (ps: BattleParticipant[], id: string) =>
    ps.find((p) => p.basicInfo.id === id)!;

describe('canon5e Frenzy movement toward the nearest foe (p184)', () => {
    bookExample(184, 'the nearest foes are those at the shortest distance', () => {
        const me = hero();

        const ps = [me, foe('far', 5, 0), foe('near', 2, 1), foe('twin', 1, 2)];

        expect(nearestFoes(ps, me).map((p) => p.basicInfo.id)).toEqual([
            'near',
            'twin',
        ]);
        expect(nearestFoes([me, foe('x', 1, 1)], hero(null))).toEqual([]);
    });

    bookExample(184, 'a big token measures distance from its whole footprint', () => {
        const big = (id: string, x: number, size: number) => {
            const p = foe(id, x, 0);

            return { ...p, combatStats: { ...p.combatStats, gridSize: size } };
        };

        const me = hero();

        const ps = [me, big('wide', -3, 3), foe('lone', 2, 0)];

        expect(nearestFoes(ps, me).map((p) => p.basicInfo.id)).toEqual([
            'wide',
        ]);
    });

    bookExample(184, 'a Frenzied move must close in on the nearest foe', () => {
        const ps = [hero(), foe('f', 4, 0)];

        const moved = (x: number) => ({
            ...ps[0],
            battleData: { ...ps[0].battleData, position: { x, y: 0 } },
        });

        expect(frenzyMoveAllowed(ps, moved(2), { x: 0, y: 0 })).toBe(true);
        expect(frenzyMoveAllowed(ps, moved(-1), { x: 0, y: 0 })).toBe(false);
        expect(frenzyMoveAllowed(ps, ps[0], { x: 0, y: 0 })).toBe(false);
    });

    bookExample(184, 'onMoveEnd rejects a Frenzied retreat but not a charge', () => {
        const at = (x: number) => ({
            ...withWfrpState(hero({ x, y: 0 }), { frenzy: true }),
        });

        const run = (end: number) => {
            const mover = at(end);

            return wfrpOnMoveEnd({
                mover,
                start: { x: 2, y: 0 },
                path: [],
                cost: 1,
                participants: [mover, foe('f', 5, 0)],
                rules: RULES,
                map: null,
            } as never);
        };

        expect(() => run(3)).not.toThrow();
        expect(() => run(1)).toThrow();
    });

    bookExample(184, 'a Frenzied attack must hit the nearest foe', () => {
        const me = withWfrpState(hero(), { frenzy: true });

        const near = foe('near', 1, 0);

        const far = foe('far', 4, 0);

        const melee = {
            id: 's',
            name: 'Sword',
            type: AttackType.MELEE,
        } as unknown as BattleAttack;

        const ctx = (t: BattleParticipant) => ({
            kind: 'attack' as const,
            actor: me,
            attack: melee,
            targets: [t],
            participants: [me, near, far],
        });

        expect(() => assertWfrpAction(ctx(near))).not.toThrow();
        expect(() => assertWfrpAction(ctx(far))).toThrow();
    });

    bookExample(184, 'a running Frenzy names the foe to charge', () => {
        const me = withWfrpState(hero(), { frenzy: true });

        const r = wfrpFrenzyTurnStart([me, foe('near', 1, 0)], 'h', {
            round: 2,
            rng: rollOf(),
            rules: RULES,
        });

        expect(r.messages[0]).toMatchObject({
            message: 'battleWfrp.log.frenzyCharge',
        });
    });
});

describe('canon5e manual Frenzy entry (p184)', () => {
    const ps = () => [hero(), foe('f', 3, 0)];

    bookExample(184, 'a passed Willpower test enters the Frenzy on demand', () => {
        const r = tryEnterFrenzy(ps(), 'h', {
            round: 1,
            rng: rollOf(),
            rules: RULES,
            presetRoll: 20,
        })!;

        expect(wfrpState(find(r.participants, 'h')).frenzy).toBe(true);
    });

    bookExample(184, 'a failed test allows no second try in the same turn', () => {
        const failed = tryEnterFrenzy(ps(), 'h', {
            round: 1,
            rng: rollOf(),
            rules: RULES,
            presetRoll: 90,
        })!;

        expect(wfrpState(find(failed.participants, 'h')).frenzy).toBeUndefined();

        const again = tryEnterFrenzy(failed.participants, 'h', {
            round: 1,
            rng: rollOf(),
            rules: RULES,
            presetRoll: 20,
        });

        expect(again).toBeNull();
        expect(
            tryEnterFrenzy(failed.participants, 'h', {
                round: 2,
                rng: rollOf(),
                rules: RULES,
                presetRoll: 20,
            })
        ).not.toBeNull();
    });

    bookExample(184, 'nothing to fight means no Frenzy', () => {
        expect(
            tryEnterFrenzy([hero()], 'h', {
                round: 1,
                rng: rollOf(),
                rules: RULES,
                presetRoll: 20,
            })
        ).toBeNull();
    });

    bookExample(184, 'the system action runs the test on the own turn', () => {
        const c = context({ participants: ps(), isDM: true });

        const out = frenzyMutation(
            { ...c, meta: { ...c.meta, rules: RULES } },
            { participantId: 'h', roll: 20 }
        );

        expect(wfrpState(find(out.participants, 'h')).frenzy).toBe(true);
        expect(out.events).toHaveLength(1);
    });
});

describe('canon5e Animosity compels insulting or attacking (p183)', () => {
    const joined = () =>
        wfrpPassionsJoin(
            [
                hero({ x: 0, y: 0 }, passion('animosity', 'Goblins')),
                foe('g', 2, 0, 'Goblin'),
            ],
            { round: 1, rng: rollOf(90), rules: RULES }
        ).participants;

    const scope = (ps: BattleParticipant[]) => ({
        participants: ps,
        scene: { turnIndex: 0, sceneState: undefined },
        rules: RULES,
    });

    bookExample(183, 'a failed test keeps the turn open until the urge is spent', () => {
        const ps = joined();

        expect(wfrpState(find(ps, 'h')).compelled).toBeDefined();
        expect(wfrpPsychologyGate(scope(ps), 'h', { phase: 'end' })).toMatchObject({
            code: 'action_rejected',
        });
        expect(wfrpPsychologyGate(scope(ps), 'h', { phase: 'act' })).toBeNull();
    });

    bookExample(183, 'a passed test leaves the fighter free', () => {
        const ps = wfrpPassionsJoin(
            [
                hero({ x: 0, y: 0 }, passion('animosity', 'Goblins')),
                foe('g', 2, 0, 'Goblin'),
            ],
            { round: 1, rng: rollOf(10), rules: RULES }
        ).participants;

        expect(wfrpPsychologyGate(scope(ps), 'h', { phase: 'end' })).toBeNull();
    });

    bookExample(183, 'Fear outweighs Animosity', () => {
        const ps = joined().map((p) =>
            p.basicInfo.id === 'h'
                ? withWfrpState(p, { fear: { g: { rating: 1, sl: 0, round: 1 } } })
                : p
        );

        expect(wfrpPsychologyGate(scope(ps), 'h', { phase: 'end' })).toBeNull();
    });

    bookExample(183, 'attacking the group spends the urge', () => {
        const ps = joined();

        const r = wfrpVentAfterAttack({
            participants: ps,
            attackerId: 'h',
            defenderId: 'g',
        } as never)!;

        expect(wfrpState(find(r.participants, 'h')).compelled).toBeUndefined();
        expect(
            wfrpVentAfterAttack({
                participants: ps,
                attackerId: 'h',
                defenderId: 'h',
            } as never)
        ).toBeNull();
    });

    bookExample(183, 'insulting the group vents it; the GM can release instead', () => {
        const c = context({ participants: joined(), isDM: true });

        const ctx = { ...c, meta: { ...c.meta, rules: RULES } };

        const vented = passionMutation(ctx, {
            participantId: 'h',
            mode: 'vent',
        });

        expect(wfrpState(find(vented.participants, 'h')).compelled).toBeUndefined();

        const key = Object.keys(wfrpState(find(ctx.participants, 'h')).compelled!)[0];

        const released = passionMutation(ctx, {
            participantId: 'h',
            mode: 'release',
            key,
        });

        expect(wfrpState(find(released.participants, 'h')).compelled).toBeUndefined();
        expect(() =>
            passionMutation(
                { ...ctx, isDM: false },
                { participantId: 'h', mode: 'release' }
            )
        ).toThrow();
        expect(() =>
            passionMutation(
                { ...ctx, participants: vented.participants },
                { participantId: 'h', mode: 'vent' }
            )
        ).toThrow();
    });

    it('Animosity is not retested like Hatred at round start', () => {
        const ps = joined();

        const r = wfrpPassionsRoundStart(ps, {
            round: 5,
            rng: rollOf(10),
            rules: RULES,
        });

        expect(wfrpState(find(r.participants, 'h')).compelled).toBeDefined();
        expect(r.messages).toEqual([]);
    });
});

describe('canon5e Intimidate against Hatred and Animosity (p169, p183, p184)', () => {
    const intimidate = (
        participants: BattleParticipant[],
        own = 20,
        foeRoll = 90
    ) => {
        const c = context({
            participants,
            isDM: true,
            rng: rollOf(foeRoll),
        });

        return intimidateMutation(
            { ...c, meta: { ...c.meta, rules: RULES } },
            { participantId: 'h', targetId: 'g', roll: own }
        );
    };

    const ps = (
        heroEffects: unknown[] = [],
        goblinEffects: unknown[] = []
    ) => [
        hero({ x: 0, y: 0 }, ...heroEffects),
        make('g', ParticipantSide.ENEMY, { x: 1, y: 0 }, {
            race: 'Goblin',
            effects: goblinEffects,
        }),
    ];

    bookExample(169, 'a won opposed test makes the target fear the intimidator', () => {
        const out = intimidate(ps(), 10, 90);

        const fear = wfrpState(find(out.participants, 'g')).fear;

        expect(fear?.h?.rating).toBeGreaterThanOrEqual(1);
        expect(find(out.participants, 'h').actionFlags.hasUsedAction).toBe(true);
    });

    bookExample(169, 'a lost test leaves the target unafraid', () => {
        const out = intimidate(ps(), 90, 10);

        expect(wfrpState(find(out.participants, 'g')).fear).toBeUndefined();
    });

    bookExample(184, 'Hatred is immune to Intimidate by the hated foe', () => {
        const out = () =>
            intimidate(ps([], [passion('hatred', 'Humans')]).map((p) =>
                p.basicInfo.id === 'h' ? { ...p, abilities: { ...p.abilities, race: 'Human' } } : p
            ));

        expect(out).toThrow();
    });

    bookExample(183, 'Animosity puts the Intimidate test at Disadvantage', () => {
        const calm = intimidate(ps(), 12, 90);

        const angry = intimidate(ps([passion('animosity', 'Goblins')]), 12, 90);

        const slOf = (o: typeof calm) =>
            wfrpState(find(o.participants, 'g')).fear?.h?.rating ?? 0;

        expect(slOf(angry)).toBeLessThan(slOf(calm));
    });
});

describe('Hatred and Animosity group keys', () => {
    const nightGoblin = foe('n', 0, 0, 'Night Goblin');

    const goblin = foe('g', 0, 0, 'Goblin');

    bookExample(184, 'an exact key matches the whole race or type only', () => {
        expect(inGroup(goblin, '=goblin')).toBe(true);
        expect(inGroup(foe('s', 0, 0, 'Goblins'), '=goblin')).toBe(true);
        expect(inGroup(nightGoblin, '=goblin')).toBe(false);
        expect(inGroup(nightGoblin, groupKey('Night Goblins'))).toBe(true);
    });

    it('old plain values keep matching by whole words', () => {
        expect(inGroup(nightGoblin, 'Goblin')).toBe(true);
        expect(inGroup(foe('x', 0, 0, 'Hobgoblin'), 'Goblin')).toBe(false);
    });

    it('an exact key works for Hatred joins and logs the label', () => {
        const r = wfrpPassionsJoin(
            [hero({ x: 0, y: 0 }, passion('hatred', '=goblin')), nightGoblin],
            { round: 1, rng: rollOf(10), rules: RULES }
        );

        expect(r.testerIds).toEqual([]);

        const hit = wfrpPassionsJoin(
            [hero({ x: 0, y: 0 }, passion('hatred', '=goblin')), goblin],
            { round: 1, rng: rollOf(10), rules: RULES }
        );

        expect(hit.messages[0]).toMatchObject({
            params: { group: 'goblin' },
        });
    });
});
