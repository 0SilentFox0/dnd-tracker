import { describe, expect, it } from "vitest";

import { parseDieInput } from "@/lib/utils/battle/flows";

describe("parseDieInput", () => {
  it("порожньо — очистити; валідне число — як є", () => {
    expect(parseDieInput("", 8)).toBeUndefined();
    expect(parseDieInput("6", 8)).toBe(6);
    expect(parseDieInput("15", 20)).toBe(15);
  });

  it("дописана цифра замінює старе значення, завелике без валідного хвоста — ігнор", () => {
    expect(parseDieInput("63", 8)).toBe(3);
    expect(parseDieInput("159", 20)).toBe(9);
    expect(parseDieInput("2019", 20)).toBe(19);
    expect(parseDieInput("9", 8)).toBeNull();
    expect(parseDieInput("0", 8)).toBeNull();
  });
});
