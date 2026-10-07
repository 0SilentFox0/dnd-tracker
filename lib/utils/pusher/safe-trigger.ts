/**
 * Pusher trigger, що ніколи не відхиляється й логує збій з контекстом: втрачену подію клієнт
 * підхопить сам при reconnect. `after(() => safePusherTrigger(...))` дочікується відправки до заморожування функції.
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
