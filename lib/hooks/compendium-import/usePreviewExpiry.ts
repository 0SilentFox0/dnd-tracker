'use client';
import { useState } from 'react';

import { COMPENDIUM_PREVIEW_TTL_MS } from '@/lib/constants/compendium-import';
import { useExpiry } from '@/lib/hooks/common';

export type PreviewExpiry = ReturnType<typeof usePreviewExpiry>;

const stampOf = (preview: unknown) => ({
    preview,
    at: new Date(Date.now() + COMPENDIUM_PREVIEW_TTL_MS).toISOString(),
});

export function usePreviewExpiry(preview: unknown | null) {
    const [stamp, setStamp] = useState<ReturnType<typeof stampOf> | null>(null);

    if (!preview && stamp) setStamp(null);
    else if (preview && stamp?.preview !== preview) setStamp(stampOf(preview));

    const expiresAt = preview ? (stamp?.at ?? null) : null;

    return { expiresAt, expired: useExpiry(expiresAt) };
}
