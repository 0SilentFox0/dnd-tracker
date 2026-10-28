// @vitest-environment happy-dom
import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { AbilityEditorProvider } from "@/components/abilities/editor-context";
import { AmountField } from "@/components/abilities/fields/AmountField";
import { FlatField } from "@/components/abilities/fields/FlatField";
import type { FieldMeta } from "@/lib/utils/abilities/registry/fields";
import type { ClassColumn } from "@/types/classes";

const values = Array(20).fill("2");

const columns: ClassColumn[] = [
  { key: "rages", label: "Rages", values },
  { key: "rage-damage", label: "Rage Damage", values },
];

const meta = { name: "flat", label: "Значення", input: "flat" } as FieldMeta;

function Harness({ kind, initial, withColumns = true }: { kind: "flat" | "amount"; initial: unknown; withColumns?: boolean }) {
  const [v, setV] = useState<unknown>(initial);

  const Field = kind === "flat" ? FlatField : AmountField;

  return (
    <AbilityEditorProvider value={{ campaignId: "c", errorsByPath: {}, ...(withColumns && { classColumns: columns }) }}>
      <Field id="f" meta={meta} value={v as never} onChange={(x: unknown) => setV(x)} />
      <output data-testid="v">{JSON.stringify(v ?? null)}</output>
    </AbilityEditorProvider>
  );
}

describe.each(["flat", "amount"] as const)("%s: class table mode", (kind) => {
  afterEach(cleanup);

  it("shows the column picker for a scale value and switches the column", () => {
    render(<Harness kind={kind} initial={{ scale: "rages" }} />);

    const select = screen.getByLabelText("Колонка таблиці класу") as HTMLSelectElement;

    expect(select.value).toBe("rages");

    fireEvent.change(select, { target: { value: "rage-damage" } });

    expect(screen.getByTestId("v").textContent).toBe('{"scale":"rage-damage"}');
  });

  it("outside a class form a scale value is shown read-only with a hint", () => {
    render(<Harness kind={kind} initial={{ scale: "rages" }} withColumns={false} />);

    expect(screen.queryByLabelText("Колонка таблиці класу")).toBeNull();
    expect(screen.getByText("Посилання на таблицю класу — лише у вміннях класу")).toBeTruthy();
  });
});
