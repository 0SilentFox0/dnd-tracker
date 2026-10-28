// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { FeatForm } from "@/components/feats/FeatForm";
import type { FeatData } from "@/types/choices";

const mutate = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/lib/hooks/common", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/lib/hooks/common")>()), useNavigateFresh: () => vi.fn(), useNotify: () => vi.fn() }));
vi.mock("@/lib/hooks/feats/useFeats", () => ({ useUpdateFeat: () => ({ mutate, isPending: false }) }));
vi.mock("@/lib/hooks/abilities", () => ({ useAbilityValidity: () => ({ valid: true, errors: 0, setErrors: vi.fn() }) }));
vi.mock("@/components/abilities", () => ({ AbilityListEditor: () => <div data-testid="ability-editor" />, withAbilityErrors: (label: string) => label }));
vi.mock("@/components/choices/ChoiceListEditor", () => ({ ChoiceListEditor: ({ owner }: { owner: string }) => <div data-testid="choice-editor">{owner}</div> }));

const feat: FeatData = { id: "f1", name: "Grappler", icon: null, type: "general", prerequisite: { level: 4 }, repeatable: false, description: null, abilities: [], choices: [] };

describe("FeatForm", () => {
  afterEach(() => {
    cleanup();
    mutate.mockClear();
  });

  it("edits type, prerequisites and repeatable, then submits", () => {
    render(<FeatForm campaignId="c1" feat={feat} />);

    fireEvent.change(screen.getByLabelText("Тип риси"), { target: { value: "origin" } });
    fireEvent.change(screen.getByLabelText("Мінімальний рівень"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("checkbox", { name: "Повторювана" }));
    fireEvent.submit(document.getElementById("feat-form") as HTMLFormElement);

    expect(mutate.mock.calls[0][0]).toMatchObject({ featId: "f1", data: { type: "origin", prerequisite: {}, repeatable: true } });
  });

  it("choices tab uses the feat owner", () => {
    render(<FeatForm campaignId="c1" feat={feat} />);

    expect(screen.getByTestId("choice-editor").textContent).toBe("feat");
  });
});
