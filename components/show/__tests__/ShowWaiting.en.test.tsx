// @vitest-environment happy-dom
import { cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ShowWaiting } from "@/components/show/stage/ShowWaiting";
import { renderWithIntl } from "@/lib/i18n/test/render-with-intl";

vi.unmock("next-intl");

afterEach(cleanup);

describe("ShowWaiting en", () => {
  it("renders English texts without raw keys", async () => {
    await renderWithIntl(<ShowWaiting />, { locale: "en", namespaces: ["common", "validation", "show"] });

    expect(screen.getByText("The DM hasn't started the show yet")).toBeInTheDocument();

    cleanup();

    await renderWithIntl(<ShowWaiting paused />, { locale: "en", namespaces: ["common", "validation", "show"] });

    expect(screen.getByText("Break — back shortly")).toBeInTheDocument();
  });
});
