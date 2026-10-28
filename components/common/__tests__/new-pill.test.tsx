// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { NewPill } from "@/components/common/NewPill";
import { HudTile } from "@/components/hud/page";

afterEach(cleanup);

describe("NewPill", () => {
  it("shows the plain key without a count", () => {
    render(<NewPill />);

    expect(screen.getByText("common.notifications.new")).toBeTruthy();
  });

  it("shows the count key for counts above one", () => {
    render(<NewPill count={3} />);

    expect(screen.getByText('common.notifications.newCount {"count":3}')).toBeTruthy();
  });
});

describe("HudTile badge", () => {
  it("renders the badge", () => {
    render(<HudTile href="/x" title="Герой" badge={<NewPill />} />);

    expect(screen.getByText("common.notifications.new")).toBeTruthy();
  });
});
