import { describe, expect, it } from "vitest";

import { context } from "./fixtures";

import { completeMutation } from "@/app/api/campaigns/[id]/battles/[battleId]/complete/complete-mutation";

describe("complete mutation", () => {
  it("завершує бій з вказаним результатом", () => {
    const out = completeMutation(context(), { result: "defeat" });

    expect(out.scene).toMatchObject({ status: "completed" });
    expect(out.scene?.completedAt).toBeInstanceOf(Date);
    expect(out.events[0].resultText).toContain("Поразка");
  });

  it("без результату — перемога за замовчуванням", () => {
    expect(completeMutation(context(), {}).events[0].resultText).toContain("Перемога");
  });
});
