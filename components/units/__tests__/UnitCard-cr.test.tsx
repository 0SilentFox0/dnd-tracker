// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { mockMatchMedia } from "@/components/ui/__tests__/match-media";
import { ConfirmProvider } from "@/components/ui/confirm-dialog";
import { UnitCard } from "@/components/units/list/UnitCard";
import type { Unit } from "@/lib/hooks/units";

const renderCard = (unit: Unit) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ConfirmProvider>
        <UnitCard unit={unit} campaignId="c1" onDelete={vi.fn()} />
      </ConfirmProvider>
    </QueryClientProvider>,
  );

describe("UnitCard: CR", () => {
  beforeEach(() => mockMatchMedia(false));
  afterEach(cleanup);

  it("чип CR з дробом", () => {
    renderCard({ id: "u1", name: "Вовк", level: 1, attacks: [], cr: 0.25 } as unknown as Unit);

    expect(screen.getByText("CR 1/4")).toBeTruthy();
  });

  it("HOMM-юніт без чипа", () => {
    renderCard({ id: "u2", name: "Гоблін", level: 1, attacks: [], cr: null } as unknown as Unit);

    expect(screen.queryByText(/^CR /)).toBeNull();
  });
});
