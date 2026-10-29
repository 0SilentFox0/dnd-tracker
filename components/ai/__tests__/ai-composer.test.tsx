// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AiComposer } from "@/components/ai/AiComposer";

afterEach(cleanup);

describe("AiComposer", () => {
  it("Enter відправляє, Shift+Enter — ні; поле очищається", () => {
    const onSend = vi.fn();

    render(<AiComposer mode="scenario" busy={false} focusLabel={null} actions={{ onSend, onStop: vi.fn(), onClearFocus: vi.fn() }} />);

    const box = screen.getByRole("textbox");

    fireEvent.change(box, { target: { value: "Дай 3 твісти" } });
    fireEvent.keyDown(box, { key: "Enter", shiftKey: true });
    expect(onSend).not.toHaveBeenCalled();
    fireEvent.keyDown(box, { key: "Enter" });
    expect(onSend).toHaveBeenCalledWith("Дай 3 твісти");
    expect((box as HTMLTextAreaElement).value).toBe("");
  });

  it("під час стріму — лише «Стоп»", () => {
    const onStop = vi.fn();

    render(<AiComposer mode="live" busy focusLabel={null} actions={{ onSend: vi.fn(), onStop, onClearFocus: vi.fn() }} />);
    fireEvent.click(screen.getByRole("button", { name: "ai.composer.stop" }));
    expect(onStop).toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "ai.composer.send" })).toBeNull();
  });

  it("live: швидкий чип відправляє одразу", () => {
    const onSend = vi.fn();

    render(<AiComposer mode="live" busy={false} focusLabel={null} actions={{ onSend, onStop: vi.fn(), onClearFocus: vi.fn() }} />);
    fireEvent.click(screen.getByRole("button", { name: "ai.composer.quickPrompts.dc" }));
    expect(onSend).toHaveBeenCalledWith("ai.composer.quickPrompts.dc");
  });
});
