import { readdirSync, readFileSync } from "node:fs";
import { expect, it } from "vitest";

const DIR = "components/content-import";

const sources = readdirSync(DIR).filter((f) => f.endsWith(".tsx")).map((f) => [f, readFileSync(`${DIR}/${f}`, "utf8")] as const);

it("content-import components neither fetch nor import lib/server or lib/api", () => {
  const offenders = sources.filter(([, text]) => /\bfetch\(|@\/lib\/server|@\/lib\/api\//.test(text)).map(([f]) => f);

  expect(offenders).toEqual([]);
});
