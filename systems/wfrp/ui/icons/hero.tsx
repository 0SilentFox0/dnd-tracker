import { CircleCheck, Coins, Hammer } from 'lucide-react';

import type { WfrpHeroIconKey } from './keys';
import { fromLucide } from './svg';
import type { WfrpIcon } from './types';

const Coin = fromLucide(Coins);

const statusIcon = (metal: 'bronze' | 'silver' | 'gold'): WfrpIcon =>
    function StatusIcon({ className, style, ...props }) {
        return (
            <Coin
                className={`metal-${metal}${className ? ` ${className}` : ''}`}
                style={{ color: 'var(--m2)', ...style }}
                {...props}
            />
        );
    };

export const HERO_ICONS: Record<WfrpHeroIconKey, WfrpIcon> = {
    'status-brass': statusIcon('bronze'),
    'status-silver': statusIcon('silver'),
    'status-gold': statusIcon('gold'),
    endeavour: fromLucide(Hammer),
    'career-tick': fromLucide(CircleCheck),
};
