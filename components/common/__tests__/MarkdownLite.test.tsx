// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { MarkdownLite } from "@/components/common/MarkdownLite";

describe("MarkdownLite", () => {
  afterEach(cleanup);

  it("renders a pipe table as a real table with the text around it", () => {
    render(<MarkdownLite text={"Choose one.\n\n| Dragon | Type |\n|---|---|\n| Black | Acid |"} />);

    expect(screen.getByText("Choose one.")).toBeTruthy();
    expect(screen.getAllByRole("columnheader").map((h) => h.textContent)).toEqual(["Dragon", "Type"]);
    expect(screen.getByRole("cell", { name: "Acid" })).toBeTruthy();
    expect(screen.queryByText(/\|---\|/)).toBeNull();
  });
});
