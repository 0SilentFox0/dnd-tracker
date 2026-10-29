// @vitest-environment happy-dom
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ContentTransferButtons } from "../ContentTransferButtons";

import { renderWithIntl } from "@/lib/i18n/test/render-with-intl";

vi.mock("next/dynamic", () => ({ default: () => (props: { kind: string; open: boolean }) => (props.open ? <p>{`WIZARD ${props.kind}`}</p> : null) }));

vi.unmock("next-intl");
afterEach(cleanup);

describe("ContentTransferButtons", () => {
  it("експорт — посилання на CSV виду, імпорт відкриває майстер", async () => {
    await renderWithIntl(<ContentTransferButtons campaignId="c1" kind="spells" />, { namespaces: ["common", "validation", "contentImport"] });

    expect(screen.getByRole("link", { name: "Експорт CSV" }).getAttribute("href")).toBe("/api/campaigns/c1/content-export/spells");
    expect(screen.queryByText("WIZARD spells")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Імпорт" }));

    expect(screen.getByText("WIZARD spells")).toBeTruthy();
  });
});
