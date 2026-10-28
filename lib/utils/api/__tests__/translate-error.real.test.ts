import { beforeAll, describe, expect, it, vi } from "vitest";

import { translateErrorBody } from "../translate-error";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { MAX_TRACKS_PER_CAMPAIGN } from "@/lib/constants/music";
import { getTranslator, type Translator } from "@/lib/i18n/translator";

vi.unmock("@/lib/i18n/translator");

let en: Translator;

let uk: Translator;

beforeAll(async () => {
  const { getTranslator: real } = await vi.importActual<{ getTranslator: typeof getTranslator }>("@/lib/i18n/translator");

  en = await real("en");
  uk = await real("uk");
});

describe("translateErrorBody with the real catalogs", () => {
  it("fills registry params", () => {
    expect(translateErrorBody(en, { error: API_ERRORS.TRACK_LIMIT })).toEqual({ error: `The library already has ${MAX_TRACKS_PER_CAMPAIGN} tracks — delete some`, errorKey: API_ERRORS.TRACK_LIMIT });
  });

  it("fills call-site params", () => {
    expect(translateErrorBody(uk, { error: API_ERRORS.CLASS_NAME_TAKEN, params: { name: "Воїн" } }).error).toBe("Клас «Воїн» уже є в кампанії");
    expect(translateErrorBody(en, { error: API_ERRORS.CLASS_NAME_TAKEN, params: { name: "Fighter" } }).error).toBe('The class "Fighter" already exists in the campaign');
  });

  it("uk cooldown follows plural categories", () => {
    const text = (rounds: number) => translateErrorBody(uk, { error: API_ERRORS.ABILITY_COOLDOWN, params: { rounds } }).error;

    expect(text(1)).toBe("Перезарядка: ще 1 раунд");
    expect(text(2)).toBe("Перезарядка: ще 2 раунди");
    expect(text(5)).toBe("Перезарядка: ще 5 раундів");
  });

  it("en cooldown has one/other", () => {
    expect(translateErrorBody(en, { error: API_ERRORS.ABILITY_COOLDOWN, params: { rounds: 1 } }).error).toBe("Cooldown: 1 round left");
    expect(translateErrorBody(en, { error: API_ERRORS.ABILITY_COOLDOWN, params: { rounds: 3 } }).error).toBe("Cooldown: 3 rounds left");
  });

  it("choice detail is appended only when given", () => {
    expect(translateErrorBody(en, { error: API_ERRORS.FEAT_TYPE, params: { detail: ": Alert" } }).error).toBe("A feat of this type is not available here: Alert");
    expect(translateErrorBody(en, { error: API_ERRORS.FEAT_TYPE, params: { detail: "" } }).error).toBe("A feat of this type is not available here");
  });

  it("an unknown text passes through", () => {
    expect(translateErrorBody(uk, { error: "plain" })).toEqual({ error: "plain" });
  });
});
