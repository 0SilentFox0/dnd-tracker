import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (file: string) => readFileSync(join(process.cwd(), file), "utf8");

describe("глобальний zod: ключові issue на сервері й у клієнті", () => {
  it.each(["instrumentation.ts", "instrumentation-client.ts"])("%s підключає ключовий customError", (file) => {
    expect(read(file)).toContain("@/lib/zod/locale");
  });

  it("locale.ts ставить zodErrorMap як customError", () => {
    expect(read("lib/zod/locale.ts")).toContain("customError: zodErrorMap");
  });
});
