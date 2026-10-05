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
 * Повертає проміс, який ніколи не відхиляється: старі виклики лишаються fire-and-forget,
 * а `after(() => safePusherTrigger(...))` дочікується відправки до заморожування функції.
 *
 * Використання:
 *   safePusherTrigger(pusherServer, battleChannel, "battle-updated", payload, {
 *     campaignId, battleId, action: "complete battle",
 *   });
 */

import type Pusher from "pusher";

import { logger } from "@/lib/utils/logger";

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
): Promise<void> {
  return pusherServer.trigger(channel, event, payload).then(() => undefined, (err) => {
    logger.error(
      "[pusher] trigger failed",
      { channel, event, ...context },
      err,
    );
  });
}
