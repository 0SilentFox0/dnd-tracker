// @vitest-environment happy-dom
import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ClassColumnsEditor } from "@/components/classes/ClassColumnsEditor";
import type { ClassColumn } from "@/types/classes";

function Harness({ initial = [] }: { initial?: ClassColumn[] }) {
  const [v, setV] = useState<ClassColumn[]>(initial);

  return (
    <>
      <ClassColumnsEditor value={v} onChange={setV} />
      <output data-testid="v">{JSON.stringify(v)}</output>
    </>
  );
}

const out = () => JSON.parse(screen.getByTestId("v").textContent ?? "[]") as ClassColumn[];

describe("ClassColumnsEditor", () => {
  afterEach(cleanup);

  it("adds a column with 20 empty cells", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "classes.columns.add" }));

    expect(out()).toEqual([{ key: "column-1", label: 'classes.columns.defaultLabel {"n":1}', values: Array(20).fill("") }]);
  });

  it("edits key, label, values (comma list) and the pool switch", () => {
    render(<Harness initial={[{ key: "column-1", label: 'classes.columns.defaultLabel {"n":1}', values: Array(20).fill("") }]} />);

    fireEvent.change(screen.getByLabelText('classes.columns.keyLabel {"n":1}'), { target: { value: "focus-points" } });
    fireEvent.change(screen.getByLabelText('classes.columns.nameLabel {"n":1}'), { target: { value: "Focus Points" } });
    fireEvent.change(screen.getByLabelText('classes.columns.valuesLabel {"n":1}'), { target: { value: ", 2, 3" } });
    fireEvent.click(screen.getByRole("checkbox", { name: 'classes.columns.poolLabel {"n":1}' }));

    expect(out()[0]).toEqual({ key: "focus-points", label: "Focus Points", values: ["", "2", "3", ...Array(17).fill("")], pool: { rest: "long" } });

    fireEvent.change(screen.getByLabelText('classes.columns.restLabel {"n":1}'), { target: { value: "short" } });

    expect(out()[0].pool).toEqual({ rest: "short" });

    fireEvent.click(screen.getByRole("checkbox", { name: 'classes.columns.poolLabel {"n":1}' }));

    expect(out()[0]).not.toHaveProperty("pool");
  });

  it("removes a column", () => {
    render(<Harness initial={[{ key: "a", label: "A", values: Array(20).fill("") }]} />);
    fireEvent.click(screen.getByRole("button", { name: 'classes.columns.remove {"n":1}' }));

    expect(out()).toEqual([]);
  });
});
