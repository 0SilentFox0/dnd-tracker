// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { NameOnlyCreateDialog } from "@/components/common/NameOnlyCreateDialog";

afterEach(cleanup);

const texts = { title: "T", description: "D", name: "Name", namePlaceholder: "Type", submit: "Create" };

describe("NameOnlyCreateDialog", () => {
  it("keeps submit disabled until a name is typed and submits the trimmed name", () => {
    const onSubmit = vi.fn();

    render(<NameOnlyCreateDialog open onOpenChange={vi.fn()} formId="f" texts={texts} onSubmit={onSubmit} />);

    const submit = screen.getByRole("button", { name: "Create" }) as HTMLButtonElement;

    expect(submit.disabled).toBe(true);

    fireEvent.change(screen.getByPlaceholderText("Type"), { target: { value: "  Alert " } });

    expect(submit.disabled).toBe(false);

    fireEvent.submit(document.getElementById("f") as HTMLFormElement);

    expect(onSubmit).toHaveBeenCalledWith("Alert");
    expect((screen.getByPlaceholderText("Type") as HTMLInputElement).value).toBe("");
  });

  it("cancel closes the dialog", () => {
    const onOpenChange = vi.fn();

    render(<NameOnlyCreateDialog open onOpenChange={onOpenChange} formId="f" texts={texts} onSubmit={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "common.actions.cancel" }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
