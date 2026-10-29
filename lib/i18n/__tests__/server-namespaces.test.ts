import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { NAMESPACES, SERVER_NAMESPACES } from "../config";
import { CAMPAIGN_NAMESPACES } from "../scopes";

const ROOT = process.cwd();

function layouts(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(join(ROOT, dir))) {
    const rel = `${dir}/${name}`;

    if (statSync(join(ROOT, rel)).isDirectory()) layouts(rel, out);
    else if (name === "layout.tsx") out.push(rel);
  }

  return out;
}

describe("server namespaces", () => {
  it("are registered namespaces", () => {
    for (const ns of SERVER_NAMESPACES) expect(NAMESPACES).toContain(ns);
  });

  it("are not part of the campaign scope", () => {
    expect(CAMPAIGN_NAMESPACES.filter((ns) => (SERVER_NAMESPACES as readonly string[]).includes(ns))).toEqual([]);
  });

  it("are not loaded by any layout", () => {
    const bad: string[] = [];

    for (const file of layouts("app")) {
      const text = readFileSync(join(ROOT, file), "utf8");

      for (const ns of SERVER_NAMESPACES) if (new RegExp(`["']${ns}["']`).test(text)) bad.push(`${file}: ${ns}`);
    }

    expect(bad).toEqual([]);
  });

  it("have a catalog in every locale", () => {
    for (const locale of ["uk", "en"]) for (const ns of SERVER_NAMESPACES) expect(existsSync(join(ROOT, "messages", locale, `${ns}.json`)), `${locale}/${ns}`).toBe(true);
  });
});
