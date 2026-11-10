import { beforeEach, describe, expect, it, vi } from "vitest";

import { createFakeSyncDb } from "../sync/__tests__/fake-sync-db";
import { id } from "../sync/__tests__/helpers";

import { EMPTY_GRIM_TEMPLATE_NAME, GRIM_TEMPLATE_NAME, SRD_TEMPLATE_NAME } from "@/lib/constants/campaigns";
import { prepareCampaignSource } from "@/lib/server/templates/prepare-source";
import { hashText } from "@/lib/srd/i18n/catalog";
import { isCanonicalSrdTemplate, isLegacySrdTemplate, isLocalizableTemplate, isOfficialSrdTemplate } from "@/lib/utils/campaigns/template-locales";

const dictionary = vi.hoisted(() => ({ values: {} as Record<string, string> }));

vi.mock("@/lib/server/templates/template-translations", () => ({ templateTranslationsFor: (_key: string, locale: string) => locale === "uk" ? dictionary.values : {} }));

const official = { kind: "template", visibility: "official", templateKey: SRD_TEMPLATE_NAME };

let f: ReturnType<typeof createFakeSyncDb>;

const prepare = (sourceId = "en", options = {}) => prepareCampaignSource(f.db, sourceId, { userId: "dm", mode: "create", ...options });

beforeEach(() => {
  f = createFakeSyncDb();
  f.addCampaign({ id: "en", ...official, locale: "en" });
  f.addCampaign({ id: "uk", ...official, locale: "uk" });
  f.addRow("spell", { id: id("s"), campaignId: "en", name: "Bless", description: "Missing prose" });
  f.addRow("spell", { id: id("l"), campaignId: "uk", name: "Legacy stored" });
  dictionary.values = { [hashText("n", "Bless")]: "Благословення" };
});

