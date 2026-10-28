import { describe, expect, it } from "vitest";

import { ApiError } from "@/lib/api/client";
import { abilitySaveError } from "@/lib/hooks/abilities";

describe("abilitySaveError", () => {
  it("збирає лише помилки вмінь з 400", () => {
    const err = new ApiError("x", 400, "/u", { error: [{ path: ["abilities", 0, "effects"], message: "погано" }, { path: ["name"], message: "інше" }] });

    expect(abilitySaveError(err, "fb")).toBe("Помилки у вміннях: 0.effects: погано");
  });

  it("інакше — повідомлення помилки", () => {
    expect(abilitySaveError(new Error("мережа"), "fb")).toBe("мережа");
    expect(abilitySaveError("?", "fb")).toBe("fb");
  });
});
