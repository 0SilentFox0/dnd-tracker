'use client';

import { useProfile } from '../ProfileContext';
import { SheetRollDialog } from '../rest/SheetRollDialog';
import { useSheetRollRequest } from './useSheetRoll';

import { systemUiOf } from '@/components/systems';
import { useCampaignSystem } from '@/lib/hooks/systems';

export function SheetStatsPanel() {
    const { campaignId, sheet } = useProfile();

    const { system: ref } = useCampaignSystem(campaignId, sheet.system);

    const Ui = systemUiOf(ref.key, ref.modules);

    const { request, setRequest, close, canRoll } = useSheetRollRequest();

    return (
        <div data-testid="sheet-stats-panel">
            <Ui.StatsTab section="top" onRoll={setRequest} canRoll={canRoll} />
            <Ui.StatsTab
                section="bottom"
                onRoll={setRequest}
                canRoll={canRoll}
            />
            {canRoll && <SheetRollDialog request={request} onClose={close} />}
        </div>
    );
}
