import { beforeAll, describe, expect, it, vi } from "vitest";

import type { getTranslator, Translator } from "@/lib/i18n/translator";
import { createClassSchema } from "@/lib/schemas";
import { translateErrorBody } from "@/lib/utils/api/translate-error";

vi.unmock("@/lib/i18n/translator");

let uk: Translator;

let en: Translator;

beforeAll(async () => {
  const { getTranslator: real } = await vi.importActual<{ getTranslator: typeof getTranslator }>("@/lib/i18n/translator");

  uk = await real("uk");
  en = await real("en");
});

const column = (key: string) => ({ key, label: "Focus", values: Array(20).fill("") });

describe("class schema issues", () => {
  it("keeps the key and params of a repeated column key and translates them", () => {
    const result = createClassSchema.safeParse({ name: "Monk", columns: [column("focus"), column("focus")] });

    expect(result.success).toBe(false);

    const issues = (result.error?.issues ?? []).map((i) => ({ message: i.message, params: (i as { params?: Record<string, unknown> }).params }));

    expect(issues).toContainEqual({ message: "classes.validation.columnKeyRepeated", params: { key: "focus" } });
    expect((translateErrorBody(uk, { error: "x", issues }).issues as Array<{ message: string }>)[0].message).toBe("Ключ колонки «focus» повторюється");
    expect((translateErrorBody(en, { error: "x", issues }).issues as Array<{ message: string }>)[0].message).toBe("The column key “focus” is repeated");
  });

  it("uses a validation key for a bad column key format", () => {
    const result = createClassSchema.safeParse({ name: "Monk", columns: [column("Bad Key")] });

    expect(result.error?.issues.map((i) => i.message)).toContain("classes.validation.columnKeyFormat");
  });
});
