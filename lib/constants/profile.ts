export const USER_AVATARS_BUCKET = 'user-avatars';

export const USER_AVATAR_SIZE = 256;

export const MAX_USER_AVATAR_BYTES = 512 * 1024;

export const USER_AVATAR_FORMATS = { 'image/webp': 'webp' } as const;

export const USER_AVATAR_BUCKET_TYPES = ['image/webp'] as const;

export const MAX_AVATAR_SOURCE_BYTES = 15 * 1024 * 1024;

export const AVATAR_SOURCE_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
] as const;
