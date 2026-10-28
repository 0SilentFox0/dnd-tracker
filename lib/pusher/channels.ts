/**
 * Channel naming для Pusher — спільне між server (lib/pusher/server.ts) і client
 * (lib/pusher/client.ts). Файл нічого не імпортує з
 * `pusher` / `pusher-js` бібліотек, тому безпечний для прямого `import` як
 * з server-кампонентів, так і з `"use client"` коду.
 *
 * Канали — приватні (`private-*`), щоб Pusher викликав auth route
 * (`/api/pusher/auth`) і ми могли перевірити ownership перед підпискою.
 */

export const battleChannelName = (battleId: string): string =>
  `private-battle-${battleId}`;

export const userChannelName = (userId: string): string =>
  `private-user-${userId}`;

export const BATTLE_CHANNEL_PREFIX = "private-battle-";
export const USER_CHANNEL_PREFIX = "private-user-";

export const NOTIFY_CHANNEL_PREFIX = "private-notify-";

/** Окремо від `private-user-*`: бій відписується від нього при unmount. */
export const notifyChannelName = (userId: string): string => `${NOTIFY_CHANNEL_PREFIX}${userId}`;

export const NOTIFICATIONS_CHANGED_EVENT = "notifications-changed";

export const PUSHER_AUTH_ENDPOINT = "/api/pusher/auth";

/** Окремо від battle-delta: музика не підвищує версію бою. */
export const BATTLE_AUDIO_EVENT = "battle-audio";

export const SHOW_CHANNEL_PREFIX = "private-show-";

export const showChannelName = (campaignId: string): string => `${SHOW_CHANNEL_PREFIX}${campaignId}`;

/** Повний стан показу: він малий, дельти не потрібні. */
export const SHOW_STATE_EVENT = "show-state";

/** Лише сигнал «світ змінився»: дані клієнт дочитує власним відфільтрованим view. */
export const WORLD_CHANGED_EVENT = "world-changed";
