// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { SelectField } from "@/components/ui/select-field";

describe("SelectField", () => {
  afterEach(cleanup);

  it("default placeholder is the common.ui.selectPlaceholder key", () => {
    render(<SelectField value="" onValueChange={() => {}} options={[{ value: "a", label: "A" }]} />);

    expect(screen.getByText("common.ui.selectPlaceholder")).toBeTruthy();
  });
});
