// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { HeroPortrait } from "@/components/character-profile/HeroPortrait";

describe("HeroPortrait", () => {
  afterEach(cleanup);

  it("фото з кнопкою перегляду", () => {
    render(<HeroPortrait src="https://x.supabase.co/storage/v1/object/public/avatars/c/a.webp" name="Арвен" />);
    expect(screen.getByRole("button", { name: "Відкрити фото" })).toBeTruthy();
    expect(screen.getByAltText("Арвен")).toBeTruthy();
  });

  it("старий data URL теж рендериться", () => {
    render(<HeroPortrait src="data:image/png;base64,iVBORw0KGgo=" name="Арвен" />);
    expect(screen.getByAltText("Арвен")).toBeTruthy();
  });

  it("без фото — перша літера", () => {
    render(<HeroPortrait src={null} name="Арвен" />);
    expect(screen.getByText("А")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("без фото підказка «Додати фото» лише тому, хто може редагувати", () => {
    const { rerender } = render(<HeroPortrait src={null} name="Арвен" />);

    expect(screen.queryByText("Додати фото")).toBeNull();
    rerender(<HeroPortrait src={null} name="Арвен" canEdit />);
    expect(screen.getByText("Додати фото")).toBeTruthy();
  });
});
