import { useMediaQuery } from './useMediaQuery';

const MOBILE_QUERY = '(max-width: 639px)';

export const DESKTOP_QUERY = '(min-width: 1024px)';

export function useIsCompact(): boolean {
    return !useMediaQuery(DESKTOP_QUERY, true);
}

// server and first hydration pass render the desktop variant
export function useIsMobile(): boolean {
    return useMediaQuery(MOBILE_QUERY);
}
