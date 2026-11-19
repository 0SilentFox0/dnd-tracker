export const USER_AVATARS_BUCKET = 'user-avatars';

export const USER_AVATAR_SIZE = 256;

export const MAX_USER_AVATAR_BYTES = 512 * 1024;

export const USER_AVATAR_FORMATS = {
    'image/webp': 'webp',
    'image/jpeg': 'jpg',
} as const;

export const USER_AVATAR_CONTENT_TYPES = ['image/webp', 'image/jpeg'] as const;

export type UserAvatarContentType = (typeof USER_AVATAR_CONTENT_TYPES)[number];

export const USER_AVATAR_BUCKET_TYPES = USER_AVATAR_CONTENT_TYPES;

export const USER_AVATAR_RATE = { limit: 10, windowSeconds: 600 } as const;

export const MAX_AVATAR_SOURCE_BYTES = 15 * 1024 * 1024;

export const AVATAR_SOURCE_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
] as const;
