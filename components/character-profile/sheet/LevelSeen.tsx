'use client';

import { useProfile } from '../ProfileContext';

import { useSeenOnOpen } from '@/lib/hooks/notifications';

export function LevelSeen() {
    const { campaignId, sheet } = useProfile();

    useSeenOnOpen(campaignId, {
        types: ['level'],
        enabled: sheet.viewer.isOwner && !sheet.viewer.isDM,
    });

    return null;
}
