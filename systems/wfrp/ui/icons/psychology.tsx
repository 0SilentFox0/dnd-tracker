import { Angry, Ghost, Skull, Swords } from 'lucide-react';

import { Drawn, fromLucide } from './svg';
import type { WfrpIcon } from './types';

import type {
    PassionKind,
    PsychologyKind,
} from '@/systems/wfrp/rules/trait-kinds';

const Frenzy: WfrpIcon = (props) => (
    <Drawn {...props}>
        <path d="m12 2 2 6 6-2-4 5 6 3-7 1 1 7-4-5-4 5 1-7-7-1 6-3-4-5 6 2Z" />
    </Drawn>
);

export const PSYCHOLOGY_ICONS: Record<PsychologyKind, WfrpIcon> = {
    fear: fromLucide(Ghost),
    terror: fromLucide(Skull),
};

export const PASSION_ICONS: Record<PassionKind, WfrpIcon> = {
    frenzy: Frenzy,
    hatred: fromLucide(Angry),
    animosity: fromLucide(Swords),
};
