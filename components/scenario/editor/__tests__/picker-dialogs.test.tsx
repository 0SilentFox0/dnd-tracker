// @vitest-environment happy-dom
import { cleanup, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { BattlePickerDialog } from "../BattlePickerDialog";
import { SlidePickerDialog } from "../SlidePickerDialog";

import { render } from "@/components/ui/__tests__/uk-intl";

vi.unmock("next-intl");

const decks = vi.hoisted(() => ({ list: { data: undefined as unknown, isLoading: false }, one: { data: undefined as unknown, isLoading: false } }));

const briefs = vi.hoisted(() => ({ data: undefined as unknown, isLoading: false }));

vi.mock("@/components/ui/responsive-dialog", () => ({ ResponsiveDialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock("@/components/common/OptimizedImage", () => ({ OptimizedImage: () => null }));
vi.mock("@/lib/hooks/show", () => ({ useDecks: () => decks.list, useDeck: () => decks.one }));
vi.mock("@/lib/hooks/battles", () => ({ useBattleBriefs: () => briefs }));

beforeEach(() => {
  decks.list = { data: undefined, isLoading: false };
  decks.one = { data: undefined, isLoading: false };
  briefs.data = undefined;
  briefs.isLoading = false;
});
afterEach(cleanup);

const slideProps = { campaignId: "c", pageId: "p", open: true, onOpenChange: vi.fn(), onPick: vi.fn() };

describe("SlidePickerDialog", () => {
  it("під час завантаження показує LoadingState, не порожній стан", () => {
    decks.list = { data: undefined, isLoading: true };
    render(<SlidePickerDialog {...slideProps} />);

    expect(screen.getByRole("status")).toBeTruthy();
    expect(screen.queryByText("Немає наборів слайдів")).toBeNull();
  });

  it("порожній стан, коли завантажено і наборів немає", () => {
    decks.list = { data: [], isLoading: false };
    render(<SlidePickerDialog {...slideProps} />);

    expect(screen.getByText("Немає наборів слайдів")).toBeTruthy();
  });

  it("сітка слайдів показує LoadingState, поки набір вантажиться", () => {
    decks.list = { data: [{ id: "d", title: "Набір", scenarioPageId: "p" }], isLoading: false };
    decks.one = { data: undefined, isLoading: true };
    render(<SlidePickerDialog {...slideProps} />);

    expect(screen.getByRole("status")).toBeTruthy();
  });
});

describe("BattlePickerDialog", () => {
  const props = { campaignId: "c", open: true, onOpenChange: vi.fn(), onPick: vi.fn() };

  it("під час завантаження показує LoadingState, не порожній стан", () => {
    briefs.isLoading = true;
    render(<BattlePickerDialog {...props} />);

    expect(screen.getByRole("status")).toBeTruthy();
    expect(screen.queryByText("Немає боїв")).toBeNull();
  });

  it("порожній стан, коли завантажено і боїв немає", () => {
    briefs.data = [];
    render(<BattlePickerDialog {...props} />);

    expect(screen.getByText("Немає боїв")).toBeTruthy();
  });
});
