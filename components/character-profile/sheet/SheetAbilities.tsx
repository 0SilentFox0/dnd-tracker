'use client';

import { useProfile } from '../ProfileContext';
import { useSheetRoll } from './SheetRollProvider';

import { systemUiOf } from '@/components/systems';
import { useCampaignSystem } from '@/lib/hooks/systems';

export function SheetAbilities() {
    const { campaignId, sheet } = useProfile();

    const { system } = useCampaignSystem(campaignId, sheet.system);

    const Ui = systemUiOf(system.key, system.modules);

    const roll = useSheetRoll();

    return (
        <div
            className="px-4 pb-4 empty:hidden fit:pb-2"
            data-testid="sheet-abilities"
        >
            <Ui.StatsTab section="top" {...roll} />
        </div>
    );
}
