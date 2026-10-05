// @vitest-environment happy-dom
import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { mockMatchMedia } from "./match-media";

import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { SelectField } from "@/components/ui/select-field";

Object.assign(Element.prototype, { hasPointerCapture: () => false, releasePointerCapture: () => {}, setPointerCapture: () => {}, scrollIntoView: () => {} });

const base = { open: true, onOpenChange: vi.fn(), title: "Додати вміння", description: "Опис", footer: <Button>Зберегти</Button> };

describe("ResponsiveDialog", () => {
  afterEach(cleanup);

  it("десктоп: модалка з заголовком, футером і ✕", () => {
    mockMatchMedia(false);
    render(<ResponsiveDialog {...base}>вміст</ResponsiveDialog>);

    expect(screen.getByRole("dialog")).toHaveAccessibleName("Додати вміння");
    expect(screen.getByRole("button", { name: "Закрити" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Зберегти" })).toBeInTheDocument();
    expect(document.querySelector("[data-slot=sheet]")).toBeNull();
  });

  it("телефон: шторка з ручкою і прилиплим футером", () => {
    mockMatchMedia(true);
    render(<ResponsiveDialog {...base}>вміст</ResponsiveDialog>);

    expect(document.querySelector("[data-slot=sheet]")).not.toBeNull();
    expect(document.querySelector("[data-slot=sheet-handle]")).not.toBeNull();
    expect(document.querySelector("[data-slot=sheet-footer]")?.className).toContain("safe-area-inset-bottom");
    expect(screen.getByText("Додати вміння")).toBeInTheDocument();
  });

  it.each([false, true])("dismissible=false не закривається Escape (mobile=%s)", (mobile) => {
    mockMatchMedia(mobile);

    const onOpenChange = vi.fn();

    render(<ResponsiveDialog {...base} onOpenChange={onOpenChange} dismissible={false}>вміст</ResponsiveDialog>);
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });

    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });

  it("телефон: вкладений діалог відкривається поверх, закриття не закриває батьківський", () => {
    mockMatchMedia(true);

    function Nested() {
      const [inner, setInner] = useState(false);

      const [outer, setOuter] = useState(true);

      return (
        <ResponsiveDialog open={outer} onOpenChange={setOuter} title="Раса">
          <Button onClick={() => setInner(true)}>Шаблони</Button>
          <ResponsiveDialog open={inner} onOpenChange={setInner} title="Шаблони вмінь">
            <Button onClick={() => setInner(false)}>Готово</Button>
          </ResponsiveDialog>
        </ResponsiveDialog>
      );
    }

    render(<Nested />);
    fireEvent.click(screen.getByRole("button", { name: "Шаблони" }));
    expect(screen.getByText("Шаблони вмінь")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Готово" }));

    // vaul keeps the closed sheet mounted until its exit animation ends, which happy-dom never fires
    const sheetOf = (text: string) => screen.getByText(text).closest("[data-slot=sheet]");

    expect(sheetOf("Шаблони вмінь")).toHaveAttribute("data-state", "closed");
    expect(sheetOf("Раса")).toHaveAttribute("data-state", "open");
  });

  it("телефон: вибір у Select всередині шторки не закриває її", async () => {
    mockMatchMedia(true);

    const onOpenChange = vi.fn();

    function WithSelect() {
      const [v, setV] = useState("a");

      return (
        <ResponsiveDialog {...base} onOpenChange={onOpenChange}>
          <SelectField id="s" value={v} onValueChange={setV} options={[{ value: "a", label: "А" }, { value: "b", label: "Б" }]} />
        </ResponsiveDialog>
      );
    }

    render(<WithSelect />);
    fireEvent.pointerDown(screen.getByRole("combobox"), { button: 0, ctrlKey: false, pointerType: "mouse" });
    fireEvent.click(await screen.findByRole("option", { name: "Б" }));

    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    expect(screen.getByRole("combobox")).toHaveTextContent("Б");
  });
});

describe("ResponsiveDialog ширина", () => {
  afterEach(cleanup);

  it("className з sm:max-w-* перекриває size на десктопі", () => {
    mockMatchMedia(false);
    render(<ResponsiveDialog open onOpenChange={vi.fn()} title="Бонусна дія" size="sm" className="sm:max-w-lg">x</ResponsiveDialog>);

    expect(screen.getByRole("dialog").className).toContain("sm:max-w-lg");
    expect(screen.getByRole("dialog").className).not.toContain("sm:max-w-sm");
  });

  it("телефон: десктопні класи позиціонування не застосовуються до шторки", () => {
    mockMatchMedia(true);
    render(<ResponsiveDialog open onOpenChange={vi.fn()} title="Закляття" className="sm:max-w-lg top-[10px] translate-y-0">x</ResponsiveDialog>);

    const sheet = document.querySelector("[data-slot=sheet]") as HTMLElement;

    expect(sheet.className).not.toContain("top-[10px]");
    expect(sheet.className).toContain("bottom-0");
  });
});

describe("BattleDialog", () => {
  afterEach(cleanup);

  it("на десктопі лишається шириною md, як до міграції", async () => {
    mockMatchMedia(false);

    const { BattleDialog } = await import("@/components/battle/dialogs/shared/BattleDialog");

    render(<BattleDialog open onOpenChange={vi.fn()} title="Атака">x</BattleDialog>);
    expect(screen.getByRole("dialog").className).toContain("sm:max-w-lg");
  });
});
