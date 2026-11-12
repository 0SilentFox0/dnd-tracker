import { ACTION_SLOT } from '../../rules/slots';
import { CastResultLines } from './CastResultLines';
import { PercentileResultLines } from './PercentileResultLines';

import type { ActionResultProps } from '@/components/systems/types';

export function ActionResult({ details, hit, exact }: ActionResultProps) {
    const slot = ACTION_SLOT.read(details);

    if (!slot) return null;

    if (slot.cast) return <CastResultLines cast={slot.cast} />;

    if (!slot.attack) return null;

    const { defender: _defender, ...hidden } = slot.attack;

    return (
        <PercentileResultLines
            p={exact ? slot.attack : { ...hidden, sl: slot.attack.netSl }}
            hit={hit}
        />
    );
}
