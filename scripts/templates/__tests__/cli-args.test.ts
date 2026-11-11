import * as path from "path";
import { describe, expect, it } from "vitest";

import { parseCommandArgs } from "../lib/cli-args";

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
    expect(() => parseCommandArgs(["nope"], dir)).toThrow(/Unknown pack "nope"; known packs: fixture-pack, grim-fixture/);
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
});
