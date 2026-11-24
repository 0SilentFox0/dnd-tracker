'use client';

import { useProfile } from '../ProfileContext';
import { useSheetRoll } from './SheetRollProvider';

import { systemUiOf } from '@/components/systems';
import { useCampaignSystem } from '@/lib/hooks/systems';

export function SheetStatsPanel() {
    const { campaignId, sheet } = useProfile();

    const { system: ref } = useCampaignSystem(campaignId, sheet.system);

    const Ui = systemUiOf(ref.key, ref.modules);

    const roll = useSheetRoll();

    return (
        <div data-testid="sheet-stats-panel">
            <Ui.StatsTab section="bottom" {...roll} />
        </div>
    );
}
