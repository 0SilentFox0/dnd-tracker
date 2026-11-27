export function normalizeInviteCode(raw: string): string {
    return raw.trim().toUpperCase();
}

export function inviteLinkPath(code: string): string {
    return `/join/${encodeURIComponent(code)}`;
}
