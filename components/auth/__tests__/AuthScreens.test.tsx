// @vitest-environment happy-dom
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ForgotPasswordScreen, ResetPasswordScreen, SignInScreen, SignUpScreen } from "@/components/auth/AuthScreens";
import { renderWithConfirm } from "@/components/ui/__tests__/render-with-confirm";
import { AUTH_ERRORS } from "@/lib/constants/auth";

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }));

let query = "";

const auth = vi.hoisted(() => ({
  getUser: vi.fn(),
  signInWithOAuth: vi.fn(),
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  resend: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  updateUser: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => router, useSearchParams: () => new URLSearchParams(query) }));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ auth }) }));

const type = (label: string | RegExp, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

beforeEach(() => {
  query = "";
  vi.clearAllMocks();
  auth.getUser.mockResolvedValue({ data: { user: null } });
  auth.signInWithOAuth.mockResolvedValue({ error: null });
  auth.signInWithPassword.mockResolvedValue({ error: null });
  auth.signUp.mockResolvedValue({ data: { session: null }, error: null });
  auth.resend.mockResolvedValue({ error: null });
  auth.resetPasswordForEmail.mockResolvedValue({ error: null });
  auth.updateUser.mockResolvedValue({ error: null });
});

afterEach(cleanup);

describe("SignInScreen", () => {
  it("signs in with email and password and follows next", async () => {
    query = "next=%2Fcampaigns%2Fc1";
    renderWithConfirm(<SignInScreen />);

    type("Email", " Wizard@Example.com ");
    type(/^Пароль/, "secret123");
    fireEvent.click(screen.getByRole("button", { name: "Увійти" }));

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/campaigns/c1"));
    expect(auth.signInWithPassword).toHaveBeenCalledWith({ email: "wizard@example.com", password: "secret123" });
  });

  it("validates before calling Supabase", async () => {
    renderWithConfirm(<SignInScreen />);

    type("Email", "not-an-email");
    fireEvent.click(screen.getByRole("button", { name: "Увійти" }));

    expect(await screen.findByText("Некоректна адреса пошти")).toBeTruthy();
    expect(screen.getByText("Введіть пароль")).toBeTruthy();
    expect(auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it("explains wrong credentials", async () => {
    auth.signInWithPassword.mockResolvedValue({ error: { code: "invalid_credentials", message: "Invalid login credentials" } });
    renderWithConfirm(<SignInScreen />);

    type("Email", "a@b.test");
    type(/^Пароль/, "wrong");
    fireEvent.click(screen.getByRole("button", { name: "Увійти" }));

    expect((await screen.findByRole("alert")).textContent).toBe(AUTH_ERRORS.invalid_credentials);
  });

  it("offers to resend the confirmation for an unconfirmed email", async () => {
    auth.signInWithPassword.mockResolvedValue({ error: { code: "email_not_confirmed", message: "Email not confirmed" } });
    renderWithConfirm(<SignInScreen />);

    type("Email", "a@b.test");
    type(/^Пароль/, "secret123");
    fireEvent.click(screen.getByRole("button", { name: "Увійти" }));
    fireEvent.click(await screen.findByRole("button", { name: "Надіслати лист ще раз" }));

    await waitFor(() =>
      expect(auth.resend).toHaveBeenCalledWith({ type: "signup", email: "a@b.test", options: { emailRedirectTo: `${window.location.origin}/auth/callback` } }),
    );
    expect(await screen.findByRole("button", { name: "Лист надіслано ще раз" })).toBeTruthy();
  });

  it("starts Google OAuth through the callback", async () => {
    renderWithConfirm(<SignInScreen />);

    fireEvent.click(screen.getByRole("button", { name: "Увійти через Google" }));

    await waitFor(() =>
      expect(auth.signInWithOAuth).toHaveBeenCalledWith({ provider: "google", options: { redirectTo: `${window.location.origin}/auth/callback`, queryParams: { prompt: "select_account" } } }),
    );
  });

  it("shows a callback error from the URL", () => {
    query = "error=otp_expired";
    renderWithConfirm(<SignInScreen />);

    expect(screen.getByRole("alert").textContent).toContain(AUTH_ERRORS.otp_expired);
  });

  it("redirects an already signed-in user", async () => {
    auth.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    renderWithConfirm(<SignInScreen />);

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/campaigns"));
  });
});

describe("SignUpScreen", () => {
  const fill = () => {
    type("Ім'я", "Ельдрін");
    type("Email", "elf@example.com");
    type(/^Пароль/, "secret123");
    type("Повторіть пароль", "secret123");
  };

  it("registers and asks to confirm the email", async () => {
    renderWithConfirm(<SignUpScreen />);

    fill();
    fireEvent.click(screen.getByRole("button", { name: "Створити акаунт" }));

    expect(await screen.findByRole("heading", { name: "Перевірте пошту" })).toBeTruthy();
    expect(auth.signUp).toHaveBeenCalledWith({
      email: "elf@example.com",
      password: "secret123",
      options: { emailRedirectTo: `${window.location.origin}/auth/callback`, data: { full_name: "Ельдрін" } },
    });
  });

  it("goes straight in when the project returns a session", async () => {
    auth.signUp.mockResolvedValue({ data: { session: { access_token: "t" } }, error: null });
    renderWithConfirm(<SignUpScreen />);

    fill();
    fireEvent.click(screen.getByRole("button", { name: "Створити акаунт" }));

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/campaigns"));
  });

  it("catches mismatched passwords", async () => {
    renderWithConfirm(<SignUpScreen />);

    fill();
    type("Повторіть пароль", "different1");
    fireEvent.click(screen.getByRole("button", { name: "Створити акаунт" }));

    expect(await screen.findByText("Паролі не збігаються")).toBeTruthy();
    expect(auth.signUp).not.toHaveBeenCalled();
  });
});

describe("ForgotPasswordScreen", () => {
  it("sends a recovery link that lands on the new password page", async () => {
    renderWithConfirm(<ForgotPasswordScreen />);

    type("Email", "elf@example.com");
    fireEvent.click(screen.getByRole("button", { name: "Надіслати посилання" }));

    expect(await screen.findByRole("heading", { name: "Перевірте пошту" })).toBeTruthy();
    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith("elf@example.com", {
      redirectTo: `${window.location.origin}/auth/callback?next=%2Freset-password`,
    });
  });

  it("shows rate limits in plain words", async () => {
    auth.resetPasswordForEmail.mockResolvedValue({ error: { code: "over_email_send_rate_limit", message: "x" } });
    renderWithConfirm(<ForgotPasswordScreen />);

    type("Email", "elf@example.com");
    fireEvent.click(screen.getByRole("button", { name: "Надіслати посилання" }));

    expect((await screen.findByRole("alert")).textContent).toBe(AUTH_ERRORS.over_email_send_rate_limit);
  });
});

describe("ResetPasswordScreen", () => {
  it("asks for a new link without a recovery session", async () => {
    renderWithConfirm(<ResetPasswordScreen />);

    expect(await screen.findByRole("link", { name: "Надіслати новий лист" })).toBeTruthy();
  });

  it("saves the new password", async () => {
    auth.getUser.mockResolvedValue({ data: { user: { id: "u1", email: "elf@example.com", identities: [] } } });
    renderWithConfirm(<ResetPasswordScreen />);

    await screen.findByRole("button", { name: "Зберегти пароль" });
    type("Новий пароль", "newsecret1");
    type("Повторіть пароль", "newsecret1");
    fireEvent.click(screen.getByRole("button", { name: "Зберегти пароль" }));

    expect(await screen.findByRole("heading", { name: "Пароль змінено" })).toBeTruthy();
    expect(auth.updateUser).toHaveBeenCalledWith({ password: "newsecret1" });
  });
});
