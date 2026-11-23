'use client';

import { usePathname } from 'next/navigation';

import { shouldUseGameShell } from '@/components/layout/game-shell-route';
import { Header } from '@/components/layout/Header';
import { LANDING_PATHS } from '@/lib/constants/site';

const AUTH_SCREENS = [
    '/sign-in',
    '/sign-up',
    '/forgot-password',
    '/reset-password',
];

export function HeaderGate() {
    const pathname = usePathname();

    if (
        shouldUseGameShell(
            pathname,
            process.env.NEXT_PUBLIC_GAME_UI_SHELL === 'true'
        )
    ) {
        return null;
    }

    if (
        (pathname && LANDING_PATHS.includes(pathname)) ||
        AUTH_SCREENS.some((p) => pathname?.startsWith(p))
    )
        return null;

    return <Header />;
}
