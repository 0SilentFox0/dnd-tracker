'use client';

import { useProfile } from '../ProfileContext';

import { DraftBanner } from '@/components/characters/player-draft/DraftBanner';
import { ReviewActions } from '@/components/characters/review/ReviewActions';
import { PlayerSheetHint } from '@/components/onboarding/OnboardingHint';

export function SheetNotices() {
    const { campaignId, characterId, sheet, canEdit } = useProfile();

    const { isOwner, isDM } = sheet.viewer;

    return (
        <>
            {isOwner && !isDM && !sheet.review.pending && (
                <PlayerSheetHint className="mx-3 my-2" />
            )}
            {sheet.review.pending && (
                <DraftBanner
                    campaignId={campaignId}
                    note={sheet.review.note}
                    isOwner={isOwner}
                />
            )}
            {sheet.review.pending && isDM && canEdit && (
                <ReviewActions
                    campaignId={campaignId}
                    characterId={characterId}
                    name={sheet.identity.name}
                />
            )}
        </>
    );
}
