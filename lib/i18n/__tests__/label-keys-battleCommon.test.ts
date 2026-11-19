import { describe } from 'vitest';

import { expectLabelKeys } from '../test/label-keys';

import { AttackType, BattleActionType } from '@/lib/constants/battle';
import { WEATHER_KINDS } from '@/lib/constants/battle-weather';
import { STRIKE_RIDER_EFFECTS } from '@/lib/utils/abilities/schema/params';
import { actionsOf } from '@/lib/utils/battle/actions/access';
import { DEFAULT_RULES } from '@/lib/utils/rules/__tests__/fixtures/default-rules';
import { CONDITION_5E_KEYS } from '@/systems/d20/rules/conditions/keys';

describe('battleCommon has translations', () => {
    expectLabelKeys(
        'battleCommon',
        'conditions',
        CONDITION_5E_KEYS.flatMap((k) => [`${k}.label`, `${k}.description`])
    );
    expectLabelKeys(
        'battleCommon',
        'coreActions',
        Object.keys(actionsOf(DEFAULT_RULES).catalog)
    );
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
