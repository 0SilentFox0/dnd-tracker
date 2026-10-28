// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ItemsSection } from "../sections/ItemsSection";

import type { RulesFormState } from "@/lib/hooks/campaigns";
import { DEFAULT_RULES, type Ruleset } from "@/lib/utils/rules";

const formOf = (data: Ruleset) => ({ data, set: vi.fn() }) as unknown as RulesFormState & { set: ReturnType<typeof vi.fn> };

afterEach(cleanup);

describe("ItemsSection", () => {
  it("перемикач пише лише секцію items", () => {
    const form = formOf(DEFAULT_RULES);

    render(<ItemsSection form={form} />);

    fireEvent.click(screen.getByRole("switch", { name: "Предмети 5e: налаштування, носіння зі сховища, витратні в бою" }));

    expect(form.set).toHaveBeenCalledWith("items", { enabled: true, attunementLimit: 3 });
  });
});
