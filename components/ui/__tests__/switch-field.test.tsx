// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SwitchField } from "@/components/ui/switch-field";

afterEach(cleanup);

describe("SwitchField", () => {
  it("toggles through its label", () => {
    const onCheckedChange = vi.fn();

    render(<SwitchField id="s" label="Увімкнена" checked={false} onCheckedChange={onCheckedChange} />);
    fireEvent.click(screen.getByText("Увімкнена"));
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });
});
