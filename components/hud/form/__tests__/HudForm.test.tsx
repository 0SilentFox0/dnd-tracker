// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { HudForm } from "@/components/hud/form";
import { Button } from "@/components/ui/button";

afterEach(cleanup);

describe("HudForm", () => {
  it("switches to the tab that holds the first invalid field on submit", () => {
    const onSubmit = vi.fn((e) => e.preventDefault());

    render(
      <HudForm
        id="t-form"
        onSubmit={onSubmit}
        tabs={[
          { id: "a", label: "Основне", content: <input aria-label="ім'я" defaultValue="x" /> },
          { id: "b", label: "Бій", content: <input aria-label="AC" required defaultValue="" /> },
        ]}
        actions={<Button type="submit">Зберегти</Button>}
      />,
    );

    expect(screen.getByRole("tab", { name: "Основне" }).getAttribute("data-state")).toBe("active");
    fireEvent.invalid(screen.getByLabelText("AC"));
    expect(screen.getByRole("tab", { name: "Бій" }).getAttribute("data-state")).toBe("active");
  });

  it("keeps the active tab when it already has an invalid field", () => {
    render(
      <HudForm
        id="t-form"
        onSubmit={() => {}}
        tabs={[
          { id: "a", label: "Основне", content: <input aria-label="ім'я" required defaultValue="" /> },
          { id: "b", label: "Бій", content: <input aria-label="AC" required defaultValue="" /> },
        ]}
        actions={<Button type="submit">Зберегти</Button>}
      />,
    );

    fireEvent.invalid(screen.getByLabelText("AC"));
    expect(screen.getByRole("tab", { name: "Основне" }).getAttribute("data-state")).toBe("active");
  });

  it("renders actions inside the form", () => {
    render(<HudForm id="t-form" onSubmit={() => {}} actions={<Button type="submit">Зберегти</Button>}>поля</HudForm>);

    expect(screen.getByRole("button", { name: "Зберегти" }).closest("form")?.id).toBe("t-form");
  });
});
