/**
 * Безпечний Pusher trigger з structured-лог при failure (CODE_AUDIT 4.3).
 *
 * Замінює ~17 fire-and-forget викликів виду:
 *   void pusherServer.trigger(channel, event, payload)
 *     .catch((err) => console.error("Pusher trigger failed:", err))
 *
 * Покращення:
 *  - structured лог із контекстом (channel, event, action, ids),
 *  - не змінює API контракту з клієнтом — клієнт продовжує invalidate
 *    query при reconnect, тому втрачена подія підхопиться сама.
 *
 * Залишається fire-and-forget (`void`) щоб не блокувати API response.
 *
 * Використання:
 *   safePusherTrigger(pusherServer, battleChannel, "battle-updated", payload, {
 *     campaignId, battleId, action: "complete battle",
 *   });
 */

import type Pusher from "pusher";

export interface PusherTriggerContext {
  /** Що зараз робив handler (для structured логу). */
  action?: string;
  [key: string]: unknown;
}

export function safePusherTrigger(
  pusherServer: Pusher,
  channel: string,
  event: string,
  payload: unknown,
  context?: PusherTriggerContext,
): void {
  void pusherServer
    .trigger(channel, event, payload)
    .catch((err) => {
      console.error("[pusher] trigger failed", {
        channel,
        event,
        ...context,
        error: err instanceof Error
          ? { message: err.message, name: err.name }
          : String(err),
      });
    });
}
