// @vitest-environment happy-dom
import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { BoundedNumberInput } from "@/components/ui/bounded-number-input";

function Harness({ onCommit }: { onCommit: (v: number) => void }) {
  const [value, setValue] = useState(12);

  return (
    <form onSubmit={(e) => { e.preventDefault(); onCommit(-1); }}>
      <BoundedNumberInput aria-label="n" value={value} min={4} max={60} onCommit={(v) => { setValue(v); onCommit(v); }} />
    </form>
  );
}

const input = () => screen.getByLabelText("n") as HTMLInputElement;

describe("BoundedNumberInput", () => {
  afterEach(cleanup);

  it("порожнє поле під час введення не перескакує на мінімум; blur записує в межах", () => {
    const onCommit = vi.fn();

    render(<Harness onCommit={onCommit} />);
    fireEvent.change(input(), { target: { value: "" } });
    expect(input().value).toBe("");
    fireEvent.change(input(), { target: { value: "2" } });
    expect(input().value).toBe("2");
    expect(onCommit).not.toHaveBeenCalled();
    fireEvent.blur(input());
    expect(onCommit).toHaveBeenCalledWith(4);
    expect(input().value).toBe("4");
  });

  it("порожнє чи нечислове на blur — повертає останнє значення без запису", () => {
    const onCommit = vi.fn();

    render(<Harness onCommit={onCommit} />);
    fireEvent.change(input(), { target: { value: "" } });
    fireEvent.blur(input());
    fireEvent.change(input(), { target: { value: "-" } });
    fireEvent.blur(input());
    expect(onCommit).not.toHaveBeenCalled();
    expect(input().value).toBe("12");
  });

  it("Enter записує й не відправляє форму", () => {
    const onCommit = vi.fn();

    render(<Harness onCommit={onCommit} />);
    fireEvent.change(input(), { target: { value: "24" } });
    fireEvent.keyDown(input(), { key: "Enter" });
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith(24);
  });
});
