/**
 * Інтеграційний тест Redis через Upstash REST API.
 *
 * Покриває:
 *  - lib/redis.ts → getRedisClient (raw @upstash/redis client)
 *  - lib/cache/kv.ts → kvGet/kvSet/kvDel (high-level помічники, що
 *    використовують той самий клієнт)
 *
 * Тест-ключі мають префікс `int-test-${TEST_RUN_ID}:` і видаляються
 * після прогону, щоб не залишати сміття. Upstash підтримує кілька
 * env-prefix варіантів (UPSTASH_REDIS_REST_*, KV_REST_API_*,
 * dnd_KV_REST_API_*) — будь-яка валідна пара активує тести.
 */

import { afterAll, describe, expect, it } from "vitest";

import { TEST_RUN_ID } from "./_helpers";

import { kvDel, kvGet, kvSet } from "@/lib/cache/kv";
import { getRedisClient } from "@/lib/redis";

const hasUrl =
  !!process.env.UPSTASH_REDIS_REST_URL?.trim() ||
  !!process.env.KV_REST_API_URL?.trim() ||
  !!process.env.dnd_KV_REST_API_URL?.trim();

const hasToken =
  !!process.env.UPSTASH_REDIS_REST_TOKEN?.trim() ||
  !!process.env.KV_REST_API_TOKEN?.trim() ||
  !!process.env.dnd_KV_REST_API_TOKEN?.trim();

const enabled = hasUrl && hasToken;

if (!enabled) {
  console.warn(
    "[integration:redis] skipped — missing Upstash credentials. " +
      "Set UPSTASH_REDIS_REST_URL/TOKEN, KV_REST_API_URL/TOKEN, " +
      "or dnd_KV_REST_API_URL/TOKEN.",
  );
}

const cleanupKeys: string[] = [];

afterAll(async () => {
  if (!enabled) return;

  const client = getRedisClient();

  if (!client) return;

  for (const key of cleanupKeys) {
    try {
      await client.del(key);
    } catch {
      // best-effort
    }
  }
});

describe.skipIf(!enabled)("Upstash Redis (raw client)", () => {
  it("getRedisClient повертає не-null", () => {
    const client = getRedisClient();

    expect(client).not.toBeNull();
  });

  it("SET → GET повертає те саме значення (string)", async () => {
    const client = getRedisClient();

    if (!client) throw new Error("client null");

    const key = `int-test-${TEST_RUN_ID}:string`;

    cleanupKeys.push(key);

    await client.set(key, "hello-upstash", { ex: 60 });

    const value = await client.get(key);

    expect(value).toBe("hello-upstash");
  });

  it("SET → GET повертає те саме значення (object — JSON автомат)", async () => {
    const client = getRedisClient();

    if (!client) throw new Error("client null");

    const key = `int-test-${TEST_RUN_ID}:object`;

    cleanupKeys.push(key);

    const payload = { name: "Magic Hero", level: 5, active: true };

    await client.set(key, payload, { ex: 60 });

    const value = await client.get(key);

    expect(value).toEqual(payload);
  });

  it("INCR + EXPIRE працюють (rate-limit primitives)", async () => {
    const client = getRedisClient();

    if (!client) throw new Error("client null");

    const key = `int-test-${TEST_RUN_ID}:counter`;

    cleanupKeys.push(key);

    const v1 = await client.incr(key);

    const v2 = await client.incr(key);

    const v3 = await client.incr(key);

    expect(v1).toBe(1);
    expect(v2).toBe(2);
    expect(v3).toBe(3);

    const expireResult = await client.expire(key, 60);

    expect(expireResult).toBe(1);
  });

  it("DEL повертає число видалених ключів", async () => {
    const client = getRedisClient();

    if (!client) throw new Error("client null");

    const key = `int-test-${TEST_RUN_ID}:deletable`;

    await client.set(key, "x");

    const deleted = await client.del(key);

    expect(deleted).toBe(1);

    const value = await client.get(key);

    expect(value).toBeNull();
  });
});

describe.skipIf(!enabled)("lib/cache/kv (high-level helpers)", () => {
  it("kvSet → kvGet повертає те саме значення (object)", async () => {
    const key = `int-test-${TEST_RUN_ID}:kv-object`;

    cleanupKeys.push(key);

    const payload = { dnd: "tracker", id: 42 };

    await kvSet(key, payload, 30);

    const value = await kvGet<typeof payload>(key);

    expect(value).toEqual(payload);
  });

  it("kvGet повертає null для відсутнього ключа", async () => {
    const value = await kvGet(`int-test-${TEST_RUN_ID}:nonexistent`);

    expect(value).toBeNull();
  });

  it("kvDel видаляє існуючий ключ", async () => {
    const key = `int-test-${TEST_RUN_ID}:kv-delete`;

    await kvSet(key, { x: 1 }, 30);

    const before = await kvGet(key);

    expect(before).not.toBeNull();

    await kvDel(key);

    const after = await kvGet(key);

    expect(after).toBeNull();
  });
});
