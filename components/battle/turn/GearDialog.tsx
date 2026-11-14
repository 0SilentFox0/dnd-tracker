'use client';

import { useTranslations } from 'next-intl';

import { InventoryTab } from '@/components/character-profile';
import { ProfileProvider } from '@/components/character-profile/ProfileContext';
import { QueryState } from '@/components/common/states';
import { HUD_SURFACE } from '@/components/hud';
import { Button } from '@/components/ui/button';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { useGearSwap } from '@/lib/hooks/battle';
import { cn } from '@/lib/utils';
import type { BattleParticipant } from '@/types/battle';

export function GearDialog({
    participant,
    open,
    onOpenChange,
    onDone,
}: {
    participant: BattleParticipant;
    open: boolean;
    onOpenChange: (o: boolean) => void;
    onDone: () => void;
}) {
    const t = useTranslations('battleWizards.gear');

    const gear = useGearSwap(participant, { onOpenChange, onDone });

    return (
        <ResponsiveDialog
            open={open}
            onOpenChange={onOpenChange}
            title={t('title')}
            description={t('hint')}
            className={cn(HUD_SURFACE, 'border-white/25 bg-hud-surface')}
            footer={
                <Button
                    disabled={gear.isPending || !gear.canApply}
                    onClick={() => void gear.apply()}
                >
                    {gear.canApply ? t('apply') : t('used')}
                </Button>
            }
        >
            <QueryState query={gear.sheet}>
                {(sheet) => (
                    <ProfileProvider
                        campaignId={gear.campaignId}
                        characterId={gear.characterId}
                        sheet={sheet}
                        canEdit
                    >
                        <InventoryTab inBattle />
                    </ProfileProvider>
                )}
            </QueryState>
        </ResponsiveDialog>
    );
}
