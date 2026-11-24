'use client';

import { useProfile } from '../ProfileContext';
import { SheetVitals } from './SheetVitals';

import { HudPanel } from '@/components/hud/page';
import { systemUiOf } from '@/components/systems';
import { useCampaignSystem } from '@/lib/hooks/systems';

export function SheetHud() {
    const { campaignId, sheet } = useProfile();

    const { system } = useCampaignSystem(campaignId, sheet.system);

    const Ui = systemUiOf(system.key, system.modules);

    return (
        <HudPanel className="grid grid-cols-3 gap-0 overflow-hidden rounded-[4px] p-0 shadow-[0_1px_0_color-mix(in_srgb,var(--hud-ink)_8%,transparent)_inset,0_10px_24px_-16px_rgba(0,0,0,.7)] sm:p-0 lg:grid-cols-[minmax(0,1.5fr)_repeat(3,minmax(0,.55fr))]">
            <SheetVitals />
            <Ui.HeroStats />
        </HudPanel>
    );
}
