export type SessionUser = {
    id: string;
    email: string | null;
    name: string | null;
    avatarUrl: string | null;
};

type AuthUserLike = {
    id: string;
    email?: string | null;
    user_metadata?: Record<string, unknown>;
};

const httpsUrl = (v: unknown): v is string =>
    typeof v === 'string' && v.startsWith('https://');

const text = (v: unknown): v is string =>
    typeof v === 'string' && v.trim() !== '';

export function toSessionUser(
    u: AuthUserLike | null | undefined
): SessionUser | null {
    if (!u) return null;

    const m = u.user_metadata ?? {};

    return {
        id: u.id,
        email: u.email ?? null,
        name: [m.full_name, m.name].find(text) ?? null,
        avatarUrl:
            [m.custom_avatar_url, m.avatar_url, m.picture].find(httpsUrl) ??
            null,
    };
}