describe("SRD source preparation", () => {
  it("recognizes only official keyed SRD templates, with en/null canonical and uk legacy", () => {
    expect(isCanonicalSrdTemplate({ ...official, locale: null })).toBe(true);
    expect(isLegacySrdTemplate({ ...official, locale: "uk" })).toBe(true);
    expect(isOfficialSrdTemplate({ ...official, visibility: "private" })).toBe(false);
    expect(isOfficialSrdTemplate({ name: SRD_TEMPLATE_NAME } as object)).toBe(false);
  });
  it.each(["en", "uk"] as const)("prepares %s from canonical IDs and falls back to English text", async (contentLocale) => {
    const result = await prepare("en", { contentLocale });

    expect(result).toMatchObject({ id: "en", contentLocale, source: official });
    expect(result.bundle.spells).toEqual([expect.objectContaining({ id: id("s"), name: contentLocale === "uk" ? "Благословення" : "Bless", description: "Missing prose" })]);
  });
  it("legacy alias defaults uk while explicit en wins", async () => {
    expect(await prepare("uk")).toMatchObject({ id: "en", contentLocale: "uk", bundle: { spells: [expect.objectContaining({ name: "Благословення" })] } });
    expect(await prepare("uk", { contentLocale: "en" })).toMatchObject({ id: "en", contentLocale: "en", bundle: { spells: [expect.objectContaining({ name: "Bless" })] } });
  });
  it("a published template is prepared as a layer over itself with an empty content bundle", async () => {
    f.publish("en", 4);

    const result = await prepare("en", { contentLocale: "en" });

    expect(result.layer).toEqual({ sourceId: "en", baseVersion: 4, overrides: {}, hides: [] });
    expect(result.bundle.spells).toEqual([]);
    expect((await prepare("en", { contentLocale: "uk" })).layer).toBeUndefined();
  });
  it("rejects missing and duplicate canonical candidates", async () => {
    f.patchCampaign("en", { locale: "uk" });
    await expect(prepare("uk")).rejects.toMatchObject({ status: 409 });
    f.patchCampaign("en", { locale: "en" });
    f.addCampaign({ id: "duplicate", ...official, locale: null });
    await expect(prepare()).rejects.toMatchObject({ status: 409 });
  });
  it("does not overlay a private same-name template or follow its ancestry", async () => {
    f.patchCampaign("en", { visibility: "private", members: [{ role: "dm" }], locale: "uk", createdFromId: "uk" });
    expect(await prepare()).toMatchObject({ id: "en", contentLocale: "uk", bundle: { spells: [expect.objectContaining({ name: "Bless" })] } });
    await expect(prepare("en", { contentLocale: "uk" })).rejects.toMatchObject({ status: 400 });
  });
  it("ordinary clone/save retain raw locale including null and immediate parent", async () => {
    f.patchCampaign("uk", { kind: "campaign", visibility: "private", members: [{ role: "dm" }], locale: null });
    expect(await prepare("uk", { mode: "clone" })).toMatchObject({ id: "uk", contentLocale: null, bundle: { spells: [expect.objectContaining({ name: "Legacy stored" })] } });
    f.patchCampaign("uk", { ...official, locale: "uk" });
    expect(await prepare("uk", { mode: "save" })).toMatchObject({ id: "uk", contentLocale: "uk", bundle: { spells: [expect.objectContaining({ name: "Legacy stored" })] } });
  });
  it("rejects unsupported/irrelevant overrides and unauthorized sources", async () => {
    await expect(prepare("en", { contentLocale: "fr" })).rejects.toMatchObject({ status: 400 });
    f.patchCampaign("en", { visibility: "private", members: [] });
    await expect(prepare()).rejects.toMatchObject({ status: 403 });
  });
  it("rechecks actual source authorization and identity after locking", async () => {
    await expect(prepare("uk", { beforeExport: async () => { f.patchCampaign("en", { visibility: "private", members: [] }); } })).rejects.toMatchObject({ status: 403 });
    f.patchCampaign("en", { visibility: "private", members: [{ role: "dm" }] });
    await expect(prepare("en", { beforeExport: async () => { f.patchCampaign("en", { kind: "campaign" }); } })).rejects.toMatchObject({ status: 409 });
  });
  it("locks the resolved source before reading its exact export", async () => {
    const beforeExport = vi.fn(async (sourceId: string) => {
      expect(sourceId).toBe("en");
      f.patchRow("spell", id("s"), { description: "Locked snapshot" });
    });

    const result = await prepare("uk", { beforeExport });

    expect(beforeExport).toHaveBeenCalledTimes(1);
    expect(result.bundle.spells[0].description).toBe("Locked snapshot");
  });
});

describe("Grim source preparation", () => {
  const grim = { kind: "template", visibility: "official", templateKey: GRIM_TEMPLATE_NAME };

  beforeEach(() => {
    f.addCampaign({ id: "grim", ...grim, locale: "en" });
    f.addRow("career", { id: id("c"), campaignId: "grim", name: "Archivist", class: "Academic", tiers: [] });
    dictionary.values = { ...dictionary.values, [hashText("n", "Archivist")]: "Архіваріус" };
  });

  it("localizes careers into uk and accepts en for Grim", async () => {
    const uk = await prepare("grim", { contentLocale: "uk" });

    expect(uk.contentLocale).toBe("uk");
    expect(uk.bundle.careers[0].name).toBe("Архіваріус");
    expect(await prepare("grim", { contentLocale: "en" })).toMatchObject({ contentLocale: "en" });
  });
  it("ambiguity is per template key", async () => {
    f.addCampaign({ id: "grim2", ...grim, locale: "en" });
    await expect(prepare("grim", { contentLocale: "uk" })).rejects.toMatchObject({ status: 409 });
    expect(await prepare("en")).toMatchObject({ id: "en" });
  });
  it("recognizes only the official keyed Grim as localizable", () => {
    expect(isLocalizableTemplate({ ...grim, locale: "en" })).toBe(true);
    expect(isLocalizableTemplate({ ...grim, templateKey: EMPTY_GRIM_TEMPLATE_NAME })).toBe(false);
    expect(isLocalizableTemplate({ ...grim, visibility: "private" })).toBe(false);
    expect(isCanonicalSrdTemplate({ ...grim, locale: "en" })).toBe(false);
  });
});
