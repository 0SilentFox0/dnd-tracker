import { describe, expect, it } from "vitest";

import { D20_MODULE_SERVER } from "../../server";

describe("D20_MODULE_SERVER.battle", () => {
  it("crit-choice loads its schema and mutation", async () => {
    const op = await D20_MODULE_SERVER.battle?.["crit-choice"].load();

    expect(op?.schema.safeParse({ cancel: true }).success).toBe(true);
    expect(typeof op?.mutate).toBe("function");
  });
});
