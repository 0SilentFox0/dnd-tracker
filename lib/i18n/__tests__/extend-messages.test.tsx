// @vitest-environment happy-dom
import { useTranslations } from "next-intl";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ExtendLocaleScope } from "../extend-locale-scope";
import { ExtendMessages } from "../extend-messages";
import { loadMessages } from "../messages";

vi.unmock("next-intl");

vi.mock("../request-locale", () => ({ getRequestLocale: async () => "en" }));

function Probe() {
  const t = useTranslations() as unknown as { (key: string): string; has: (key: string) => boolean };

  return (
    <span data-testid="out">
      {t("common.actions.back")}|{t.has("battle.title") ? t("battle.title") : "-"}|{t("battleCommon.weather.rain")}
    </span>
  );
}

afterEach(cleanup);

describe("ExtendMessages", () => {
  it.each(["uk", "en"] as const)("%s: merges the battle namespaces into the outer scope", async (locale) => {
    const { NextIntlClientProvider } = await vi.importActual<typeof import("next-intl")>("next-intl");

    const outer = await loadMessages(locale, ["common", "validation"]);

    const battle = { ...(await loadMessages(locale, ["battleCommon"])), battle: { title: "Battle title" } };

    render(
      <NextIntlClientProvider locale={locale} messages={outer}>
        <ExtendMessages messages={battle}>
          <Probe />
        </ExtendMessages>
      </NextIntlClientProvider>,
    );

    const [back, title, rain] = (screen.getByTestId("out").textContent ?? "").split("|");

    expect(back).toBe(locale === "uk" ? "Назад" : "Back");
    expect(title).toBe("Battle title");
    expect(rain).toBe(locale === "uk" ? "Дощ" : "Rain");
  });

  it("ExtendLocaleScope loads the namespaces for the request locale", async () => {
    const { NextIntlClientProvider } = await vi.importActual<typeof import("next-intl")>("next-intl");

    const outer = await loadMessages("en", ["common", "validation"]);

    const scope = await ExtendLocaleScope({ namespaces: ["battleCommon"], children: <Probe /> });

    render(
      <NextIntlClientProvider locale="en" messages={outer}>
        {scope}
      </NextIntlClientProvider>,
    );

    const [back, , rain] = (screen.getByTestId("out").textContent ?? "").split("|");

    expect(back).toBe("Back");
    expect(rain).toBe("Rain");
  });
});
