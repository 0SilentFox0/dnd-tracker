// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AiThreadHeader } from "@/components/ai/AiThreadHeader";
import { LEGACY_THREAD_TITLE } from "@/lib/constants/ai";
import type { AiThread } from "@/types/ai";

vi.mock("@/components/ui/select-field", () => ({
  SelectField: ({ "aria-label": label, options, onValueChange, value }: { "aria-label": string; options: { value: string; label?: string }[]; onValueChange: (v: string) => void; value: string }) => (
    <select aria-label={label} value={value} onChange={(e) => onValueChange(e.target.value)}>
      {options.map((o) => (
        <option key={o.value} value={o.value} data-label={o.label}>
          {o.value}
        </option>
      ))}
    </select>
  ),
}));

const thread: AiThread = { id: "t1", mode: "live", scenarioPageId: null, title: "Т", provider: "anthropic", model: "claude-haiku-4-5-20251001", updatedAt: "", usage: { inputTokens: 12, outputTokens: 3 } };

afterEach(cleanup);

describe("AiThreadHeader", () => {
  it("зміна провайдера не передає модель — її обирає сервер (defaultModel ключа)", () => {
    const onChangeModel = vi.fn();

    render(<AiThreadHeader threads={[thread]} thread={thread} providers={["anthropic", "openai"]} actions={{ onSelect: vi.fn(), onCreate: vi.fn(), onChangeModel, onClose: vi.fn() }} />);

    fireEvent.change(screen.getByLabelText("ai.thread.provider"), { target: { value: "openai" } });

    expect(onChangeModel).toHaveBeenCalledWith("openai");
    expect(screen.getByText(/"input":12/)).toBeTruthy();
  });

  it("порожній і застарілий заголовок треду показуються як «без назви»", () => {
    const legacy = { ...thread, id: "t2", title: LEGACY_THREAD_TITLE };

    const empty = { ...thread, id: "t3", title: "" };

    render(<AiThreadHeader threads={[thread, legacy, empty]} thread={thread} providers={["anthropic"]} actions={{ onSelect: vi.fn(), onCreate: vi.fn(), onChangeModel: vi.fn(), onClose: vi.fn() }} />);

    const labels = [...screen.getByLabelText("ai.thread.thread").querySelectorAll("option")].map((o) => o.getAttribute("data-label"));

    expect(labels).toEqual(["Т", "ai.thread.untitled", "ai.thread.untitled"]);
  });
});
