import { Drawn } from './svg';
import type { WfrpIcon } from './types';

import type { TraitSize } from '@/systems/wfrp/rules/trait-kinds';

const RADII: Record<TraitSize, number> = {
    tiny: 1.5,
    little: 2.6,
    small: 3.2,
    average: 4.2,
    large: 5.5,
    enormous: 6.8,
    monstrous: 8,
};

const sizeIcon = (r: number): WfrpIcon =>
    function SizeIcon(props) {
        return (
            <Drawn {...props}>
                <circle cx="4.2" cy="10.5" r="1.3" />
                <path d="M4.2 12v4.5M2.2 14h4M4.2 16.5 2.8 20M4.2 16.5 5.6 20" />
                <circle cx="15" cy={20 - r} r={r} />
                <path d="M1.5 20.5h21" />
            </Drawn>
        );
    };

export const SIZE_ICONS = Object.fromEntries(
    Object.entries(RADII).map(([k, r]) => [k, sizeIcon(r)])
) as Record<TraitSize, WfrpIcon>;
