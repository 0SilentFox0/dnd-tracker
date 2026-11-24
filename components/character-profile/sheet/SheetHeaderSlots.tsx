'use client';

import { useTranslations } from 'next-intl';
import { Pencil } from 'lucide-react';

import { LevelUpBadge } from '../level-up/LevelUpBadge';
import { PendingChoicesBadge } from '../level-up/PendingChoicesBadge';
import { useProfile } from '../ProfileContext';
import { DmRestActions } from '../rest/DmRestActions';

import { Button } from '@/components/ui/button';

export function SheetBadges({
    hideProgression,
    onLevelUp,
}: {
    hideProgression: boolean;
    onLevelUp: () => void;
}) {
    const { sheet } = useProfile();

    return (
        <>
            {!hideProgression && (
                <LevelUpBadge
                    free={sheet.progression.freePoints}
                    onOpen={onLevelUp}
                />
            )}
            <PendingChoicesBadge />
        </>
    );
}

export function SheetDmActions({ onEdit }: { onEdit: () => void }) {
    const tc = useTranslations('common.actions');

    return (
        <>
            <Button
                type="button"
                size="sm"
                variant="outline"
                className="min-h-10"
                onClick={onEdit}
            >
                <Pencil aria-hidden className="size-4" />
                {tc('edit')}
            </Button>
            <DmRestActions />
        </>
    );
}
