// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ContentTransferButtons } from "../ContentTransferButtons";

vi.mock("next/dynamic", () => ({ default: () => (props: { kind: string; open: boolean }) => (props.open ? <p>{`WIZARD ${props.kind}`}</p> : null) }));

afterEach(cleanup);

describe("ContentTransferButtons", () => {
  it("експорт — посилання на CSV виду, імпорт відкриває майстер", () => {
    render(<ContentTransferButtons campaignId="c1" kind="spells" />);

    expect(screen.getByRole("link", { name: "Експорт CSV" }).getAttribute("href")).toBe("/api/campaigns/c1/content-export/spells");
    expect(screen.queryByText("WIZARD spells")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Імпорт" }));

    expect(screen.getByText("WIZARD spells")).toBeTruthy();
  });
});
