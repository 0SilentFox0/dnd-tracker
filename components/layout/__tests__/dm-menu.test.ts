import { describe, expect, it } from "vitest";

import { isDmLinkVisible } from "../dm-menu";

describe("isDmLinkVisible", () => {
  it.each(["characters", "battles", "scenario"])("%s прихований на шаблоні, видимий на кампанії", (path) => {
    expect(isDmLinkVisible(path, true)).toBe(false);
    expect(isDmLinkVisible(path, false)).toBe(true);
  });

  it.each(["spells", "units", "rules", "music", "artifacts", "ai"])("%s видимий на шаблоні", (path) => {
    expect(isDmLinkVisible(path, true)).toBe(true);
  });
});
