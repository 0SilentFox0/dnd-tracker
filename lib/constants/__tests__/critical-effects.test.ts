import { describe, expect, it } from "vitest";

import {
  getCriticalEffect,
} from "@/lib/constants/critical-effects";

describe("critical effects", () => {
  it("replaces half damage with a slipping weapon", () => {
    expect(getCriticalEffect(5, "fail")).toMatchObject({
      name: "Зброя вислизає",
      effect: { type: "weakened_next_hit" },
    });
  });
});
