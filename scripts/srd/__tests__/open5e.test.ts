import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { describe, expect, it } from "vitest";

import { noteAbility, uniqueId } from "../lib/abilities";
import { fetchOpen5e, md5, verifyFile, verifySourceDir } from "../lib/fetch";
import { FIXTURE_DIR, loadOpen5e, matchesAny, slugTail } from "../lib/open5e";
import { numberWord, parseDiceExpr, titleCase } from "../lib/text";

import { getAbilityModifier } from "@/lib/utils/common/calculations";
import { groupBy } from "@/lib/utils/common/collections";

describe("open5e helpers", () => {
  it("slugTail, groupBy, matchesAny with an underscore boundary", () => {
    expect(slugTail("srd-2024_fighter_second-wind")).toBe("second-wind");
    expect(slugTail("srd-2024_champion")).toBe("champion");
    expect(groupBy([{ p: "a" }, { p: "b" }, { p: "a" }], (r) => r.p).get("a")).toHaveLength(2);
    expect(matchesAny({ pk: "srd-2024_shield-of-faith", fields: {} }, ["srd-2024_shield"])).toBe(false);
    expect(matchesAny({ pk: 7, fields: { parent: "srd-2024_fireball" } }, ["srd-2024_fireball"])).toBe(true);
    expect(matchesAny({ pk: "x", fields: { parent: "srd-2024_adult-red-dragon_rend" } }, ["srd-2024_adult-red-dragon"])).toBe(true);
    expect(matchesAny({ pk: "x", fields: { weapon: "srd-2024_dagger" } }, ["srd-2024_dagger"])).toBe(true);
  });

  it("text helpers", () => {
    expect(getAbilityModifier(27)).toBe(8);
    expect(getAbilityModifier(8)).toBe(-1);
    expect(titleCase("chaotic evil")).toBe("Chaotic Evil");
    expect(parseDiceExpr("10d6 + 40")).toEqual({ count: 10, sides: 6 });
    expect(parseDiceExpr("1")).toBeNull();
    expect(numberWord("three")).toBe(3);
    expect(numberWord("12")).toBe(12);
    expect(numberWord("many")).toBeNull();
  });

  it("note abilities and unique ids", () => {
    expect(noteAbility("darkvision", "Darkvision", "You see in the dark.")).toEqual({ id: "darkvision", name: "Darkvision", description: "You see in the dark.", trigger: { event: "passive" }, effects: [{ kind: "note", text: "Darkvision" }] });

    const seen = new Set<string>();

    expect([uniqueId(seen, "bite"), uniqueId(seen, "bite"), uniqueId(seen, "bite")]).toEqual(["bite", "bite-2", "bite-3"]);
  });

  it("loads the committed fixtures as Open5eData", () => {
    const data = loadOpen5e(FIXTURE_DIR);

    expect(data.spells.some((s) => s.pk === "srd-2024_fireball")).toBe(true);
    expect(data.creatures.some((c) => c.pk === "srd-2024_adult-red-dragon")).toBe(true);
    expect(data.weaponProperties.length).toBe(17);
  });
});

describe("fetch", () => {
  it("verifySourceDir rejects a --source directory whose files do not match the pinned md5", () => {
    expect(() => verifySourceDir(FIXTURE_DIR)).toThrow(/md5/);
  });

  it("verifyFile rejects a wrong md5", () => {
    expect(() => verifyFile("Document", Buffer.from("{}"))).toThrow(/Document\.json: md5/);
    expect(md5("abc")).toBe("900150983cd24fb0d6963f7d28e17f72");
  });

  it("fetchOpen5e fails on HTTP errors and on a body with a wrong md5, writing nothing", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "srd-fetch-"));

    await expect(fetchOpen5e(dir, (async () => new Response("nope", { status: 404 })) as typeof fetch)).rejects.toThrow(/HTTP 404/);
    await expect(fetchOpen5e(dir, (async () => new Response("{}")) as typeof fetch)).rejects.toThrow(/md5/);
    expect(fs.readdirSync(dir)).toEqual([]);
  });
});
