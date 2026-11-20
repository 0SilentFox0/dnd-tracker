import { editionOf } from '../edition';
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
import { wfrpCastReaction } from './dispel-reaction';
import { wfrpMiscast } from './miscast';
import { maxExtensionOf } from './overcast';
import { wfrpSpellHit } from './spell-hit';

import { textRef } from '@/lib/i18n/text-ref';
import { noMagic } from '@/lib/utils/battle/spell/none';
import { upcastSteps } from '@/lib/utils/battle/spell/upcast';
import type { SystemSlot } from '@/lib/utils/rules/systems/slot';
import type {
    RuleSystemMagic,
    RuleSystemTestedMagic,
} from '@/lib/utils/rules/systems/types';

const withMiscast = (
    details: SystemSlot,
    miscast: 'minor' | null
): SystemSlot => {
    const slot = ACTION_SLOT.read(details);

    return slot?.cast
        ? ACTION_SLOT.write(
              { ...slot, cast: { ...slot.cast, miscast } },
              details
          )
        : details;
};

const lowered = (miscast: string, step: boolean): 'minor' | null =>
    step && miscast === 'major' ? 'minor' : null;

export const WFRP_TESTED_MAGIC: RuleSystemTestedMagic = {
    ingredients: 'avertMiscast',
    avertMiscast: (cast, who) => {
        if (!cast.miscast || cast.miscast === 'wrath') return cast;

        const step = ACTION_SLOT.read(cast.details)?.cast?.stepAvert === true;

        const next = lowered(cast.miscast, step);

        return {
            ...cast,
            miscast: next,
            details: withMiscast(cast.details, next),
            lines: [
                ...cast.lines,
                textRef(
                    next
                        ? 'wfrpMagic.log.ingredientLowers'
                        : 'wfrpMagic.log.ingredientAverts',
                    who
                ),
            ],
        };
    },
    castTest: wfrpCastTest,
    maxExtension: maxExtensionOf,
    spellHit: wfrpSpellHit,
    castPreview: (caster, kind, rules) => {
        const prayer = isPrayerKind(kind);

        const edition = editionOf(rules);

        return {
            target: prayer
                ? prayTargetOf(caster, rules)
                : castTargetOf(caster, rules),
            channelTarget: channelTargetOf(caster, rules),
            channelled: prayer ? 0 : (wfrpState(caster).channelledSl ?? 0),
            armourSl: prayer ? 0 : armourSl(caster, edition),
        };
    },
    channel: wfrpChannel,
    miscast: wfrpMiscast,
    attribute: wfrpLoreAttribute,
    badge: channelBadge,
    reaction: wfrpCastReaction,
};

export const WFRP_MAGIC: RuleSystemMagic = {
    ...noMagic,
    upcast: { steps: upcastSteps },
    tested: WFRP_TESTED_MAGIC,
};
