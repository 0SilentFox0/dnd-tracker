// @vitest-environment happy-dom
import { cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { FieldErrors } from "../FieldErrors";

import "@/lib/zod/locale";
import { renderWithIntl } from "@/lib/i18n/test/render-with-intl";
import { validateAbilities } from "@/lib/utils/abilities/editor";
import { defaultSpellForm, spellFormIssue } from "@/lib/utils/spells/model/form";

vi.unmock("next-intl");

afterEach(cleanup);

const ability = (limits: object) => ({ id: "a", name: "Удар", trigger: { event: "action" }, limits, effects: [{ kind: "note", text: "x" }] });

const render = (errors: Parameters<typeof FieldErrors>[0]["errors"]) => renderWithIntl(<FieldErrors errors={errors} />, { locale: "uk", namespaces: ["common", "validation"] });

describe("FieldErrors bounds", () => {
  it("максимум з Zod-issue доходить до тексту", async () => {
    const { errorsByPath } = validateAbilities([ability({ legendaryCost: 4 })]);

    await render(errorsByPath["0.limits.legendaryCost"]);

    expect(screen.getByText(/Не більше 3/)).toBeInTheDocument();
  });

  it("мінімум з Zod-issue доходить до тексту", async () => {
    const { errorsByPath } = validateAbilities([ability({ chance: 0 })]);

    await render(errorsByPath["0.limits.chance"]);

    expect(screen.getByText(/Не менше 1/)).toBeInTheDocument();
  });

  it("spellFormIssue несе minimum/maximum у params", () => {
    expect(spellFormIssue({ ...defaultSpellForm(), name: "Іскра", level: 12 })?.params).toMatchObject({ maximum: 9 });
  });
});
