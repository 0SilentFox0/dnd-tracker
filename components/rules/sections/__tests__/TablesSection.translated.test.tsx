// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TablesSection } from "../TablesSection";

import "@/components/ui/__tests__/match-media";
import { DEFAULT_RULES } from "@/lib/utils/rules";

vi.mock("@/lib/i18n/use-translator", () => ({
  useTranslator: (ns?: string) => (key: string) => (ns ? `${ns}.${key}` : `T:${key}`),
}));

afterEach(cleanup);

describe("TablesSection with loaded battleWfrp", () => {
  it("customize copies the translated default text", () => {
    const set = vi.fn();

    render(<TablesSection form={{ campaignId: "c", data: { ...DEFAULT_RULES, tables: {} }, set } as unknown as Parameters<typeof TablesSection>[0]["form"]} />);

    fireEvent.click(screen.getByRole("button", { name: "wfrpTables.customize" }));

    expect(set.mock.calls.at(-1)?.[1].critHead[0]).toEqual({ max: 20, effects: [{ type: "damage", amount: 1 }], text: "T:battleWfrp.crit.head.1" });
  });
});
