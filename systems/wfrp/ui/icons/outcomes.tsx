import { CloudLightning, Hourglass, Sparkles, Zap } from 'lucide-react';

import type { WfrpTestOutcomeKey } from './keys';
import { Drawn, fromLucide } from './svg';
import type { WfrpIcon } from './types';

const CriticalFailure: WfrpIcon = (props) => (
    <Drawn {...props}>
        <path d="m12 2 8 7-8 13L4 9Z" />
        <path d="m12 2-1.5 6 3 3-2 4.5" />
    </Drawn>
);

export const TEST_OUTCOME_ICONS: Record<WfrpTestOutcomeKey, WfrpIcon> = {
    'critical-success': fromLucide(Sparkles),
    'critical-failure': CriticalFailure,
    fumble: fromLucide(Hourglass),
    wrath: fromLucide(Zap),
    miscast: fromLucide(CloudLightning),
};
