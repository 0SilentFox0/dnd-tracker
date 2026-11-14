import { describe } from 'vitest';

import { expectLabelKeys } from '../test/label-keys';

import { CombatStatus } from '@/lib/constants/battle';
import { WEATHER_KINDS } from '@/lib/constants/battle-weather';
import { DAMAGE_ELEMENT_OPTIONS } from '@/lib/constants/damage';
import { HEALTH_LABEL } from '@/lib/utils/battle/view';
import { DEFAULT_RULES } from '@/lib/utils/rules';
import { ruleSystemOf } from '@/lib/utils/rules/systems';


describe('battle has translations', () => {
    expectLabelKeys('battle', 'view.health', Object.keys(HEALTH_LABEL));
    expectLabelKeys('battle', 'view.heroStatus', Object.values(CombatStatus));
    expectLabelKeys('battle', 'coreActions.descriptions', Object.keys(ruleSystemOf(DEFAULT_RULES).combat.actions.catalog));
    expectLabelKeys('battle', 'coreActions.shove', ['prone', 'push']);
    expectLabelKeys('battle', 'map.terrain.brushes', [
        'wall',
        'barrier',
        'hazard',
        'erase',
    ]);
    expectLabelKeys('battle', 'result.title', ['hit', 'crit', 'miss']);
    expectLabelKeys('battle', 'resultScreen.outcome', [
        'victory',
        'defeat',
        'unknown',
    ]);
    expectLabelKeys('battle', 'resultScreen.stats', [
        'damageDealt',
        'healingDone',
        'kills',
        'damageTaken',
    ]);
    expectLabelKeys('battle', 'turnControls.strip', [
        'waiting',
        'acting',
        'ended',
    ]);
    expectLabelKeys('battle', 'critChoice.kinds', ['success', 'fail']);
    expectLabelKeys(
        'gameTerms',
        'damageTypes',
        DAMAGE_ELEMENT_OPTIONS.map((o) => o.value)
    );
    expectLabelKeys('battleCommon', 'weather', [...WEATHER_KINDS, 'clear']);
    expectLabelKeys('spells', 'fx.badges', [
        'thorns',
        'rust',
        'raincloud',
        'might',
        'siphon',
        'stoneskin',
    ]);
    expectLabelKeys('spells', 'fx.previewUnits', [
        'caster',
        'ally',
        'fallen',
        'e1',
        'e2',
    ]);
});
