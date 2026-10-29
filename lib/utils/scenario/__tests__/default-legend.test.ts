import { describe, expect, it } from "vitest";

import { LEGEND_KINDS } from "@/lib/constants/scenario";
import { makeT } from "@/lib/i18n/test/mock-t";
import { buildDefaultLegend } from "@/lib/utils/scenario/default-legend";

describe("buildDefaultLegend", () => {
  it("one entry per legend kind with a translated label key", () => {
    expect(buildDefaultLegend(makeT("scenario"))).toEqual(LEGEND_KINDS.map((kind) => ({ kind, label: `scenario.legendKinds.${kind}` })));
  });
});
