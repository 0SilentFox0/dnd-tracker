// @vitest-environment happy-dom
import { cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AiComposer } from "@/components/ai/AiComposer";
import { renderWithIntl } from "@/lib/i18n/test/render-with-intl";

vi.unmock("next-intl");

afterEach(cleanup);

describe("AiComposer en", () => {
  it("renders English labels and quick prompts without raw keys", async () => {
    await renderWithIntl(<AiComposer mode="live" busy={false} focusLabel="Focus: campaign" actions={{ onSend: vi.fn(), onStop: vi.fn(), onClearFocus: vi.fn() }} />, { locale: "en", namespaces: ["common", "validation", "ai"] });

    expect(screen.getByRole("button", { name: "Send" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "What's the DC?" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clear focus" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Write a message…")).toBeInTheDocument();
  });
});
