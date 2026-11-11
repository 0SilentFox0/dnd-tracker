import * as path from "path";
import { describe, expect, it } from "vitest";

import { assertOnlyFlags, parseCommandArgs } from "../lib/cli-args";

const dir = path.join(__dirname, "fixtures");

describe("parseCommandArgs", () => {
  it("parses the key, flags and valued options", () => {
    const parsed = parseCommandArgs(["fixture-pack", "--dry-run", "--owner", "u1", "--publish", "extra"], dir);

    expect(parsed.key).toBe("fixture-pack");
    expect([...parsed.flags]).toEqual(["--dry-run", "--publish"]);
    expect(parsed.options).toEqual({ "--owner": "u1" });
    expect(parsed.rest).toEqual(["extra"]);
  });

  it("lists the known keys for an unknown pack", () => {
    expect(() => parseCommandArgs(["nope"], dir)).toThrow(/Unknown pack "nope"; known packs: fixture-pack, fixture-sets, grim-fixture/);
  });

  it("rejects a missing key, a flag in the key position and an option without a value", () => {
    expect(() => parseCommandArgs([], dir)).toThrow(/missing/);
    expect(() => parseCommandArgs(["--dry-run"], dir)).toThrow(/Unknown pack/);
    expect(() => parseCommandArgs(["fixture-pack", "--owner"], dir)).toThrow(/needs a value/);
  });

  it("accepts a new key with export options when allowed", () => {
    const parsed = parseCommandArgs(["brand-new", "--from", "c1", "--system", "dnd5e"], dir, true);

    expect(parsed.key).toBe("brand-new");
    expect(parsed.options).toEqual({ "--from": "c1", "--system": "dnd5e" });
    expect(() => parseCommandArgs(["--from", "c1"], dir, true)).toThrow(/missing|Unknown pack/);
  });

  describe("per-command options", () => {
    const parse = (args: string[], command: Parameters<typeof parseCommandArgs>[3]) => parseCommandArgs(["fixture-pack", ...args], dir, false, command);

    it("accepts the options listed in the command usage", () => {
      expect([...parse(["--dry-run", "--prune", "--allow-remote"], "import").flags]).toEqual(["--dry-run", "--prune", "--allow-remote"]);
      expect(parse(["--locale", "uk", "--apply"], "backfill-locale").options).toEqual({ "--locale": "uk" });
    });

    it.each(["--dryrun", "--dry_run", "--prun"])("rejects the typo %s", (flag) => {
      expect(() => parse([flag], "import")).toThrow(/Unknown option .* for "import"/);
    });

    it("rejects --locale for import and a flag of another command", () => {
      expect(() => parse(["--locale", "uk"], "import")).toThrow(/Unknown option --locale/);
      expect(() => parse(["--prune"], "publish")).toThrow(/Unknown option --prune/);
    });

    it("keeps keyless commands strict", () => {
      expect(() => assertOnlyFlags(["--apply", "--allow-remote"], "backfill-keys")).not.toThrow();
      expect(() => assertOnlyFlags(["--aply"], "backfill-keys")).toThrow(/Unknown option --aply/);
      expect(() => assertOnlyFlags(["--x"], "index")).toThrow(/Unknown option/);
    });
  });
});
