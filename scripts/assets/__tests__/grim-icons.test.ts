import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { describe, expect, it } from "vitest";

import { GRIM_ROW_KINDS, readGrimData } from "../../grim/data";
import { findForbiddenTerms } from "../../templates/grim-d100/forbidden-terms";
import { grimPromptRows,type GrimSubjects } from "../grim-icons/prompts";
import { GRIM_ICON_BUCKET, GRIM_ICON_SIZE, planGrimUploads } from "../grim-icons/upload";

const readSubject = <T>(name: string) => JSON.parse(fs.readFileSync(path.join(__dirname, "..", "icon-subjects", `grim-${name}.json`), "utf8")) as T;

const subjects = (): GrimSubjects => ({ units: readSubject("units"), spells: readSubject("spells"), artifacts: readSubject("artifacts"), identity: readSubject("identity") });

const data = readGrimData();

describe("grim icon prompts", () => {
  it("covers every catalog entry with a clean prompt and a unique file", () => {
    const rows = grimPromptRows(data, subjects());

    expect(rows).toHaveLength(GRIM_ROW_KINDS.reduce((n, k) => n + data[k].length, 0));
    expect(rows).toHaveLength(186);
    expect(new Set(rows.map((r) => r.file)).size).toBe(rows.length);
    expect(rows.filter((r) => findForbiddenTerms(r.prompt).length > 0)).toEqual([]);
  });

  it("throws with the name when a subject is missing", () => {
    const s = subjects();

    delete s.units["Ash Hound"];

    expect(() => grimPromptRows(data, s)).toThrow("Ash Hound");
  });

  it("plans uploads and marks missing PNGs", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "grim-png-"));

    const rows = grimPromptRows(data, subjects());

    fs.mkdirSync(path.join(dir, "units"));
    fs.writeFileSync(path.join(dir, path.join("units", "ash-hound.png")), "x");

    const plan = planGrimUploads(rows, dir);

    expect(plan.filter((p) => !p.missing).map((p) => p.row.name)).toEqual(["Ash Hound"]);
    expect(plan.filter((p) => p.missing)).toHaveLength(185);
  });

  it("sizes and buckets every kind", () => {
    expect(GRIM_ICON_SIZE.units).toBe(384);
    expect(GRIM_ICON_BUCKET.units).toBe("unit-icons");
    expect(GRIM_ICON_BUCKET.careers).toBe("career-icons");
  });
});
