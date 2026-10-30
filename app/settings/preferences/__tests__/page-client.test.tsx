// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PreferencesClient } from "../page-client";

const set = vi.fn();

vi.mock("@/lib/hooks/common", () => ({ useSetLocale: () => ({ locale: "en", set: vi.fn() }), useTimeZoneSetting: () => ({ timeZone: "Asia/Tokyo", browserZone: "Europe/Kyiv", set }) }));

afterEach(cleanup);

describe("PreferencesClient", () => {
  it("renders the preferences keys and the current zone", () => {
    render(<PreferencesClient />);

    expect(screen.getByText("auth.settings.preferences.title")).toBeTruthy();
    expect(screen.getByText("auth.settings.preferences.timeZone")).toBeTruthy();
    expect(screen.getByRole("combobox").textContent).toContain("Asia/Tokyo");
  });
});
