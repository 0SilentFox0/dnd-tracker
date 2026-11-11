// @vitest-environment happy-dom
import { cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/hud/fonts", () => ({ hudFontClassName: "" }));

import { ParticipantRow } from "@/components/battle/participants/ParticipantRow";
import { TooltipProvider } from "@/components/ui/tooltip";
import { renderWithConfirm } from "@/lib/i18n/test/render-uk";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";

vi.unmock("next-intl");

afterEach(cleanup);

const renderRow = (masked: boolean) =>
  renderWithConfirm(
    <TooltipProvider>
      <ParticipantRow participant={createMockParticipant()} effects={[]} view={{ exact: true, acText: "12", wounds: false, current: false, masked }} impact={null} onSelect={vi.fn()} />
    </TooltipProvider>,
  );

describe("позначка маски у списку учасників", () => {
  it("показує маску для учасника під ілюзією", () => {
    renderRow(true);

    expect(screen.getByLabelText("Підміна")).toBeTruthy();
  });

  it("без ілюзії позначки немає", () => {
    renderRow(false);

    expect(screen.queryByLabelText("Підміна")).toBeNull();
  });
});
