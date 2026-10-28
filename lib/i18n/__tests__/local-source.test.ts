import { describe, expect, it } from "vitest";

import type { Namespace } from "../config";
import { localSource } from "../local-source";

describe("localSource", () => {
  it("loads a namespace", async () => {
    const messages = await localSource.load("uk", "common");

    expect(messages).toHaveProperty("app.name");
  });

  it("throws for a missing namespace", async () => {
    await expect(localSource.load("uk", "nope" as Namespace)).rejects.toThrow();
  });
});
