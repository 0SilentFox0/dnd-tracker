// @vitest-environment happy-dom
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { RestDialog } from "../RestDialog";

import { mockMatchMedia } from "@/components/ui/__tests__/match-media";
import { renderWithConfirm } from "@/components/ui/__tests__/render-with-confirm";
import type { CharacterListItem } from "@/types/characters";

const h = vi.hoisted(() => ({ rest: { mutateOk: vi.fn(async () => true), isPending: false } }));

vi.mock("@/lib/hooks/characters", async (orig) => ({ ...(await orig<object>()), useRest: () => h.rest }));

const hero = (id: string, name: string) => ({ id, name, campaignId: "c", type: "player", controlledBy: "u", level: 3, class: "Воїн", race: "Людина" }) as CharacterListItem;

describe("RestDialog", () => {
  afterEach(cleanup);

  it("all heroes preselected; unchecking one and choosing long rest sends the rest", async () => {
    mockMatchMedia(false);

    const onOpenChange = vi.fn();

    renderWithConfirm(<RestDialog campaignId="c" characters={[hero("a", "Ліра"), hero("b", "Торін")]} open onOpenChange={onOpenChange} />);

    fireEvent.click(screen.getByRole("checkbox", { name: "Торін" }));
    fireEvent.click(screen.getByRole("button", { name: "Довгий" }));
    fireEvent.click(screen.getByRole("button", { name: "Почати відпочинок" }));

    expect(h.rest.mutateOk).toHaveBeenCalledWith({ kind: "long", characterIds: ["a"] });
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it("start is disabled with nobody selected", () => {
    mockMatchMedia(false);
    renderWithConfirm(<RestDialog campaignId="c" characters={[hero("a", "Ліра")]} open onOpenChange={() => {}} />);

    fireEvent.click(screen.getByRole("checkbox", { name: "Ліра" }));

    expect((screen.getByRole("button", { name: "Почати відпочинок" }) as HTMLButtonElement).disabled).toBe(true);
  });
});
