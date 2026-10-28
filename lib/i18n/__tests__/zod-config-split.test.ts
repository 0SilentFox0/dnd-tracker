import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (file: string) => readFileSync(join(process.cwd(), file), "utf8");

describe("глобальний zod: клієнт vs сервер", () => {
  it("клієнтський бандл не тягне серверний customError (ключі validation.* без перекладу)", () => {
    const client = read("instrumentation-client.ts");

    expect(client).toContain("@/lib/zod/client-locale");
    expect(client).not.toContain("@/lib/zod/locale");
    expect(read("lib/zod/client-locale.ts")).not.toContain("customError");
  });

  it("серверний instrumentation використовує ключовий customError", () => {
    expect(read("instrumentation.ts")).toContain("@/lib/zod/locale");
    expect(read("lib/zod/locale.ts")).toContain("customError");
  });
});
