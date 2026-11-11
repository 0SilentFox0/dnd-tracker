// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { EncumbranceBar } from "../EncumbranceBar";

afterEach(cleanup);

describe("EncumbranceBar", () => {
  it("shows carried and limit", () => {
    render(<EncumbranceBar carried={3} limit={7} over={false} />);

    expect(screen.getByText(/wfrpEquipment.encumbrance.label/).textContent).toContain('"carried":3');
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("3");
    expect(screen.queryByText("wfrpEquipment.encumbrance.over")).toBeNull();
  });

  it("flags overweight", () => {
    render(<EncumbranceBar carried={9} limit={7} over />);

    expect(screen.getByText("wfrpEquipment.encumbrance.over")).toBeTruthy();
    expect(screen.getByRole("progressbar").firstElementChild?.className).toContain("bg-hud-danger");
  });
});
