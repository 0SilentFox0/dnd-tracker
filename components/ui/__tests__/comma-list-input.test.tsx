// @vitest-environment happy-dom
import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CommaListInput } from "@/components/ui/comma-list-input";

afterEach(cleanup);

describe("CommaListInput", () => {
  it("keeps trailing separator so a second item can be typed", () => {
    const onChange = vi.fn();

    function Host() {
      const [value, setValue] = useState<string[]>([]);

      return <CommaListInput aria-label="list" value={value} onChange={(next) => { setValue(next); onChange(next); }} />;
    }

    render(<Host />);

    const input = screen.getByLabelText("list") as HTMLInputElement;

    fireEvent.change(input, { target: { value: "a, " } });
    expect(input.value).toBe("a, ");
    fireEvent.change(input, { target: { value: "a, b" } });
    expect(onChange).toHaveBeenLastCalledWith(["a", "b"]);
    expect(input.value).toBe("a, b");
  });

  it("normalises the text on blur", () => {
    render(<CommaListInput aria-label="list" value={["a"]} onChange={() => {}} />);

    const input = screen.getByLabelText("list") as HTMLInputElement;

    fireEvent.change(input, { target: { value: "a,  " } });
    fireEvent.blur(input);
    expect(input.value).toBe("a");
  });
});
