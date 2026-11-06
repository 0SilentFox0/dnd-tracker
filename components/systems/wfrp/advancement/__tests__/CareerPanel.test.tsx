// @vitest-environment happy-dom
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CareerPanel } from "../CareerPanel";

import { render } from "@/lib/i18n/test/render-uk";
import { DEFAULT_RULES } from "@/lib/utils/rules/defaults";

vi.unmock("next-intl");

const mocks = vi.hoisted(() => ({ setCareer: vi.fn(), advanceCareer: vi.fn(), confirm: vi.fn() }));

const tier = (name: string, over = {}) => ({ name, characteristics: [], skills: [], talents: [], trappings: [], ...over });

vi.mock("@/lib/hooks/careers", () => ({ useCareers: () => ({ data: [{ id: "car", name: "Воїн", icon: null, class: null, tiers: [tier("Новобранець"), tier("B"), tier("C"), tier("D")] }] }) }));
vi.mock("@/lib/hooks/campaigns", () => ({ useCampaignRules: () => ({ data: DEFAULT_RULES }) }));
vi.mock("@/lib/hooks/feats", () => ({ useFeats: () => ({ data: [{ id: "f1", name: "Меткий" }] }) }));
vi.mock("@/lib/hooks/characters", () => ({ useCareerOps: () => ({ setCareer: mocks.setCareer, advanceCareer: mocks.advanceCareer, isPending: false }) }));
vi.mock("@/lib/hooks/common", () => ({ useConfirm: () => mocks.confirm }));
vi.mock("@/components/ui/select-field", () => ({
  SelectField: ({ value, options, onValueChange, "aria-label": label }: { value: string; options: { value: string; label: string }[]; onValueChange: (v: string) => void; "aria-label"?: string }) => (
    <select aria-label={label} value={value} onChange={(e) => onValueChange(e.target.value)}>
      <option value="">—</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  ),
}));

const mount = (state: Parameters<typeof CareerPanel>[0]["state"], isDM: boolean) => render(<CareerPanel campaignId="c" characterId="ch" state={state} isDM={isDM} />);

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("CareerPanel", () => {
  it("without a career the DM sees assign, the player a placeholder", () => {
    mount(undefined, true);

    expect(screen.getByRole("button", { name: "Призначити" })).toBeTruthy();

    cleanup();
    mount(undefined, false);

    expect(screen.getByText("Кар'єру не призначено.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Призначити" })).toBeNull();
  });

  it("shows name, tier, ticks counter and ticked items", () => {
    mount({ careerId: "car", tier: 1, ticks: ["characteristic:ws", "talent:f1"] }, false);

    expect(screen.getByText("Воїн")).toBeTruthy();
    expect(screen.getByText("Рівень 1/4")).toBeTruthy();
    expect(screen.getByText("Позначок 2/10")).toBeTruthy();
    expect(screen.getByText("Меткий")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Підвищити" })).toBeNull();
  });

  it("advance without enough ticks asks to confirm and then forces", async () => {
    mocks.confirm.mockResolvedValue(true);

    mount({ careerId: "car", tier: 1, ticks: [] }, true);

    const button = screen.getByRole("button", { name: "Підвищити" });

    expect(button.className).toContain("min-h-11");

    fireEvent.click(button);

    await waitFor(() => expect(mocks.advanceCareer).toHaveBeenCalledWith(true));
  });

  it("declined confirmation does not advance; enough ticks advance without force", async () => {
    mocks.confirm.mockResolvedValue(false);

    mount({ careerId: "car", tier: 1, ticks: [] }, true);
    fireEvent.click(screen.getByRole("button", { name: "Підвищити" }));
    await waitFor(() => expect(mocks.confirm).toHaveBeenCalled());

    expect(mocks.advanceCareer).not.toHaveBeenCalled();

    cleanup();
    mount({ careerId: "car", tier: 1, ticks: Array.from({ length: 10 }, (_, i) => `skill:s${i}`) }, true);
    fireEvent.click(screen.getByRole("button", { name: "Підвищити" }));

    await waitFor(() => expect(mocks.advanceCareer).toHaveBeenCalledWith(false));
    expect(mocks.confirm).toHaveBeenCalledTimes(1);
  });

  it("assigning over an existing career asks to confirm; a first assignment does not", async () => {
    mocks.confirm.mockResolvedValue(false);

    mount({ careerId: "car", tier: 2, ticks: ["skill:a"] }, true);
    fireEvent.change(screen.getByLabelText("Оберіть кар'єру"), { target: { value: "car" } });
    fireEvent.click(screen.getByRole("button", { name: "Призначити" }));

    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledWith(expect.objectContaining({ description: "Поточна кар'єра на рівні 2, позначок 1. Нова кар'єра почнеться з рівня 1 без позначок." })));
    expect(mocks.setCareer).not.toHaveBeenCalled();

    cleanup();
    mount(undefined, true);
    fireEvent.change(screen.getByLabelText("Оберіть кар'єру"), { target: { value: "car" } });
    fireEvent.click(screen.getByRole("button", { name: "Призначити" }));

    await waitFor(() => expect(mocks.setCareer).toHaveBeenCalledWith("car"));
    expect(mocks.confirm).toHaveBeenCalledTimes(1);
  });
});
