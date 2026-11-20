import {
    BatteryLow,
    Droplet,
    EarOff,
    EyeOff,
    Flame,
    FlaskConical,
    HeartCrack,
    Moon,
    TriangleAlert,
} from 'lucide-react';

import { Drawn, fromLucide } from './svg';
import type { WfrpIcon } from './types';

import type { WfrpConditionKey } from '@/systems/wfrp/constants/conditions';

const Stunned: WfrpIcon = (props) => (
    <Drawn {...props}>
        <circle cx="12" cy="15" r="5" />
        <path d="M10 14.5h.01M14 14.5h.01M10.5 17.5h3" />
        <path d="M5 3v4M3 5h4M12 1.5v3.5M10.25 3.25h3.5M19 3v4M17 5h4" />
    </Drawn>
);

const Entangled: WfrpIcon = (props) => (
    <Drawn {...props}>
        <ellipse
            cx="9.5"
            cy="12"
            rx="5.5"
            ry="3.5"
            transform="rotate(-35 9.5 12)"
        />
        <ellipse
            cx="14.5"
            cy="12"
            rx="5.5"
            ry="3.5"
            transform="rotate(35 14.5 12)"
        />
        <path d="M2 20l4-3.5M22 4l-4 3.5" />
    </Drawn>
);

const Prone: WfrpIcon = (props) => (
    <Drawn {...props}>
        <circle cx="5" cy="13" r="2" />
        <path d="M8 14.5h8l3.5 3M11 14.5l-1.5 3.5M3 21h18" />
    </Drawn>
);

export const CONDITION_ICONS: Record<WfrpConditionKey, WfrpIcon> = {
    bleeding: fromLucide(Droplet),
    fatigued: fromLucide(BatteryLow),
    poisoned: fromLucide(FlaskConical),
    stunned: Stunned,
    ablaze: fromLucide(Flame),
    broken: fromLucide(HeartCrack),
    entangled: Entangled,
    prone: Prone,
    surprised: fromLucide(TriangleAlert),
    blinded: fromLucide(EyeOff),
    deafened: fromLucide(EarOff),
    unconscious: fromLucide(Moon),
};
