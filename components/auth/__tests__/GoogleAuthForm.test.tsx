// @vitest-environment happy-dom
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GoogleAuthForm } from "@/components/auth/GoogleAuthForm";
import { renderWithConfirm } from "@/components/ui/__tests__/render-with-confirm";

const push = vi.fn();

let query = "";

const auth = vi.hoisted(() => ({ getUser: vi.fn(), signInWithOAuth: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push }), useSearchParams: () => new URLSearchParams(query) }));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ auth }) }));

beforeEach(() => {
  query = "";
  vi.clearAllMocks();
  auth.getUser.mockResolvedValue({ data: { user: null } });
  auth.signInWithOAuth.mockResolvedValue({ error: null });
});

afterEach(cleanup);

describe("GoogleAuthForm", () => {
  it("sign-in copy and OAuth call with the callback redirect", async () => {
    renderWithConfirm(<GoogleAuthForm mode="sign-in" />);

    expect(screen.getByRole("heading", { name: "Вхід в D&D Combat Tracker" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Вхід через Google" }));

    await waitFor(() => expect(auth.signInWithOAuth).toHaveBeenCalledWith({ provider: "google", options: { redirectTo: `${window.location.origin}/auth/callback` } }));
  });

  it("sign-up copy", () => {
    renderWithConfirm(<GoogleAuthForm mode="sign-up" />);

    expect(screen.getByRole("heading", { name: "Реєстрація в D&D Combat Tracker" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Реєстрація через Google" })).toBeTruthy();
  });

  it("shows the error from the URL", () => {
    query = "error=%D0%9F%D0%BE%D0%BC%D0%B8%D0%BB%D0%BA%D0%B0";
    renderWithConfirm(<GoogleAuthForm mode="sign-in" />);

    expect(screen.getByRole("alert").textContent).toContain("Помилка");
  });

  it("redirects an already signed-in user to the campaigns", async () => {
    auth.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    renderWithConfirm(<GoogleAuthForm mode="sign-in" />);

    await waitFor(() => expect(push).toHaveBeenCalledWith("/campaigns"));
  });

  it("notifies when the provider is not enabled", async () => {
    auth.signInWithOAuth.mockResolvedValue({ error: { message: "provider is not enabled" } });
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    renderWithConfirm(<GoogleAuthForm mode="sign-up" />);

    fireEvent.click(screen.getByRole("button", { name: "Реєстрація через Google" }));

    expect(await screen.findByText("Google OAuth не налаштований. Будь ласка, зверніться до адміністратора.")).toBeTruthy();
  });
});
