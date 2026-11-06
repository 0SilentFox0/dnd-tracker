// @vitest-environment happy-dom
import { useState } from "react";
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CareerForm } from "../CareerForm";

import "@/components/ui/__tests__/match-media";
import { render } from "@/lib/i18n/test/render-uk";
import type { CareerFormData } from "@/types/careers";

vi.unmock("next-intl");

const mocks = vi.hoisted(() => ({ save: vi.fn() }));

const empty = () => ({ name: "", characteristics: [], skills: [], talents: [], trappings: [] });

vi.mock("@/lib/hooks/careers", () => ({
  useCareerForm: () => {
    const [data, set] = useState<CareerFormData>({ name: "", icon: null, class: null, tiers: [empty(), empty(), empty(), empty()] });

    return { form: { data, set }, save: () => mocks.save(data), isPending: false };
  },
}));
vi.mock("@/components/ui/select-field", () => ({
  SelectField: ({ value, options, onValueChange, "aria-label": label }: { value: string; options: { value: string; label: string }[]; onValueChange: (v: string) => void; "aria-label"?: string }) => (
    <select aria-label={label} value={value} onChange={(e) => onValueChange(e.target.value)}>
      <option value="">-</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  ),
}));
vi.mock("@/lib/hooks/feats", () => ({ useFeats: () => ({ data: [{ id: "f1", name: "Меткий" }] }) }));

const mount = (onDone = vi.fn()) => {
  render(
    <>
      <CareerForm formId="career-form" campaignId="c" onDone={onDone} />
      <button type="submit" form="career-form">
        save
      </button>
    </>,
  );

  return onDone;
};

const fill = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

afterEach(() => {
  cleanup();
  mocks.save.mockReset();
});

describe("CareerForm", () => {
  it("renders four tiers and rejects an empty name or tier names without saving", async () => {
    mount();

    expect(screen.getAllByText(/^Рівень [1-4]$/)).toHaveLength(4);

    fireEvent.click(screen.getByText("save"));

    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(mocks.save).not.toHaveBeenCalled();

    fill("Назва*", "Воїн");
    fireEvent.click(screen.getByText("save"));

    expect((await screen.findByRole("alert")).textContent).toContain("кожного рівня");
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it("saves the typed career with a toggled characteristic and closes", async () => {
    mocks.save.mockResolvedValue(undefined);

    const onDone = mount();

    fill("Назва*", "Воїн");
    screen.getAllByLabelText("Назва рівня*").forEach((input, i) => fireEvent.change(input, { target: { value: `T${i + 1}` } }));
    fireEvent.click(screen.getAllByRole("button", { pressed: false })[0]);
    fireEvent.click(screen.getByText("save"));

    await waitFor(() => expect(onDone).toHaveBeenCalled());

    const saved = mocks.save.mock.calls[0][0] as CareerFormData;

    expect(saved.name).toBe("Воїн");
    expect(saved.tiers.map((t) => t.name)).toEqual(["T1", "T2", "T3", "T4"]);
    expect(saved.tiers[0].characteristics).toHaveLength(1);
  });

  it("picks a skill with a specialisation and a talent from the catalogs", async () => {
    mocks.save.mockResolvedValue(undefined);

    mount();

    fill("Назва*", "Воїн");
    screen.getAllByLabelText("Назва рівня*").forEach((input) => fireEvent.change(input, { target: { value: "T" } }));
    fireEvent.change(screen.getAllByLabelText("Навичка")[0], { target: { value: "melee" } });
    fireEvent.change(screen.getByLabelText("Спеціалізація"), { target: { value: "flail" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Додати" })[0]);
    fireEvent.change(screen.getAllByLabelText("Додати талант")[0], { target: { value: "f1" } });
    fireEvent.click(screen.getByText("save"));

    await waitFor(() => expect(mocks.save).toHaveBeenCalled());

    const saved = mocks.save.mock.calls[0][0] as CareerFormData;

    expect(saved.tiers[0].skills).toEqual(["melee:flail"]);
    expect(saved.tiers[0].talents).toEqual(["f1"]);
  });

  it("shows the server error and stays open", async () => {
    mocks.save.mockRejectedValue(new Error("Кар'єра з такою назвою вже є"));

    const onDone = mount();

    fill("Назва*", "Воїн");
    screen.getAllByLabelText("Назва рівня*").forEach((input) => fireEvent.change(input, { target: { value: "T" } }));
    fireEvent.click(screen.getByText("save"));

    expect((await screen.findByRole("alert")).textContent).toContain("вже є");
    expect(onDone).not.toHaveBeenCalled();
  });
});
