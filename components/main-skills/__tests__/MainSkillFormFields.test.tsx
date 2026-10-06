// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MainSkillFormFields } from "@/components/main-skills/MainSkillFormFields";

const form = { name: "Магія", color: "#112233", icon: "", isEnableInSkillTree: false, spellGroupId: null };

describe("MainSkillFormFields", () => {
  afterEach(cleanup);

  it("кожне поле шле лише свою зміну; іконка з фолбеком на літеру назви", () => {
    const onChange = vi.fn();

    render(<MainSkillFormFields form={form} onChange={onChange} spellGroups={[]} />);

    fireEvent.change(screen.getByLabelText(/Назва/), { target: { value: "Напад" } });
    fireEvent.change(screen.getByLabelText("Колір (hex)"), { target: { value: "#ff0000" } });
    fireEvent.change(screen.getByLabelText("Іконка (URL)"), { target: { value: "https://example.com/i.png" } });

    expect(onChange.mock.calls).toEqual([[{ name: "Напад" }], [{ color: "#ff0000" }], [{ icon: "https://example.com/i.png" }]]);
    expect(screen.getByText("М")).toBeTruthy();
  });

  it("без груп заклинань — без поля школи", () => {
    render(<MainSkillFormFields form={form} onChange={vi.fn()} spellGroups={[]} />);

    expect(screen.queryByText("Група заклинань (школа магії)")).toBeNull();
  });

  it("з групами — поле школи", () => {
    render(<MainSkillFormFields form={form} onChange={vi.fn()} spellGroups={[{ id: "g1", name: "Вогонь" }]} />);

    expect(screen.getByText("Група заклинань (школа магії)")).toBeTruthy();
  });
});
