import { beforeEach, describe, expect, it, vi } from "vitest";

import { loadMessages, loadStaticMessages } from "../messages";

const load = vi.hoisted(() => vi.fn());

vi.mock("../local-source", () => ({ localSource: { load } }));

describe("loadMessages", () => {
  beforeEach(() => {
    load.mockReset();
  });

  it("returns real common messages keyed by namespace", async () => {
    const { localSource } = await vi.importActual<typeof import("../local-source")>("../local-source");

    load.mockImplementation(localSource.load);

    const messages = await loadMessages("en", ["common"]);

    expect(messages).toHaveProperty("common.app.name");
  });

  it("falls back to uk for keys missing in en", async () => {
    load.mockImplementation(async (locale: string) =>
      locale === "uk" ? { a: "укр", nested: { x: "ікс", y: "ігрек" } } : { nested: { x: "ex" } },
    );

    const messages = await loadMessages("en", ["common"]);

    expect(messages).toEqual({ common: { a: "укр", nested: { x: "ex", y: "ігрек" } } });
  });

  it("loads every locale without request APIs", async () => {
    load.mockImplementation(async (locale: string) => ({ k: locale }));

    const messages = await loadStaticMessages(["common"]);

    expect(messages).toEqual({ uk: { common: { k: "uk" } }, en: { common: { k: "en" } } });
  });
});
