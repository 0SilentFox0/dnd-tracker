'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { useProfile } from '../ProfileContext';
import { ResourcesDialog } from './ResourcesDialog';

import { systemUiOf } from '@/components/systems';
import { Button } from '@/components/ui/button';
import { useCampaignSystem } from '@/lib/hooks/systems';
import type { SheetRest } from '@/types/characters';

export function DmRestActions() {
    const { sheet } = useProfile();

    if (!sheet.rest || !sheet.viewer.isDM) return null;

    return <DmRestControls rest={sheet.rest} />;
}

function DmRestControls({ rest }: { rest: SheetRest }) {
    const t = useTranslations('rest.dm');

    const { campaignId, characterId, sheet } = useProfile();

    const { system } = useCampaignSystem(campaignId, sheet.system);

    const RerollToken = systemUiOf(system.key, system.modules).rerollToken;

    const [open, setOpen] = useState(false);

    return (
        <>
            {rest.persist && (
                <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="min-h-10"
                    onClick={() => setOpen(true)}
                >
                    {t('resources')}
                </Button>
            )}
            {RerollToken && rest.inspiration !== null && (
                <RerollToken.DmToggle
                    campaignId={campaignId}
                    characterId={characterId}
                    value={rest.inspiration}
                />
            )}
            {open && (
                <ResourcesDialog rest={rest} open onOpenChange={setOpen} />
            )}
        </>
    );
}
