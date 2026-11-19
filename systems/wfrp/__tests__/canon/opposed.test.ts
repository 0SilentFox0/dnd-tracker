import { describe, expect } from 'vitest';

import { bookExample, CANON, LEGACY, NO_RNG } from './book-example';

import { resolveOpposed } from '@/systems/wfrp/rules/combat/opposed';
import { winChanceFor } from '@/systems/wfrp/rules/combat/win-chance';

const opposed = (
    attackerTarget: number,
    defenderTarget: number,
    rolls: { attacker: number; defender: number },
    edition = CANON
) =>
    resolveOpposed({
        attackerTarget,
        defenderTargets: [{ kind: 'dodge', target: defenderTarget }],
        edition,
        rng: NO_RNG,
        presetRolls: rolls,
    });

describe('canon: Opposed Tests (p131-132)', () => {
    bookExample(132, 'Salundra +3 SL beats the orc +2 SL and wins by 1', () => {
        const r = opposed(55, 50, { attacker: 23, defender: 30 });

        expect(r.attacker.sl).toBe(3);
        expect(r.defender.sl).toBe(2);
        expect(r.isHit).toBe(true);
        expect(r.netSl).toBe(1);
    });

    bookExample(
        132,
        'the orc at -2 SL beats Salundra at -4 SL: a failed attack still hits',
        () => {
            const r = opposed(30, 30, { attacker: 51, defender: 71 });

            expect(r.attacker.sl).toBe(-2);
            expect(r.defender.sl).toBe(-4);
            expect(r.isHit).toBe(true);
            expect(r.netSl).toBe(2);
        }
    );

    bookExample(131, 'a tie goes to the attacker', () => {
        const r = opposed(50, 50, { attacker: 30, defender: 30 });

        expect(r.netSl).toBe(0);
        expect(r.isHit).toBe(true);
    });

    bookExample(131, 'the higher defender SL wins', () => {
        expect(opposed(50, 50, { attacker: 40, defender: 20 }).isHit).toBe(
            false
        );
    });

    bookExample(
        132,
        'legacy preset still needs the attacker to succeed',
        () => {
            const r = opposed(30, 30, { attacker: 51, defender: 71 }, LEGACY);

            expect(r.isHit).toBe(false);
        }
    );

    bookExample(
        131,
        'win chance: the attacker wins ties, so equal targets favour them',
        () => {
            const chance = winChanceFor(CANON);

            expect(chance(40, 40)).toBeGreaterThan(0.5);
            expect(chance(40, 40)).toBeGreaterThan(
                winChanceFor(LEGACY)(40, 40)
            );
        }
    );
});
