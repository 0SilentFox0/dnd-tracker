import dynamic from 'next/dynamic';

import { MoraleBadge } from './battle/MoraleBadge';
import { MoraleLabel } from './battle/MoraleLabel';
import { MoralePanel } from './battle/MoralePanel';
import { MoraleField } from './MoraleField';
import { MoraleRow } from './MoraleRow';
import { MoraleSection } from './MoraleSection';

import type { SystemUi } from '@/components/systems/types';
import { defineAddon } from '@/lib/utils/rules/systems/compose';

// the full-screen result stays out of the battle entry graph (client-entry-imports)
const MoraleResultOverlay = dynamic(
    () =>
        import('./battle/MoraleResultOverlay').then(
            (m) => m.MoraleResultOverlay
        ),
    { ssr: false }
);

export const MORALE_MODULE_UI = defineAddon<SystemUi>(() => ({
    rulesSections: { morale: MoraleSection },
    forms: { fields: [MoraleField] },
    sheet: { combatRows: [MoraleRow] },
    battle: {
        turnStart: { Panel: MoralePanel, Label: MoraleLabel },
        badges: [MoraleBadge],
        dialogs: [MoraleResultOverlay],
    },
}));
