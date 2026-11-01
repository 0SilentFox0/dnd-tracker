// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { type TemplateTile, TemplateTiles } from "../templates/TemplateTiles";

import { SRD_TEMPLATE_NAME } from "@/lib/constants/campaigns";

afterEach(cleanup);

describe("TemplateTiles SRD source", () => {
  it.each(["en", null])("links only canonical English SRD (%s) without offering a translated preview; private same-key content stays separate", (locale) => {
    const srd = (id: string, locale: string | null): TemplateTile => ({ id, name: SRD_TEMPLATE_NAME, description: "English source", locale, templateKey: SRD_TEMPLATE_NAME, kind: "template", visibility: "official" });

    render(<TemplateTiles templates={[srd("canonical", locale), srd("legacy", "uk"), { ...srd("private", "uk"), name: "My copy", visibility: "private" }]} />);

    expect(screen.getByRole("link", { name: /5e SRD/ })).toHaveAttribute("href", "/campaigns/canonical");
    expect(screen.getByRole("link", { name: /My copy/ })).toHaveAttribute("href", "/campaigns/private");
    expect(screen.queryByRole("combobox")).toBeNull();
    expect(screen.getByText("English")).toBeTruthy();
  });
});
