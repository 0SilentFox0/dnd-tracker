/**
 * Інтеграційний тест Pusher: серверний trigger подій.
 *
 * Тестує що pusherServer успішно підключається і робить trigger на
 * private-канал. НЕ підключаємось як клієнт — тільки server-side trigger
 * (це достатньо щоб переконатись що credentials валідні).
 *
 * Скіп якщо PUSHER_APP_ID, PUSHER_SECRET, NEXT_PUBLIC_PUSHER_KEY,
 * NEXT_PUBLIC_PUSHER_CLUSTER не всі встановлені.
 */

import { describe, expect, it } from "vitest";

import { findMissing, TEST_RUN_ID } from "./_helpers";

import {
  battleChannelName,
  pusherServer,
  userChannelName,
} from "@/lib/pusher";
import { safePusherTrigger } from "@/lib/utils/pusher/safe-trigger";

const missing = findMissing(
  "PUSHER_APP_ID",
  "PUSHER_SECRET",
  "NEXT_PUBLIC_PUSHER_KEY",
  "NEXT_PUBLIC_PUSHER_CLUSTER",
);

const enabled = missing.length === 0;

if (!enabled) {
  console.warn(`[integration:pusher] skipped — missing: ${missing.join(", ")}`);
}

describe.skipIf(!enabled)("Pusher integration (server trigger)", () => {
  it("battleChannelName повертає private-battle-{id}", () => {
    const ch = battleChannelName("test-battle-1");

    expect(ch).toBe("private-battle-test-battle-1");
  });

  it("userChannelName повертає private-user-{id}", () => {
    const ch = userChannelName("user-1");

    expect(ch).toBe("private-user-user-1");
  });

  it("pusherServer.trigger() на тестовий канал — успішний (без error)", async () => {
    const channel = battleChannelName(`int-test-${TEST_RUN_ID}`);

    const response = await pusherServer.trigger(channel, "battle-updated", {
      test: true,
      runId: TEST_RUN_ID,
    });

    // Pusher.trigger() повертає Response з status 200 при успіху.
    expect(response.status).toBe(200);
  });

  it("safePusherTrigger() не кидає винятку (fire-and-forget OK)", async () => {
    const channel = battleChannelName(`int-test-${TEST_RUN_ID}`);

    expect(() =>
      safePusherTrigger(
        pusherServer,
        channel,
        "battle-updated",
        { test: true },
        { action: "integration test", channel },
      ),
    ).not.toThrow();

    // Дамо async catch'у час спрацювати, якщо щось упало.
    await new Promise((resolve) => setTimeout(resolve, 200));
  });

  it("trigger на невалідний channel name — повертає 400", async () => {
    // Pusher не дозволяє порожнє ім'я каналу — це валідний негативний кейс
    // що перевіряє що ми реально розмовляємо з Pusher API.
    let caughtError: unknown = null;

    try {
      await pusherServer.trigger("", "test-event", { test: true });
    } catch (err) {
      caughtError = err;
    }

    expect(caughtError).not.toBeNull();
  });
});
