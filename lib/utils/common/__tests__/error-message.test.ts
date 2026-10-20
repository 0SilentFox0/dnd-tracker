import { describe, expect, it } from "vitest";

import { errorMessage } from "../error-message";

describe("errorMessage", () => {
  it("текст помилки або запасний", () => {
    expect(errorMessage(new Error("Трек не знайдено"), "x")).toBe("Трек не знайдено");
    expect(errorMessage(new Error(""), "x")).toBe("x");
    expect(errorMessage("рядок", "x")).toBe("x");
  });
});
