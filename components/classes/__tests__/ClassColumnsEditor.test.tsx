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
    fireEvent.click(screen.getByRole("button", { name: "Додати колонку" }));

    expect(out()).toEqual([{ key: "column-1", label: "Колонка 1", values: Array(20).fill("") }]);
  });

  it("edits key, label, per-level cells and the pool switch", () => {
    render(<Harness initial={[{ key: "column-1", label: "Колонка 1", values: Array(20).fill("") }]} />);

    fireEvent.change(screen.getByLabelText("Ключ колонки 1"), { target: { value: "focus-points" } });
    fireEvent.change(screen.getByLabelText("Назва колонки 1"), { target: { value: "Focus Points" } });
    fireEvent.change(screen.getByLabelText("Колонка 1, рівень 2"), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText("Колонка 1, рівень 3"), { target: { value: "3" } });
    fireEvent.click(screen.getByRole("checkbox", { name: "Пул колонки 1" }));

    expect(out()[0]).toEqual({ key: "focus-points", label: "Focus Points", values: ["", "2", "3", ...Array(17).fill("")], pool: { rest: "long" } });

    fireEvent.change(screen.getByLabelText("Відпочинок колонки 1"), { target: { value: "short" } });

    expect(out()[0].pool).toEqual({ rest: "short" });

    fireEvent.click(screen.getByRole("checkbox", { name: "Пул колонки 1" }));

    expect(out()[0]).not.toHaveProperty("pool");
  });

  it("spreads a pasted comma list across cells from the pasted one", () => {
    render(<Harness initial={[{ key: "a", label: "A", values: Array(20).fill("") }]} />);

    fireEvent.paste(screen.getByLabelText("Колонка 1, рівень 3"), { clipboardData: { getData: () => "1, 2,3" } });

    expect(out()[0].values).toEqual(["", "", "1", "2", "3", ...Array(15).fill("")]);
  });

  it("removes a column", () => {
    render(<Harness initial={[{ key: "a", label: "A", values: Array(20).fill("") }]} />);
    fireEvent.click(screen.getByRole("button", { name: "Видалити колонку 1" }));

    expect(out()).toEqual([]);
  });
});
