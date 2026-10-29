import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { expectLabelKeys } from "../test/label-keys";
import { textOf } from "../test/text";

import { LOCALES } from "@/lib/i18n/config";
import { localSource } from "@/lib/i18n/local-source";
import { textRef } from "@/lib/i18n/text-ref";
import { CUNNING_STRIKE_EFFECTS } from "@/lib/utils/abilities/schema/params";
import { REJECT } from "@/lib/utils/battle/store/reject";

const lookup = (tree: Record<string, unknown>, path: string) => path.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], tree);

const SOURCE_TYPES = ["skill", "race", "class", "feat", "artifact", "artifactSet", "unit", "character", "effect", "action"];

const reject = Object.values(REJECT).map((key) => key.replace("battleLog.reject.", ""));

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);

    if (statSync(path).isDirectory()) return name === "__tests__" ? [] : sources(path);

    return /\.tsx?$/.test(name) ? [path] : [];
  });
}

describe("battleLog has translations", () => {
  expectLabelKeys("battleLog", "damage.sources", SOURCE_TYPES);
  expectLabelKeys("battleLog", "reject", reject);
  expectLabelKeys("battleLog", "triggers", ["battleStart", "roundStart", "roundEnd", "turnStart", "turnEnd"]);
  expectLabelKeys("battleLog", "offTurn.titles", ["retaliation", "opportunity", "readied", "legendary"]);
  expectLabelKeys("battleLog", "offTurn.nouns", ["retaliation", "opportunity", "readied", "legendary"]);

  it("every battleLog key written in the engine exists in every locale", async () => {
    const used = new Set(["lib/utils/battle", "lib/server/battles"].flatMap(sources).flatMap((file) => readFileSync(file, "utf8").match(/"battleLog\.[A-Za-z0-9_.]+[A-Za-z0-9_]"/g) ?? []).map((key) => key.slice(1, -1)));

    expect(used.size).toBeGreaterThan(200);

    for (const locale of LOCALES) {
      const tree = await localSource.load(locale, "battleLog");

      for (const key of used) expect(typeof lookup(tree, key.replace("battleLog.", "")), `${locale}: ${key}`).toBe("string");
    }
  });

  it("the locked Cunning Strike reason names the effect in both locales", () => {
    for (const effect of CUNNING_STRIKE_EFFECTS) {
      for (const locale of LOCALES) {
        expect(textOf(textRef("battleLog.reject.cunningLocked", { effect }), locale)).toContain(textOf(textRef(`battleCommon.cunningStrike.${effect}` as never), locale));
      }
    }
  });
});
