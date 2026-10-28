// @vitest-environment happy-dom
import { cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { buildLandingMetadata } from "@/components/landing/landing-metadata";
import { LandingPage } from "@/components/landing/LandingPage";
import { renderWithIntl } from "@/lib/i18n/test/render-with-intl";

vi.unmock("@/lib/i18n/translator");

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

vi.mock("@/lib/hooks/auth", () => ({ useHasSessionCookie: () => false }));

afterEach(cleanup);

describe("LandingPage", () => {
  it("renders Ukrainian copy for uk", async () => {
    await renderWithIntl(await LandingPage({ locale: "uk" }), { locale: "uk" });

    expect(screen.getByRole("heading", { level: 1 }).textContent).toContain("а не таблиці");
  });

  it("renders English copy for en and links home to /en", async () => {
    const { container } = await renderWithIntl(await LandingPage({ locale: "en" }), { locale: "en" });

    expect(screen.getByRole("heading", { level: 1 }).textContent).toContain("not the spreadsheets");
    expect(container.querySelector('a[href="/en"]')).not.toBeNull();
    expect(container.querySelector('script[type="application/ld+json"]')?.textContent).toContain("Do I need other apps to run a game?");
  });
});

describe("buildLandingMetadata", () => {
  it("declares hreflang alternates and a per-locale canonical", async () => {
    const en = await buildLandingMetadata("en");

    expect(en.alternates).toEqual({ canonical: "/en", languages: { uk: "/", en: "/en", "x-default": "/" } });
    expect(en.title).toEqual({ absolute: expect.stringContaining("all-in-one") });

    expect((await buildLandingMetadata("uk")).alternates?.canonical).toBe("/");
  });
});
