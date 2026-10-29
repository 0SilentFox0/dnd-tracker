// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DmEntityCard } from "@/components/common/DmEntityCard";

afterEach(cleanup);

describe("DmEntityCard", () => {
  it("links the title and badges to href and renders the children", () => {
    render(
      <DmEntityCard href="/x/1" title="Wizard" onDelete={vi.fn()}>
        <span>d6</span>
      </DmEntityCard>,
    );

    expect(screen.getByRole("heading", { name: "Wizard" }).closest("a")?.getAttribute("href")).toBe("/x/1");
    expect(screen.getByText("d6").closest("a")?.getAttribute("href")).toBe("/x/1");
  });
});
