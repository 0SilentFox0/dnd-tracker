// @vitest-environment happy-dom
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SignInScreen } from "@/components/auth/AuthScreens";
import { ConfirmProvider } from "@/components/ui/confirm-dialog";
import { renderWithIntl } from "@/lib/i18n/test/render-with-intl";

vi.unmock("next-intl");

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }), useSearchParams: () => new URLSearchParams() }));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ auth: { getUser: async () => ({ data: { user: null } }) } }) }));

afterEach(cleanup);

describe("SignInScreen in English", () => {
  it("renders the sign-in button and translated validation errors", async () => {
    await renderWithIntl(
      <ConfirmProvider>
        <SignInScreen />
      </ConfirmProvider>,
      { locale: "en" },
    );

    expect(await screen.findByRole("button", { name: "Sign in" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByText("Invalid email address")).toBeTruthy();
    expect(screen.getByText("This field is required")).toBeTruthy();
  });
});
