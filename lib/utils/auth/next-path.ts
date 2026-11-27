import { AFTER_SIGN_IN_PATH } from '@/lib/constants/auth';

/** Only same-origin relative paths survive, so `next` can't bounce the user to another site. */
export function safeNextPath(next: string | null | undefined): string {
    if (
        !next ||
        !next.startsWith('/') ||
        next.startsWith('//') ||
        next.startsWith('/\\')
    )
        return AFTER_SIGN_IN_PATH;

    return next;
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
