// Responses carry campaign/user data, so no shared (CDN) cache may store them.
export const PRIVATE_NO_STORE_HEADERS = { "Cache-Control": "private, no-store" } as const;
