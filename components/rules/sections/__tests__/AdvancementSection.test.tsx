// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AdvancementSection } from "../AdvancementSection";

import "@/components/ui/__tests__/match-media";
import { DEFAULT_RULES } from "@/lib/utils/rules";

const mount = () => {
  const set = vi.fn();

  render(<AdvancementSection form={{ campaignId: "c", data: DEFAULT_RULES, set } as unknown as Parameters<typeof AdvancementSection>[0]["form"]} />);

  return set;
};

const commit = (label: string | RegExp, value: string) => {
  const input = screen.getAllByLabelText(label)[0];

  fireEvent.change(input, { target: { value } });
  fireEvent.blur(input);
};

afterEach(cleanup);

describe("AdvancementSection", () => {
  it("saves the career ticks and the out-of-career multiplier with the rest of the section", () => {
    const set = mount();

    commit(/rules\.ticks/, "20");

    expect(set).toHaveBeenLastCalledWith("advancement", expect.objectContaining({ career: { ticksRequired: [20, 12, 14], outOfCareerMultiplier: 2 } }));
  });

  it("edits a price bracket of the characteristic track", () => {
    const set = mount();

    commit("wfrpCareers.rules.characteristic: wfrpCareers.rules.cost 1", "35");

    const next = set.mock.calls.at(-1)?.[1].characteristic;

    expect(next.brackets[0]).toEqual({ upTo: 5, cost: 35 });
    expect(next.brackets).toHaveLength(DEFAULT_RULES.advancement.characteristic.brackets.length);
  });

  it("adds a bracket after the last one", () => {
    const set = mount();

    fireEvent.click(screen.getAllByRole("button", { name: "wfrpCareers.rules.addBracket" })[0]);

    const next = set.mock.calls.at(-1)?.[1].characteristic;

    expect(next.brackets.at(-1)).toEqual({ upTo: 45, cost: 150 });
  });
});
