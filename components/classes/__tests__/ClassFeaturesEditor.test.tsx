// @vitest-environment happy-dom
import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ClassFeaturesEditor } from "@/components/classes/ClassFeaturesEditor";
import type { ClassFeature } from "@/types/classes";

vi.mock("@/components/abilities", () => ({
  AbilityListEditor: ({ value }: { value: unknown[] }) => <div data-testid="ability-editor">{value.length}</div>,
}));

function Harness({ initial = [] }: { initial?: ClassFeature[] }) {
  const [features, setFeatures] = useState<ClassFeature[]>(initial);

  return <ClassFeaturesEditor campaignId="c1" value={features} onChange={setFeatures} />;
}

const headings = () => screen.queryAllByRole("heading", { name: /^Рівень \d+$/ }).map((h) => h.textContent);

describe("ClassFeaturesEditor", () => {
  afterEach(cleanup);

  it("додає рівень із секцією редактора здібностей", () => {
    render(<Harness />);

    fireEvent.change(screen.getByLabelText("Рівень для додавання"), { target: { value: "5" } });
    fireEvent.click(screen.getByRole("button", { name: "Додати рівень" }));

    expect(headings()).toEqual(["Рівень 5"]);
    expect(screen.getAllByTestId("ability-editor")).toHaveLength(1);
  });

  it("тримає рівні відсортованими", () => {
    render(<Harness initial={[{ level: 9, abilities: [] }]} />);

    fireEvent.change(screen.getByLabelText("Рівень для додавання"), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: "Додати рівень" }));
    fireEvent.change(screen.getByLabelText("Рівень для додавання"), { target: { value: "4" } });
    fireEvent.click(screen.getByRole("button", { name: "Додати рівень" }));

    expect(headings()).toEqual(["Рівень 2", "Рівень 4", "Рівень 9"]);
  });

  it("видаляє рівень", () => {
    render(<Harness initial={[{ level: 1, abilities: [] }, { level: 3, abilities: [] }]} />);

    fireEvent.click(screen.getByRole("button", { name: "Видалити рівень 1" }));

    expect(headings()).toEqual(["Рівень 3"]);
  });

  it("не пропонує вже додані рівні", () => {
    render(<Harness initial={[{ level: 1, abilities: [] }]} />);

    const options = Array.from(screen.getByLabelText("Рівень для додавання").querySelectorAll("option")).map((o) => o.value);

    expect(options).not.toContain("1");
    expect(options).toHaveLength(19);
  });
});
