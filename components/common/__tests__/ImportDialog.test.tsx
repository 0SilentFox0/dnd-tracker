// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ImportDialog } from "@/components/common/ImportDialog";
import { mockMatchMedia } from "@/components/ui/__tests__/match-media";

const importHook = { file: null, error: null, success: false, isLoading: false, handleFileChange: vi.fn(), handleImport: vi.fn(async () => {}), reset: vi.fn() } as never;

describe("ImportDialog", () => {
  afterEach(cleanup);

  it.each([false, true])("без open відкривається своєю кнопкою (mobile=%s)", (mobile) => {
    mockMatchMedia(mobile);
    render(<ImportDialog triggerLabel="Імпортувати юніти" title="Імпорт юнітів" importHook={importHook} />);

    fireEvent.click(screen.getByRole("button", { name: "Імпортувати юніти" }));

    expect(screen.getByText("Імпорт юнітів")).toBeInTheDocument();
  });
});
