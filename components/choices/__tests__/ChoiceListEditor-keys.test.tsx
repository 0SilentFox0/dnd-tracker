// @vitest-environment happy-dom
import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ChoiceListEditor } from "@/components/choices/ChoiceListEditor";
import { battleConditionsSchema } from "@/lib/server/battles/mutations/conditions/conditions-mutation";
import type { Choice } from "@/types/choices";

vi.mock("@/components/abilities", () => ({
  AbilityListEditor: ({ onValidityChange }: { onValidityChange?: (ok: boolean, n: number) => void }) => (
    <div>
      <input data-testid="ability-state" />
      <button type="button" onClick={() => onValidityChange?.(false, 1)}>
        report
      </button>
    </div>
  ),
}));
vi.mock("@/lib/hooks/spells", () => ({ useSpells: () => ({ data: [] }) }));

const choice = (id: string): Choice => ({ id, label: id, level: 1, count: 1, kind: "option", options: [{ id: "o", name: "O", abilities: [] }] });

function Harness({ onValidity }: { onValidity: (ok: boolean, n: number) => void }) {
  const [value, setValue] = useState<Choice[]>([choice("a"), choice("b"), choice("c")]);

  return (
    <>
      <ChoiceListEditor campaignId="c1" owner="class" value={value} onChange={setValue} onValidityChange={onValidity} />
      <output data-testid="json">{JSON.stringify(value)}</output>
    </>
  );
}

describe("ChoiceListEditor stable keys", () => {
  afterEach(cleanup);

  it("keeps child state and error counts on their rows after a middle removal", () => {
    const onValidity = vi.fn();

    render(<Harness onValidity={onValidity} />);

    fireEvent.change(screen.getAllByTestId("ability-state")[2], { target: { value: "third" } });
    fireEvent.click(screen.getAllByText("report")[2]);
    expect(onValidity).toHaveBeenLastCalledWith(false, 1);

    fireEvent.click(screen.getByRole("button", { name: 'choices.header.remove {"label":"b"}' }));

    expect(onValidity).toHaveBeenLastCalledWith(false, 1);
    expect((screen.getAllByTestId("ability-state")[1] as HTMLInputElement).value).toBe("third");

    fireEvent.click(screen.getByRole("button", { name: 'choices.header.remove {"label":"c"}' }));

    expect(onValidity).toHaveBeenLastCalledWith(true, 0);
  });

  it("does not persist row keys", () => {
    render(<Harness onValidity={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: 'choices.header.remove {"label":"b"}' }));

    expect(screen.getByTestId("json").textContent).not.toMatch(/uid|key/i);
  });

  it("condition limits come from one constant in schema and UI", async () => {
    const { CONDITION_LIMITS } = await import("@/lib/constants/battle");

    const base = { action: "apply", participantId: "p", condition: "prone" } as const;

    expect(battleConditionsSchema.safeParse({ ...base, rounds: CONDITION_LIMITS.rounds }).success).toBe(true);
    expect(battleConditionsSchema.safeParse({ ...base, rounds: CONDITION_LIMITS.rounds + 1 }).success).toBe(false);
  });
});
