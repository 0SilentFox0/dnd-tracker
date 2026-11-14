import { describe } from 'vitest';

import { expectLabelKeys } from '../test/label-keys';

import { AttackType, BattleActionType } from '@/lib/constants/battle';
import { WEATHER_KINDS } from '@/lib/constants/battle-weather';
import { STRIKE_RIDER_EFFECTS } from '@/lib/utils/abilities/schema/params';
import { DEFAULT_RULES } from '@/lib/utils/rules';
import { ruleSystemOf } from '@/lib/utils/rules/systems';
import { CONDITION_5E_KEYS } from '@/systems/d20/rules/conditions/keys';

describe('battleCommon has translations', () => {
    expectLabelKeys(
        'battleCommon',
        'conditions',
        CONDITION_5E_KEYS.flatMap((k) => [`${k}.label`, `${k}.description`])
    );
    expectLabelKeys('battleCommon', 'coreActions', Object.keys(ruleSystemOf(DEFAULT_RULES).combat.actions.catalog));
    expectLabelKeys('battleCommon', 'cunningStrike', STRIKE_RIDER_EFFECTS);
    expectLabelKeys('battleCommon', 'attackKinds', Object.values(AttackType));
    expectLabelKeys('battleCommon', 'actionKinds', [
        ...Object.values(BattleActionType),
        'hazard',
        'event',
    ]);
    expectLabelKeys('battleCommon', 'weather', [...WEATHER_KINDS, 'clear']);
    expectLabelKeys('battleCommon', 'actors', ['system', 'dm']);
});
