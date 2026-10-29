// @vitest-environment happy-dom
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AbilityScoresGrid } from "@/components/common/AbilityScoresGrid";
import { renderWithIntl } from "@/lib/i18n/test/render-with-intl";

vi.unmock("next-intl");

describe("AbilityScoresGrid", () => {
  afterEach(cleanup);

  it("підписує характеристики так само, як решта застосунку", async () => {
    await renderWithIntl(<AbilityScoresGrid data={{}} set={() => {}} />);

    expect(screen.getByLabelText("Статура")).toBeInTheDocument();
  });

  it("labels abilities in English", async () => {
    await renderWithIntl(<AbilityScoresGrid data={{}} set={() => {}} />, { locale: "en" });

    expect(screen.getByLabelText("Constitution")).toBeInTheDocument();
  });

  it("стерте поле не стрибає на 10 під час введення, а на blur повертає останнє значення", async () => {
    const set = vi.fn();

    await renderWithIntl(<AbilityScoresGrid data={{ strength: 14 }} set={set} showModifier />);

    const input = screen.getByLabelText(/Сила/) as HTMLInputElement;

    fireEvent.change(input, { target: { value: "" } });
    expect(input.value).toBe("");

    fireEvent.blur(input);
    expect(input.value).toBe("14");
    expect(set).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { value: "18" } });
    fireEvent.blur(input);
    expect(set).toHaveBeenCalledWith("strength", 18);
  });
});
