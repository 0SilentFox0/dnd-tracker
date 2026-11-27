import { AFTER_SIGN_IN_PATH } from '@/lib/constants/auth';

const BASE = 'http://x';

/** Only same-origin relative paths survive, so `next` can't bounce the user to another site. */
export function safeNextPath(next: string | null | undefined): string {
    if (
        !next ||
        !next.startsWith('/') ||
        next.startsWith('//') ||
        next.startsWith('/\\') ||
         
        /[\u0000-\u001F\u007F]/.test(next)
    )
        return AFTER_SIGN_IN_PATH;

    try {
        const url = new URL(next, BASE);

        if (url.origin !== BASE) return AFTER_SIGN_IN_PATH;

        return url.pathname + url.search + url.hash;
    } catch {
        return AFTER_SIGN_IN_PATH;
    }
}

/** Keeps a valid `next` when hopping between auth screens. */
export function authPathWithNext(
    path: string,
    next: string | null | undefined
): string {
    const safe = safeNextPath(next);

    return safe === AFTER_SIGN_IN_PATH
        ? path
        : `${path}?next=${encodeURIComponent(safe)}`;
}
