// @vitest-environment happy-dom
import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ClassFeaturesEditor } from "@/components/classes/ClassFeaturesEditor";
import type { ClassFeature } from "@/types/classes";

vi.mock("@/components/abilities", () => ({ AbilityListEditor: () => <div data-testid="ability-editor" /> }));

function Harness() {
  const [features, setFeatures] = useState<ClassFeature[]>([{ level: 4, abilities: [] }]);

  return (
    <>
      <ClassFeaturesEditor campaignId="c1" value={features} onChange={setFeatures} />
      <output data-testid="json">{JSON.stringify(features)}</output>
    </>
  );
}

describe("ClassFeaturesEditor: choices per level", () => {
  afterEach(cleanup);

  it("adds a choice to the level section; empty choices leave no key", () => {
    render(<Harness />);

    fireEvent.click(screen.getByRole("button", { name: "Додати вибір" }));

    expect(JSON.parse(screen.getByTestId("json").textContent ?? "[]")[0].choices).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: /^Видалити вибір/ }));

    expect(JSON.parse(screen.getByTestId("json").textContent ?? "[]")[0]).toEqual({ level: 4, abilities: [] });
  });
});
