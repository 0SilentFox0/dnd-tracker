// @vitest-environment happy-dom
import { cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { WorldMapLink } from "../WorldMapLink";

import { render } from "@/components/ui/__tests__/uk-intl";

vi.unmock("next-intl");

afterEach(cleanup);

describe("WorldMapLink", () => {
  it("links to the DM world page", () => {
    render(<WorldMapLink campaignId="c1" variant="button" />);

    expect(screen.getByRole("link", { name: /Карта світу/ }).getAttribute("href")).toBe("/campaigns/c1/dm/world");
  });

  it("toggle variant uses the toggle class", () => {
    render(<WorldMapLink campaignId="c1" variant="toggle" />);

    expect(screen.getByRole("link").className).toContain("toggle");
    expect(screen.getByRole("link").className).toContain("inline-flex");
  });

  it("opens in a new tab on request", () => {
    render(<WorldMapLink campaignId="c1" variant="button" newTab />);

    const link = screen.getByRole("link");

    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener");
  });

  it("stays in the same tab by default", () => {
    render(<WorldMapLink campaignId="c1" variant="toggle" />);

    expect(screen.getByRole("link").getAttribute("target")).toBeNull();
  });
});
