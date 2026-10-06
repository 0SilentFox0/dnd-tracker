// @vitest-environment happy-dom
import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { HudTabs } from "@/components/hud/form";

function Harness({ keepMounted }: { keepMounted?: boolean }) {
  const [v, setV] = useState<"a" | "b">("a");

  return (
    <HudTabs
      value={v}
      onValueChange={setV}
      keepMounted={keepMounted}
      tabs={[
        { id: "a", label: "Перший", content: <input aria-label="поле А" /> },
        { id: "b", label: "Другий", content: <input aria-label="поле Б" />, invalid: true },
      ]}
    />
  );
}

afterEach(cleanup);

describe("HudTabs", () => {
  it("marks invalid tabs", () => {
    render(<Harness />);

    expect(screen.getByRole("tab", { name: /Другий/ }).querySelector("[data-invalid-dot]")).not.toBeNull();
    expect(screen.getByRole("tab", { name: /Перший/ }).querySelector("[data-invalid-dot]")).toBeNull();
  });

  it("keeps inactive panels mounted but hidden when keepMounted", () => {
    render(<Harness keepMounted />);

    const hidden = screen.getByLabelText("поле Б", { selector: "input" }) as HTMLInputElement;

    expect(hidden.closest("[data-tab-id]")?.getAttribute("data-tab-id")).toBe("b");
    expect(hidden.closest("[data-tab-id]")?.className).toContain("data-[state=inactive]:hidden");
  });

  it("unmounts inactive panels by default and switches on click", () => {
    render(<Harness />);

    expect(screen.queryByLabelText("поле Б")).toBeNull();
    fireEvent.mouseDown(screen.getByRole("tab", { name: /Другий/ }));
    expect(screen.getByLabelText("поле Б")).toBeTruthy();
  });
});
