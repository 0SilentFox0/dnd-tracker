// @vitest-environment happy-dom
import { cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AcquaintanceCard } from "@/components/acquaintances/AcquaintanceCard";
import { renderWithIntl } from "@/lib/i18n/test/render-with-intl";
import type { AcquaintanceView } from "@/types/acquaintances";

vi.unmock("next-intl");

vi.mock("@/lib/hooks/acquaintances", () => ({ useAcquaintanceNote: () => ({ save: vi.fn(), isPending: false }) }));

Object.assign(Element.prototype, { scrollIntoView: () => {} });

afterEach(cleanup);

const item: AcquaintanceView = {
  id: "a1",
  kind: "micro",
  characterId: null,
  name: "Yarema",
  avatarUrl: null,
  description: "",
  sourcePageId: "p1",
  sourceSectionId: "s1",
  hidden: true,
  entries: [{ id: "e1", pageId: "p1", sectionId: "s1", text: "Sold a sword", sortOrder: 0, hidden: true }],
  notes: [],
};

describe("AcquaintanceCard en", () => {
  it("renders English labels without raw keys", async () => {
    await renderWithIntl(<AcquaintanceCard campaignId="c1" item={item} flags={{ isDM: true, isNew: false, focused: false }} />, { locale: "en", namespaces: ["common", "validation", "acquaintances"] });

    expect(screen.getByText("Hidden")).toBeInTheDocument();
    expect(screen.getByText(/· hidden/)).toBeInTheDocument();
    expect(screen.getByLabelText("My note")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });
});
