export function shouldUseGameShell(
    pathname: string | null | undefined
): boolean {
    if (!pathname) return false;

    const normalized = pathname.replace(/\/$/, '');

    return (
        normalized === '/campaigns' ||
        /^\/campaigns\/[^/]+\/(?:dm\/)?world$/.test(normalized) ||
        /^\/campaigns\/[^/]+\/journal$/.test(normalized) ||
        (/^\/campaigns\/[^/]+$/.test(normalized) &&
            normalized !== '/campaigns/new')
    );
}
