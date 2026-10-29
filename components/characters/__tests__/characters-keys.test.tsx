// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AbilityScoresPicker } from "@/components/characters/player-draft/AbilityScoresPicker";
import { DraftBanner } from "@/components/characters/player-draft/DraftBanner";
import { NoCharacterState } from "@/components/characters/player-draft/NoCharacterState";
import { PrimaryAbilityPicker } from "@/components/characters/stats/PrimaryAbilityPicker";
import { renderWithConfirm } from "@/components/ui/__tests__/render-with-confirm";

const returnWithNote = vi.fn().mockResolvedValue(undefined);

vi.mock("@/lib/hooks/characters", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/hooks/characters")>()),
  useReviewCharacter: () => ({ approve: vi.fn(), returnWithNote, isPending: false }),
}));

import { ReviewActions } from "@/components/characters/review/ReviewActions";

describe("characters components render keys", () => {
  afterEach(cleanup);

  it("DraftBanner: статус, коментар DM і кнопка власника", () => {
    render(<DraftBanner campaignId="c1" note="Дописати" isOwner />);

    expect(screen.getByText("characters.draftBanner.pending")).toBeTruthy();
    expect(screen.getByText('characters.draftBanner.note {"note":"Дописати"}')).toBeTruthy();
    expect(screen.getByRole("link", { name: "characters.draftBanner.edit" })).toBeTruthy();
  });

  it("NoCharacterState: створити і згенерувати лише якщо дозволено", () => {
    const { rerender } = render(<NoCharacterState campaignId="c1" canCreate />);

    expect(screen.getByRole("link", { name: "characters.noCharacter.create" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "characters.noCharacter.generate" })).toBeTruthy();
    rerender(<NoCharacterState campaignId="c1" canCreate={false} />);
    expect(screen.queryByRole("link", { name: "characters.noCharacter.create" })).toBeNull();
  });

  it("PrimaryAbilityPicker: підписи з gameTerms.abilities, aria з параметром", () => {
    render(<PrimaryAbilityPicker value="strength" onChange={vi.fn()} />);

    expect(screen.getByText("characters.stats.primary.legend")).toBeTruthy();
    expect(screen.getByLabelText('characters.stats.primary.aria {"ability":"gameTerms.abilities.strength.label"}')).toBeTruthy();
  });

  it("AbilityScoresPicker: point-buy показує витрати з бюджетом", () => {
    const form = { values: { strength: 8, dexterity: 8, constitution: 8, intelligence: 8, wisdom: 8, charisma: 8 }, setScore: vi.fn(), method: "pointBuy", setMethod: vi.fn() };

    render(<AbilityScoresPicker form={form as never} scoreStatus={{ valid: true, spent: 0 }} reveal={{ rolling: false, settled: new Set(), display: {} } as never} />);

    expect(screen.getByText('characters.draft.scores.spent {"spent":0,"budget":27}')).toBeTruthy();
    expect(screen.getByText("characters.draft.scores.pointBuy" + ' {"budget":27}')).toBeTruthy();
  });

  it("ReviewActions: повернення з коментарем і помилка", async () => {
    returnWithNote.mockRejectedValueOnce(new Error(""));
    renderWithConfirm(<ReviewActions campaignId="c1" characterId="ch1" name="Арвен" />);

    expect(screen.getByText("characters.review.panelTitle")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "characters.review.returnWithNote" }));
    expect(await screen.findByPlaceholderText("characters.review.notePlaceholder")).toBeTruthy();
  });
});
