export function shouldUseGameShell(
    pathname: string | null | undefined
): boolean {
    if (!pathname) return false;

    const normalized = pathname.replace(/\/$/, '');

    return (
        normalized === '/campaigns' ||
        /^\/campaigns\/[^/]+\/(?:dm\/)?world$/.test(normalized) ||
        /^\/campaigns\/[^/]+\/journal$/.test(normalized) ||
        /^\/campaigns\/[^/]+\/character$/.test(normalized) ||
        /^\/campaigns\/[^/]+\/dm\/characters\/(?!new$)[^/]+$/.test(normalized) ||
        (/^\/campaigns\/[^/]+$/.test(normalized) &&
            normalized !== '/campaigns/new')
    );
}

export function isFullBleedRoute(pathname: string | null | undefined): boolean {
    if (!pathname) return false;

    return /^\/campaigns\/[^/]+\/battles\/[^/]+$/.test(
        pathname.replace(/\/$/, '')
    );
}
