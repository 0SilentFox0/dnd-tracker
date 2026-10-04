/**
 * @vitest-environment happy-dom
 */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

describe("DialogContent", () => {
  afterEach(cleanup);

  it("не виходить за екран телефона: обмежена висота з прокруткою", () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Тест</DialogTitle>
        </DialogContent>
      </Dialog>,
    );

    const content = screen.getByRole("dialog");

    expect(content.className).toContain("max-h-[85dvh]");
    expect(content.className).toContain("overflow-y-auto");
  });

  it("кнопка закриття має українську назву для читачів екрана", () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Тест</DialogTitle>
        </DialogContent>
      </Dialog>,
    );

    expect(screen.getByRole("button", { name: "Закрити" })).toBeInTheDocument();
  });

  it("заголовок не залазить під кнопку закриття", () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogHeader data-testid="header">
            <DialogTitle>Дуже довга назва діалогу на вузькому екрані телефона</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>,
    );

    expect(screen.getByTestId("header").className).toMatch(/\bpx-10\b/);
  });
});
