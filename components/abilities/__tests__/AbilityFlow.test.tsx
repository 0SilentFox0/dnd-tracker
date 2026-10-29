// @vitest-environment happy-dom
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AbilityFlow, AbilityFlowList } from "../AbilityFlow";

import { renderWithIntl } from "@/lib/i18n/test/render-with-intl";
import type { AbilityFlowSummary } from "@/lib/utils/abilities/segments";
import { seg } from "@/lib/utils/abilities/segments";

vi.unmock("next-intl");

afterEach(cleanup);

const NS = ["common", "abilities", "abilityRegistry"] as const;

const full: AbilityFlowSummary = {
  when: [seg("summary.trigger.passive")],
  if: [seg("summary.condition.hpBelow", { percent: 50 })],
  then: [[seg("summary.effects.damageBonus", { amount: 2 })], [seg("summary.effects.note", { text: "x" })]],
  limits: [seg("summary.limit.perBattle", { count: 1 })],
};

const render = (summary: AbilityFlowSummary, onChipClick?: (p: never) => void, locale: "uk" | "en" = "uk") =>
  renderWithIntl(<AbilityFlow summary={summary} variant="card" onChipClick={onChipClick as never} />, { locale, namespaces: NS });

describe("AbilityFlow", () => {
  it("renders four labelled groups with one chip per effect", async () => {
    const { container } = await render(full);

    for (const part of ["when", "if", "limits"]) expect(container.querySelectorAll(`[data-part="${part}"]`)).toHaveLength(1);

    expect(container.querySelectorAll('[data-part="then"]')).toHaveLength(2);
    expect(screen.getByText("Коли")).toBeInTheDocument();
    expect(screen.getByText("Ліміт")).toBeInTheDocument();
  });

  it("omits if and limits when empty", async () => {
    const { container } = await render({ when: full.when, if: [], then: [full.then[0]], limits: [] });

    expect(container.querySelector('[data-part="if"]')).toBeNull();
    expect(container.querySelector('[data-part="limits"]')).toBeNull();
    expect(container.querySelectorAll("[data-part]")).toHaveLength(2);
  });

  it("renders an unknown segment key as fallback text without throwing", async () => {
    const { container } = await render({ when: full.when, if: [], then: [[seg("summary.effects.doesNotExist")]], limits: [] });

    expect(container.querySelector('[data-part="then"]')).not.toBeNull();
  });

  it("uses spans without onChipClick and buttons with it", async () => {
    const { container } = await render(full);

    expect(container.querySelector("button")).toBeNull();
    cleanup();

    const onChipClick = vi.fn();

    await render(full, onChipClick);
    fireEvent.click(document.querySelector('button[data-part="if"]') as HTMLElement);
    expect(onChipClick).toHaveBeenCalledWith("if");
  });

  it("shows English labels in the en locale", async () => {
    await render(full, undefined, "en");

    expect(screen.getByText("When")).toBeInTheDocument();
    expect(screen.getAllByText("Then")).toHaveLength(2);
  });

  it("list renders one flow per ability and a dash when empty", async () => {
    const { container } = await renderWithIntl(<AbilityFlowList lines={[full, full]} />, { namespaces: NS });

    expect(container.querySelectorAll("li")).toHaveLength(2);
    cleanup();

    const empty = await renderWithIntl(<AbilityFlowList lines={[]} />, { namespaces: NS });

    expect(empty.container.textContent).toBe("—");
  });
});
