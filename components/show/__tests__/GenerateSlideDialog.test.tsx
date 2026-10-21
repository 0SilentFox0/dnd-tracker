// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AddSlidesBar } from "../editor/AddSlidesBar";
import { GenerateSlideDialog } from "../editor/GenerateSlideDialog";

import { generateSlideImage } from "@/lib/api/ai";
import { aiKeys } from "@/lib/hooks/ai/keys";
import { ConfirmContext } from "@/lib/hooks/common";

vi.mock("@/lib/api/ai", () => ({ generateSlideImage: vi.fn(), getAiCredentials: vi.fn(async () => []), getAiSettings: vi.fn(async () => ({ instructions: "" })) }));

const wrap = (credentials: unknown[]) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });

  client.setQueryData(aiKeys.credentials(), credentials);
  client.setQueryData(aiKeys.settings("c1"), { instructions: "" });

  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <ConfirmContext.Provider value={vi.fn(async () => true)}>{children}</ConfirmContext.Provider>
    </QueryClientProvider>
  );

  return Wrapper;
};

const openai = [{ provider: "openai", last4: "1234", defaultModel: null, updatedAt: "" }];

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("генерація слайда", () => {
  it("кнопка прихована без ключа провайдера з картинками (лише Anthropic)", () => {
    const upload = { addFiles: vi.fn(), addUrl: vi.fn(), progress: null };

    render(<AddSlidesBar campaignId="c1" upload={upload} count={0} />, { wrapper: wrap([{ ...openai[0], provider: "anthropic" }]) });

    expect(screen.queryByRole("button", { name: "Згенерувати" })).toBeNull();
  });

  it("кнопка видима з ключем OpenAI", () => {
    const upload = { addFiles: vi.fn(), addUrl: vi.fn(), progress: null };

    render(<AddSlidesBar campaignId="c1" upload={upload} count={0} />, { wrapper: wrap(openai) });

    expect(screen.getByRole("button", { name: "Згенерувати" })).toBeTruthy();
  });

  it("генерація → перегляд → «Додати слайд» передає URL", async () => {
    vi.mocked(generateSlideImage).mockResolvedValue({ url: "https://x.supabase.co/scene-slides/c1/a.webp" });

    const onAdd = vi.fn();

    render(<GenerateSlideDialog campaignId="c1" open onOpenChange={vi.fn()} onAdd={onAdd} />, { wrapper: wrap(openai) });

    fireEvent.change(screen.getByLabelText("Опис зображення"), { target: { value: "Таверна вночі" } });
    fireEvent.click(screen.getByRole("button", { name: "Згенерувати" }));

    await waitFor(() => expect(screen.getByAltText("Згенероване зображення")).toBeTruthy());

    expect(vi.mocked(generateSlideImage).mock.calls[0][1]).toMatchObject({ prompt: "Таверна вночі", provider: "openai", model: "gpt-image-2", aspect: "16:9", useCampaignStyle: false });

    fireEvent.click(screen.getByRole("button", { name: "Додати слайд" }));

    expect(onAdd).toHaveBeenCalledWith("https://x.supabase.co/scene-slides/c1/a.webp");
  });

  it("помилка показується в діалозі", async () => {
    vi.mocked(generateSlideImage).mockRejectedValue(new Error("Провайдер відхилив запит (фільтр безпеки) — змініть опис"));

    render(<GenerateSlideDialog campaignId="c1" open onOpenChange={vi.fn()} onAdd={vi.fn()} />, { wrapper: wrap(openai) });

    fireEvent.change(screen.getByLabelText("Опис зображення"), { target: { value: "x" } });
    fireEvent.click(screen.getByRole("button", { name: "Згенерувати" }));

    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("фільтр безпеки"));
  });
});
