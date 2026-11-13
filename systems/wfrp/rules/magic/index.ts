import { ACTION_SLOT } from '../slots';
import { wfrpState } from '../state';
import { armourSl } from './armour';
import { wfrpLoreAttribute } from './attribute';
import { channelBadge } from './badge';
import {
    castTargetOf,
    isPrayerKind,
    prayTargetOf,
    wfrpCastTest,
} from './cast-test';
import { channelTargetOf, wfrpChannel } from './channel';
import { wfrpMiscast } from './miscast';

import { textRef } from '@/lib/i18n/text-ref';
import { noMagic } from '@/lib/utils/battle/spell/none';
import { upcastSteps } from '@/lib/utils/battle/spell/upcast';
import type { SystemSlot } from '@/lib/utils/rules/systems/slot';
import type {
    RuleSystemMagic,
    RuleSystemTestedMagic,
} from '@/lib/utils/rules/systems/types';

const withoutMiscast = (details: SystemSlot): SystemSlot => {
    const slot = ACTION_SLOT.read(details);

    return slot?.cast
        ? ACTION_SLOT.write(
              { ...slot, cast: { ...slot.cast, miscast: null } },
              details
          )
        : details;
};

export const WFRP_TESTED_MAGIC: RuleSystemTestedMagic = {
    ingredients: 'avertMiscast',
    avertMiscast: (cast, who) =>
        cast.miscast && cast.miscast !== 'wrath'
            ? {
                  ...cast,
                  miscast: null,
                  details: withoutMiscast(cast.details),
                  lines: [
                      ...cast.lines,
                      textRef('wfrpMagic.log.ingredientAverts', who),
                  ],
              }
            : cast,
    castTest: wfrpCastTest,
    castPreview: (caster, kind) => {
        const prayer = isPrayerKind(kind);

        return {
            target: prayer ? prayTargetOf(caster) : castTargetOf(caster),
            channelTarget: channelTargetOf(caster),
            channelled: prayer ? 0 : (wfrpState(caster).channelledSl ?? 0),
            armourSl: prayer ? 0 : armourSl(caster),
        };
    },
    channel: wfrpChannel,
    miscast: wfrpMiscast,
    attribute: wfrpLoreAttribute,
    badge: channelBadge,
};

export const WFRP_MAGIC: RuleSystemMagic = {
    ...noMagic,
    upcast: { steps: upcastSteps },
    tested: WFRP_TESTED_MAGIC,
};
