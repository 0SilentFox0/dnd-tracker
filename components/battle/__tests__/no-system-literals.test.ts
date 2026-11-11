import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "../../..");

const BANNED = /battleWfrp|D100|Percentile|dice === 100/;

const sources = (rel: string): string[] =>
  fs.readdirSync(path.join(ROOT, rel), { withFileTypes: true }).flatMap((e) => {
    const next = `${rel}/${e.name}`;

    if (e.isDirectory()) return e.name === "__tests__" ? [] : sources(next);

    return /\.tsx?$/.test(e.name) ? [next] : [];
  });

describe("battle and spell UI stay system-neutral", () => {
  it.each(["components/battle", "components/spells"])("%s has no d100/percentile/battleWfrp references", (dir) => {
    const offenders = sources(dir).filter((file) => BANNED.test(fs.readFileSync(path.join(ROOT, file), "utf8")));

    expect(offenders).toEqual([]);
  });
});
