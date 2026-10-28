import { describe, expect, it } from "vitest";

import { makeT } from "@/lib/i18n/test/mock-t";
import { stepText } from "@/lib/onboarding/step-text";

describe("stepText", () => {
  const t = makeT("onboarding");

  it("без variant — базовий опис", () => {
    expect(stepText(t, "dm", { id: "races" })).toEqual({ title: "onboarding.checklist.dm.races.title", description: "onboarding.checklist.dm.races.description" });
  });

  it("variant — ключ з великою літерою й params", () => {
    const text = stepText(t, "dm", { id: "characters", variant: { name: "pending", params: { count: 2 } } });

    expect(text.description).toBe('onboarding.checklist.dm.characters.descriptionPending {"count":2}');
  });

  it("variant без params", () => {
    expect(stepText(t, "player", { id: "character", variant: { name: "pending" } }).description).toBe("onboarding.checklist.player.character.descriptionPending");
  });
});
