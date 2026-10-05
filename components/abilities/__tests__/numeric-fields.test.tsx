// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";

import { AmountField } from "@/components/abilities/fields/AmountField";
import { FlatField } from "@/components/abilities/fields/FlatField";
import type { FieldMeta } from "@/lib/utils/abilities/registry/fields";

const meta = { name: "flat", label: "Значення", input: "flat" } as FieldMeta;

function Harness({ kind }: { kind: "flat" | "amount" }) {
  const [v, setV] = useState<unknown>(undefined);

  const Field = kind === "flat" ? FlatField : AmountField;

  return (
    <>
      <Field id="f" meta={meta} value={v as never} onChange={(x: unknown) => setV(x)} />
      <output data-testid="v">{JSON.stringify(v ?? null)}</output>
    </>
  );
}

describe.each(["flat", "amount"] as const)("%s: від'ємні числа", (kind) => {
  afterEach(cleanup);

  it("«-» не показує NaN, а «-2» дає -2", () => {
    render(<Harness kind={kind} />);

    const input = screen.getByRole("textbox");

    fireEvent.change(input, { target: { value: "-" } });
    expect((input as HTMLInputElement).value).toBe("-");
    expect(screen.getByTestId("v").textContent).not.toContain("NaN");

    fireEvent.change(input, { target: { value: "-2" } });
    expect(screen.getByTestId("v").textContent).toBe("-2");
  });
});
