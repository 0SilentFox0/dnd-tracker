import * as fs from "fs";
import * as path from "path";
import { describe, expect, it } from "vitest";

import { UNITS } from "../units";

describe("unit icons", () => {
  it("every library unit has assets/unit-icons/<key>.webp", () => {
    const missing = UNITS.filter((u) => !fs.existsSync(path.join(process.cwd(), "assets", "unit-icons", `${u.key}.webp`))).map((u) => u.key);

    expect(missing).toEqual([]);
  });
});
