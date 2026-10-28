// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Breadcrumbs } from "@/components/layout/Breadcrumbs";

let path = "/";

vi.mock("next/navigation", () => ({ usePathname: () => path }));

afterEach(cleanup);

describe("Breadcrumbs", () => {
  it("labels come from common.breadcrumbs keys", () => {
    path = "/campaigns/abc/character/new";
    render(<Breadcrumbs />);

    expect(screen.getByText("common.breadcrumbs.segments.campaigns")).toBeTruthy();
    expect(screen.getByText("common.breadcrumbs.ids.campaigns")).toBeTruthy();
    expect(screen.getByText("common.breadcrumbs.segments.character")).toBeTruthy();
    expect(screen.getByText("common.breadcrumbs.segments.new")).toBeTruthy();
  });

  it("unknown id under unknown parent is details", () => {
    path = "/campaigns/abc/zzz/q";
    render(<Breadcrumbs />);

    expect(screen.getAllByText("common.breadcrumbs.details").length).toBeGreaterThan(0);
  });
});
