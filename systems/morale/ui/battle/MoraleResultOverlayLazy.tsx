'use client';

import dynamic from 'next/dynamic';

// `ssr: false` is only legal in a client module; the full-screen result stays out of the battle entry graph (client-entry-imports)
export const MoraleResultOverlayLazy = dynamic(
    () => import('./MoraleResultOverlay').then((m) => m.MoraleResultOverlay),
    { ssr: false }
);
