'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';

import {
    isFullBleedRoute,
    shouldUseGameShell,
} from '@/components/layout/game-shell-route';
import { STATIC_PUBLIC_PATHS } from '@/lib/constants/site';

// split chunk: public pages return null and must not download the auth stack
const Header = dynamic(() =>
    import('@/components/layout/Header').then((m) => m.Header),
);

const AUTH_SCREENS = [
    '/sign-in',
    '/sign-up',
    '/forgot-password',
    '/reset-password',
];

export function HeaderGate() {
    const pathname = usePathname();

    if (
        shouldUseGameShell(pathname) ||
        isFullBleedRoute(pathname) ||
        (pathname && STATIC_PUBLIC_PATHS.includes(pathname)) ||
        AUTH_SCREENS.some((p) => pathname?.startsWith(p))
    )
        return null;

    return <Header />;
}
