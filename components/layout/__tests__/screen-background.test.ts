import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { SCREEN_BACKGROUND } from "@/components/layout/screen-background";

const root = process.cwd();

const css = readFileSync(path.join(root, "app/globals.css"), "utf8");

describe("section backgrounds", () => {
  it.each(Object.values(SCREEN_BACKGROUND))("%s has a body::before rule", (name) => {
    expect(css).toContain(`body:has([data-screen-bg="${name}"])::before`);
  });

  it("every image the stylesheet references exists in public/", () => {
    const urls = [...css.matchAll(/url\("(\/screen-bg\/[^"]+)"\)/g)].map((m) => m[1]);

    expect(urls.length).toBeGreaterThan(Object.keys(SCREEN_BACKGROUND).length);
    for (const url of urls) expect(existsSync(path.join(root, "public", url)), url).toBe(true);
  });
});
