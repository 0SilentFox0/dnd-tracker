// @vitest-environment happy-dom
import { useLocale } from "next-intl";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ClientLocaleProvider } from "../client-locale-provider";
import { FixedLocaleProvider } from "../fixed-locale-provider";

vi.unmock("next-intl");

function Probe() {
  return <span data-testid="locale">{useLocale()}</span>;
}

const setLanguages = (languages: string[]) => Object.defineProperty(navigator, "languages", { value: languages, configurable: true });

const clearCookie = () => {
  document.cookie = "NEXT_LOCALE=; max-age=0; path=/";
};

beforeEach(() => {
  clearCookie();
  document.documentElement.removeAttribute("lang");
  document.documentElement.removeAttribute("data-lang-lock");
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("ClientLocaleProvider", () => {
  const messages = { uk: {}, en: {} };

  it("without a cookie follows the browser language like the server does", () => {
    setLanguages(["en-US", "en"]);

    render(
      <ClientLocaleProvider messages={messages}>
        <Probe />
      </ClientLocaleProvider>,
    );

    expect(screen.getByTestId("locale").textContent).toBe("en");
  });

  it("cookie wins over the browser language", () => {
    setLanguages(["en-US"]);
    document.cookie = "NEXT_LOCALE=uk; path=/";

    render(
      <ClientLocaleProvider messages={messages}>
        <Probe />
      </ClientLocaleProvider>,
    );

    expect(screen.getByTestId("locale").textContent).toBe("uk");
  });
});

describe("FixedLocaleProvider", () => {
  it("stores the page language when there is no cookie", () => {
    render(
      <FixedLocaleProvider locale="en">
        <Probe />
      </FixedLocaleProvider>,
    );

    expect(document.cookie).toContain("NEXT_LOCALE=en");
  });

  it("keeps an existing cookie", () => {
    document.cookie = "NEXT_LOCALE=uk; path=/";

    render(
      <FixedLocaleProvider locale="en">
        <Probe />
      </FixedLocaleProvider>,
    );

    expect(document.cookie).toContain("NEXT_LOCALE=uk");
  });

  it("locks html lang against the root provider", () => {
    setLanguages(["uk"]);

    render(
      <ClientLocaleProvider messages={{ uk: {}, en: {} }}>
        <FixedLocaleProvider locale="en">
          <Probe />
        </FixedLocaleProvider>
      </ClientLocaleProvider>,
    );

    expect(document.documentElement.lang).toBe("en");
  });
});
