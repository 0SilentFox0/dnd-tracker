// @vitest-environment happy-dom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AiThreadHeader } from "@/components/ai/AiThreadHeader";
import type { AiThread } from "@/types/ai";

vi.mock("@/components/ui/select-field", () => ({
  SelectField: ({ "aria-label": label, options, onValueChange, value }: { "aria-label": string; options: { value: string }[]; onValueChange: (v: string) => void; value: string }) => (
    <select aria-label={label} value={value} onChange={(e) => onValueChange(e.target.value)}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.value}
        </option>
      ))}
    </select>
  ),
}));

const thread: AiThread = { id: "t1", mode: "live", scenarioPageId: null, title: "Т", provider: "anthropic", model: "claude-haiku-4-5-20251001", updatedAt: "", usage: { inputTokens: 12, outputTokens: 3 } };

describe("AiThreadHeader", () => {
  it("зміна провайдера не передає модель — її обирає сервер (defaultModel ключа)", () => {
    const onChangeModel = vi.fn();

    render(<AiThreadHeader threads={[thread]} thread={thread} providers={["anthropic", "openai"]} actions={{ onSelect: vi.fn(), onCreate: vi.fn(), onChangeModel, onClose: vi.fn() }} />);

    fireEvent.change(screen.getByLabelText("Провайдер"), { target: { value: "openai" } });

    expect(onChangeModel).toHaveBeenCalledWith("openai");
    expect(screen.getByText(/↑12/)).toBeTruthy();
  });
});
