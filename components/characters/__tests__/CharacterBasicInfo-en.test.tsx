// @vitest-environment happy-dom
import { cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CharacterBasicInfo } from "@/components/characters/basic/CharacterBasicInfo";
import { DraftBanner } from "@/components/characters/player-draft/DraftBanner";
import { renderWithIntl } from "@/lib/i18n/test/render-with-intl";
import { defaultCharacterFormData } from "@/lib/utils/characters/form/defaults";

vi.unmock("next-intl");
vi.mock("@/components/ui/image-upload", () => ({ ImageUpload: ({ label }: { label: string }) => <span>{label}</span> }));

describe("characters in en", () => {
  afterEach(cleanup);

  it("CharacterBasicInfo renders English labels and archetypes", async () => {
    const basicInfo = { data: { ...defaultCharacterFormData.basicInfo, type: "player" }, set: vi.fn() };

    await renderWithIntl(<CharacterBasicInfo basicInfo={basicInfo as never} races={[]} />, { locale: "en", namespaces: ["common", "characters"] });

    expect(screen.getByText("Race *")).toBeInTheDocument();
    expect(screen.getByText("Controlled by *")).toBeInTheDocument();
    expect(screen.getByText("Create a race in the Races section first")).toBeInTheDocument();
    expect(screen.getByText("Character portrait")).toBeInTheDocument();
  });

  it("DraftBanner interpolates the DM comment", async () => {
    await renderWithIntl(<DraftBanner campaignId="c1" note="Add a goal" isOwner={false} />, { locale: "en", namespaces: ["common", "characters"] });

    expect(screen.getByText("DM comment: Add a goal")).toBeInTheDocument();
  });
});
