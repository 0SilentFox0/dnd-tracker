// @vitest-environment happy-dom
import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { NumberInput } from "@/components/ui/number-input";

function Harness({ initial }: { initial: number | undefined }) {
  const [value, setValue] = useState(initial);

  return (
    <>
      <NumberInput aria-label="n" value={value} onChange={setValue} />
      <output data-testid="v">{String(value)}</output>
      <button type="button" onClick={() => setValue(7)}>
        set
      </button>
    </>
  );
}

const input = () => screen.getByLabelText("n") as HTMLInputElement;

describe("NumberInput", () => {
  afterEach(cleanup);

  it("0 допустимий і не замінюється значенням за замовчуванням", () => {
    render(<Harness initial={10} />);
    fireEvent.change(input(), { target: { value: "0" } });

    expect(input().value).toBe("0");
    expect(screen.getByTestId("v").textContent).toBe("0");
  });

  it("порожнє поле лишається порожнім під час введення", () => {
    render(<Harness initial={10} />);
    fireEvent.change(input(), { target: { value: "" } });

    expect(input().value).toBe("");
    expect(screen.getByTestId("v").textContent).toBe("undefined");
  });

  it("«-» під час введення не скидається, «-2» — число", () => {
    render(<Harness initial={10} />);
    fireEvent.change(input(), { target: { value: "-" } });

    expect(input().value).toBe("-");
    expect(screen.getByTestId("v").textContent).toBe("10");

    fireEvent.change(input(), { target: { value: "-2" } });
    expect(screen.getByTestId("v").textContent).toBe("-2");
  });

  it("зовнішня зміна значення оновлює текст", () => {
    render(<Harness initial={10} />);
    fireEvent.click(screen.getByText("set"));

    expect(input().value).toBe("7");
  });
});
