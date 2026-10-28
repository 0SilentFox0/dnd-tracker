import { API_ERRORS } from "@/lib/constants/api-errors";
import { describe, expect, it } from "vitest";

import { errorMessage } from "../error-message";

describe("errorMessage", () => {
  it("текст помилки або запасний", () => {
    expect(errorMessage(new Error(API_ERRORS.TRACK_NOT_FOUND), "x")).toBe(API_ERRORS.TRACK_NOT_FOUND);
    expect(errorMessage(new Error(""), "x")).toBe("x");
    expect(errorMessage("рядок", "x")).toBe("x");
  });
});
