// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AiInstructionsEditor } from "@/components/ai";

const save = () => screen.getByRole("button", { name: "common.actions.save" }) as HTMLButtonElement;

const type = (text: string) => fireEvent.change(screen.getByLabelText("ai.instructions.label"), { target: { value: text } });

describe("AiInstructionsEditor", () => {
  afterEach(cleanup);

  it("зберегти вимкнено, поки текст не змінено; лічильник рахує символи", () => {
    render(<AiInstructionsEditor value="Темне фентезі" onSave={vi.fn()} />);

    expect(save().disabled).toBe(true);
    expect(screen.getByText("13 / 8000")).toBeTruthy();

    type("Темне фентезі!");
    expect(save().disabled).toBe(false);
    expect(screen.getByText("14 / 8000")).toBeTruthy();
  });

  it("понад ліміт — зберегти вимкнено", () => {
    render(<AiInstructionsEditor value="" onSave={vi.fn()} />);

    type("a".repeat(8001));
    expect(save().disabled).toBe(true);
  });

  it("зберігає текст і знову блокує кнопку", async () => {
    const onSave = vi.fn(async () => true);

    render(<AiInstructionsEditor value="" onSave={onSave} />);

    type("Говори архаїчно");
    fireEvent.click(save());

    expect(onSave).toHaveBeenCalledWith("Говори архаїчно");
    await waitFor(() => expect(save().disabled).toBe(true));
  });
});
