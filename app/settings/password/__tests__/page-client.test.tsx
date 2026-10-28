// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PasswordSettingsClient } from "../page-client";

const state = vi.hoisted(() => ({ hasPassword: false, done: true }));

vi.mock("@/lib/hooks/auth", () => ({
  useUpdatePassword: () => ({ session: "ready", email: "a@b.c", hasPassword: state.hasPassword, pending: false, error: null, done: state.done, update: vi.fn() }),
}));
vi.mock("@/components/auth/NewPasswordForm", () => ({ NewPasswordForm: ({ submitLabel }: { submitLabel: string }) => <button>{submitLabel}</button> }));

afterEach(cleanup);

describe("PasswordSettingsClient", () => {
  it("uses auth.settings keys for set mode", () => {
    state.hasPassword = false;
    render(<PasswordSettingsClient />);

    expect(screen.getAllByText("auth.settings.setTitle").length).toBeGreaterThan(0);
    expect(screen.getByText("auth.settings.setSubtitle")).toBeTruthy();
    expect(screen.getByText(/auth\.settings\.account/)).toBeTruthy();
    expect(screen.getByText("auth.settings.saved")).toBeTruthy();
  });

  it("change mode", () => {
    state.hasPassword = true;
    render(<PasswordSettingsClient />);

    expect(screen.getByText("auth.settings.changeSubtitle")).toBeTruthy();
    expect(screen.getAllByText("auth.settings.changeTitle").length).toBeGreaterThan(0);
  });
});
