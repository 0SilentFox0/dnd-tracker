/**
 * Channel naming для Pusher — спільне між server (lib/pusher.ts) і client
 * (lib/hooks/battle/usePusherBattleSync.ts). Файл нічого не імпортує з
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

/** Префікси для парсингу channel_name у auth route. */
export const BATTLE_CHANNEL_PREFIX = "private-battle-";
export const USER_CHANNEL_PREFIX = "private-user-";
