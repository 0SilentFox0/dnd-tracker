import { Anchor, ChevronsUp, Clover, Shield, Star, Wind } from 'lucide-react';

import type { WfrpResourceIconKey } from './keys';
import { Drawn, fromLucide } from './svg';
import type { WfrpIcon } from './types';

const Corruption: WfrpIcon = (props) => (
    <Drawn {...props}>
        <path d="M12 3C8 8 6 11 6 14a6 6 0 0 0 12 0c0-3-2-6-6-11Z" />
        <path d="m12 9-2 3 3 2-1 4" />
    </Drawn>
);

const Sin: WfrpIcon = (props) => (
    <Drawn {...props}>
        <path d="M12 21 3.5 6.5h17Z" />
        <circle cx="12" cy="11" r="1" fill="currentColor" />
    </Drawn>
);

export const RESOURCE_ICONS: Record<WfrpResourceIconKey, WfrpIcon> = {
    advantage: fromLucide(ChevronsUp),
    momentum: fromLucide(Wind),
    fate: fromLucide(Star),
    fortune: fromLucide(Clover),
    resilience: fromLucide(Shield),
    resolve: fromLucide(Anchor),
    corruption: Corruption,
    sin: Sin,
};
