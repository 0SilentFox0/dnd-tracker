import { describe, expect } from 'vitest';

import { bookExample } from './book-example';
import {
    attackDetails,
    bow,
    fighter,
    legacyRules,
    sword,
} from './combat-fixtures';

import { CombatStatus } from '@/lib/constants/battle';
import { applyWfrpConditionTo } from '@/systems/wfrp/rules/conditions/apply';
import { EDITION_PROFILES } from '@/systems/wfrp/rules/edition/profiles';
import type { BattleParticipant } from '@/types/battle';

const me = () => fighter('a', { at: { x: 4, y: 5 } });

const foe = () => fighter('t', { side: 'enemy', at: { x: 5, y: 5 } });

const downed = (p: BattleParticipant): BattleParticipant => ({
    ...p,
    combatStats: { ...p.combatStats, status: CombatStatus.UNCONSCIOUS },
});

const MISS = 99;

describe('canon: Helpless targets (p167)', () => {
    bookExample(
        167,
        'melee against an unconscious target hits automatically, attacker picks the roll',
        () => {
            const open = attackDetails(me(), foe(), sword(), {
                manualRoll: MISS,
            });

            expect(open.result.isHit).toBe(false);

            const helpless = attackDetails(me(), downed(foe()), sword(), {
                manualRoll: MISS,
            });

            expect(helpless.result.isHit).toBe(true);
            expect(helpless.details?.roll).toBe(1);
            expect(helpless.details?.defender?.sl).toBe(0);
        }
    );

    bookExample(167, 'the Unconscious condition makes a target Helpless', () => {
        const t = applyWfrpConditionTo(foe(), {
            key: 'unconscious',
            round: 0,
            edition: EDITION_PROFILES.canon5e,
            sourceName: 'test',
        }).participant;

        expect(
            attackDetails(me(), t, sword(), { manualRoll: MISS }).result.isHit
        ).toBe(true);
    });

    bookExample(187, 'a Surprised target cannot defend but the attacker still rolls', () => {
        const t = applyWfrpConditionTo(foe(), {
            key: 'surprised',
            round: 0,
            edition: EDITION_PROFILES.canon5e,
            sourceName: 'test',
        }).participant;

        expect(
            attackDetails(me(), t, sword(), { manualRoll: MISS }).result.isHit
        ).toBe(false);
    });

    bookExample(167, 'a ranged attack is rolled normally beyond Point Blank', () => {
        expect(
            attackDetails(me(), downed(foe()), bow(), { manualRoll: MISS })
                .result.isHit
        ).toBe(false);
    });

    bookExample(167, 'the legacy edition rolls against an unconscious target', () => {
        expect(
            attackDetails(me(), downed(foe()), sword(), {
                manualRoll: MISS,
                rules: legacyRules,
            }).result.isHit
        ).toBe(false);
    });
});
