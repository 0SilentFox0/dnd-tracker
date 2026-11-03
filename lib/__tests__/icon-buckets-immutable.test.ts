import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { ICON_BUCKETS } from "@/lib/constants/storage";

const ROOT = path.resolve(__dirname, "../..");

const ICON_REF_RE = new RegExp(`["'\`](?:${ICON_BUCKETS.join("|")})["'\`/]|\\b(?:ASSET_BUCKET|ICON_BUCKETS)\\b`);

const IMAGE_FACTORY_ICON_RE = new RegExp(`imageBucketStorage\\(\\{[^)]*["'\`](?:${ICON_BUCKETS.join("|")})["'\`]`, "s");

const ALLOWED: Record<string, string> = {};

function sources(dir: string): string[] {
  return fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap((e) => {
    const rel = path.join(dir, e.name);

    if (e.isDirectory()) return e.name === "__tests__" || e.name === "node_modules" ? [] : sources(rel);

    return /\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name) ? [rel] : [];
  });
}

const files = ["lib", "app", "scripts"].flatMap(sources).filter((f) => f !== "lib/constants/storage.ts");

const read = (f: string) => fs.readFileSync(path.join(ROOT, f), "utf8");

describe("тест-сторож: бакети іконок незмінні", () => {
  it("жоден файл, що посилається на бакет іконок, не викликає .remove(", () => {
    const offenders = files.filter((f) => !ALLOWED[f] && ICON_REF_RE.test(read(f)) && /\.remove\(/.test(read(f)));

    expect(files.length).toBeGreaterThan(100);
    expect(offenders).toEqual([]);
  });

  it("imageBucketStorage (з remove) не підключається до бакетів іконок", () => {
    const offenders = files.filter((f) => IMAGE_FACTORY_ICON_RE.test(read(f)));

    expect(offenders).toEqual([]);
  });

  it("сторож бачить порушення (самоперевірка)", () => {
    expect(ICON_REF_RE.test('admin.storage.from("unit-icons").remove([p])')).toBe(true);
    expect(IMAGE_FACTORY_ICON_RE.test('imageBucketStorage({ bucket: "spell-icons", x: 1 })')).toBe(true);
  });
});
