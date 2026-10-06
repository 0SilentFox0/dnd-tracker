// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { HudForm } from "@/components/hud/form";
import { findInvalidTab } from "@/components/hud/form/reveal-invalid-tab";
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

  it("lands on the first invalid tab when several tabs are invalid", () => {
    render(
      <HudForm
        id="t-form"
        onSubmit={() => {}}
        tabs={[
          { id: "a", label: "Основне", content: <input aria-label="ім'я" defaultValue="x" /> },
          { id: "b", label: "Бій", content: <input aria-label="AC" required defaultValue="" /> },
          { id: "c", label: "Магія", content: <input aria-label="СЛ" required defaultValue="" /> },
        ]}
        actions={<Button type="submit">Зберегти</Button>}
      />,
    );

    fireEvent.invalid(screen.getByLabelText("AC"));
    fireEvent.invalid(screen.getByLabelText("СЛ"));
    expect(screen.getByRole("tab", { name: "Бій" }).getAttribute("data-state")).toBe("active");
  });

  it("renders actions inside the form", () => {
    render(<HudForm id="t-form" onSubmit={() => {}} actions={<Button type="submit">Зберегти</Button>}>поля</HudForm>);

    expect(screen.getByRole("button", { name: "Зберегти" }).closest("form")?.id).toBe("t-form");
  });
});

describe("findInvalidTab", () => {
  const build = () => {
    const root = document.createElement("div");

    root.innerHTML = '<div data-tab-id="a"><input id="x" value="ok" /></div><div data-tab-id="b"><input id="y" required value="" /></div><div data-tab-id="c"><input id="z" required value="" /></div>';

    return root;
  };

  it("returns the first invalid control's tab in DOM order when the active tab is valid", () => {
    const found = findInvalidTab(build(), "a");

    expect(found?.owner).toBe("b");
    expect(found?.control.id).toBe("y");
  });

  it("returns null when the active tab has an invalid field", () => {
    expect(findInvalidTab(build(), "c")).toBeNull();
  });

  it("returns null when everything is valid", () => {
    const root = build();

    root.querySelectorAll("[required]").forEach((el) => ((el as HTMLInputElement).value = "v"));

    expect(findInvalidTab(root, "a")).toBeNull();
  });
});
