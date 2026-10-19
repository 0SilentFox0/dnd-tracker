import { describe, expect, it } from "vitest";

import { clockOffsetFromDate } from "../clock";

describe("clockOffsetFromDate", () => {
  it("сервер на 3 с попереду: офсет ≈ 3,5 с (заголовок Date обрізає частку секунди)", () => {
    const server = Date.UTC(2026, 9, 19, 10, 0, 0);

    const local = server - 3_000;

    expect(clockOffsetFromDate(new Date(server).toUTCString(), local - 100, local + 100)).toBe(3_500);
  });

  it("без заголовка або з невалідним — null", () => {
    expect(clockOffsetFromDate(null, 0, 10)).toBeNull();
    expect(clockOffsetFromDate("not a date", 0, 10)).toBeNull();
  });
});
