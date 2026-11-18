/** Free of `pusher`/`pusher-js` imports, so both server components and `"use client"` code can import it. */

export const battleChannelName = (battleId: string): string =>
    `private-battle-${battleId}`;

export const userChannelName = (userId: string): string =>
    `private-user-${userId}`;

export const BATTLE_CHANNEL_PREFIX = 'private-battle-';
export const BATTLE_DM_CHANNEL_PREFIX = 'private-battle-dm-';

/** Full delta for the DM only: the public channel carries a log redacted for players. */
export const battleDmChannelName = (battleId: string): string =>
    `${BATTLE_DM_CHANNEL_PREFIX}${battleId}`;
export const USER_CHANNEL_PREFIX = 'private-user-';

export const NOTIFY_CHANNEL_PREFIX = 'private-notify-';

/** Separate from `private-user-*`: the battle unsubscribes from it on unmount. */
export const notifyChannelName = (userId: string): string =>
    `${NOTIFY_CHANNEL_PREFIX}${userId}`;

export const NOTIFICATIONS_CHANGED_EVENT = 'notifications-changed';

export const PUSHER_AUTH_ENDPOINT = '/api/pusher/auth';

/** Separate from battle-delta: music does not bump the battle version. */
export const BATTLE_AUDIO_EVENT = 'battle-audio';

export const SHOW_CHANNEL_PREFIX = 'private-show-';

export const showChannelName = (campaignId: string): string =>
    `${SHOW_CHANNEL_PREFIX}${campaignId}`;

/** Full show state: it is small, so no deltas. */
export const SHOW_STATE_EVENT = 'show-state';

/** Signal only ("world changed"): clients refetch through their own filtered view. */
export const WORLD_CHANGED_EVENT = 'world-changed';
