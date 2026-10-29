// @vitest-environment happy-dom
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { History } from "lucide-react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ScenarioBar } from "@/components/scenario";
import { render } from "@/components/ui/__tests__/uk-intl";

afterEach(cleanup);

vi.unmock("next-intl");

describe("ScenarioBar", () => {
  it("назва, перемикач нотаток, дії, «☰ Розділи» лише коли передано toc", () => {
    const toggle = vi.fn();

    const onOpen = vi.fn();

    const { rerender } = render(<ScenarioBar title="Викрадення" notes={{ hidden: false, toggle }} actions={<button type="button">Редагувати</button>} menu={[{ label: "Версії", icon: History, onSelect: vi.fn() }]} />);

    expect(screen.getByText("Викрадення")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Розділи/ })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Сховати нотатки" }));
    expect(toggle).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Редагувати" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Ще" })).toBeTruthy();

    rerender(<ScenarioBar title="Викрадення" notes={{ hidden: true, toggle }} toc={{ onOpen }} menu={[]} />);
    fireEvent.click(screen.getByRole("button", { name: /Розділи/ }));
    expect(onOpen).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Показати нотатки" })).toBeTruthy();
  });
});
