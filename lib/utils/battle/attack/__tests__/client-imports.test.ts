import { expect, it, vi } from "vitest";

vi.mock("zod", () => { throw new Error("Zod must not enter the battle attack client module graph"); });

import { rollModeReasons } from "@/lib/utils/battle/attack/bonus";

it("loads attack prediction and sense readers without Zod", () => {
  expect(rollModeReasons).toBeTypeOf("function");
});
