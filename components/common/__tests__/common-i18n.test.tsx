// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AbbreviationsInfoDialog } from "@/components/common/AbbreviationsInfoDialog";
import { ColorField } from "@/components/common/ColorField";
import { ColorSwatch } from "@/components/common/ColorSwatch";
import { ImportDialog } from "@/components/common/ImportDialog";
import { MonsterStatblock } from "@/components/common/MonsterStatblock";
import { RenameGroupDialog } from "@/components/common/RenameGroupDialog";
import { SearchEmptyState } from "@/components/common/SearchEmptyState";
import { SearchInput } from "@/components/common/SearchInput";
import { WeaponTraitsField } from "@/components/common/WeaponTraitsField";

afterEach(cleanup);

const hook = (over: Record<string, unknown> = {}) =>
  ({
    file: null,
    status: { error: null, success: null, isLoading: false, ...over },
    actions: { handleFileChange: vi.fn(), handleImport: vi.fn(), reset: vi.fn() },
  }) as never;

describe("common components use translation keys", () => {
  it("ImportDialog defaults", () => {
    render(<ImportDialog importHook={hook()} open />);

    expect(screen.getByText("common.import.title")).toBeTruthy();
    expect(screen.getByText("common.import.description")).toBeTruthy();
    expect(screen.getByText("common.import.fileLabel")).toBeTruthy();
    expect(screen.getByText("common.actions.cancel")).toBeTruthy();
    expect(screen.getByText("common.import.submit")).toBeTruthy();
  });

  it("ImportDialog success summary", () => {
    render(<ImportDialog importHook={hook({ success: { imported: 2, total: 3, skipped: 1 } })} open />);

    expect(screen.getByText(/common\.import\.result/)).toBeTruthy();
    expect(screen.getByText(/common\.import\.skipped/)).toBeTruthy();
  });

  it("RenameGroupDialog", () => {
    render(<RenameGroupDialog groupName="G" dialog={{ open: true, onOpenChange: vi.fn() }} rename={{ value: "", onChange: vi.fn(), onConfirm: vi.fn(), onCancel: vi.fn(), isPending: false }} />);

    expect(screen.getByText("common.renameGroup.title")).toBeTruthy();
    expect(screen.getByText(/common\.renameGroup\.description/)).toBeTruthy();
    expect(screen.getByText("common.actions.save")).toBeTruthy();
    expect(screen.getByPlaceholderText("common.renameGroup.placeholder")).toBeTruthy();
  });

  it("AbbreviationsInfoDialog", () => {
    render(<AbbreviationsInfoDialog />);

    expect(screen.getByText("gameTerms.abbreviations.srOnly")).toBeTruthy();
  });

  it("WeaponTraitsField", () => {
    render(<WeaponTraitsField idPrefix="w" value={{ traits: ["versatile"] }} onChange={vi.fn()} />);

    expect(screen.getByText("gameTerms.weaponTraits.label")).toBeTruthy();
    expect(screen.getByText("gameTerms.weaponTraits.versatileDice")).toBeTruthy();
  });

  it("ColorField and ColorSwatch", () => {
    const { container } = render(
      <>
        <ColorField id="c" label="L" value="#fff000" onChange={vi.fn()} />
        <ColorSwatch color="#fff000" onChange={vi.fn()} label="x" />
      </>,
    );

    expect(container.querySelector('[title="common.color.format"]')).toBeTruthy();
    expect(container.querySelector('[title="common.color.pick"]')).toBeTruthy();
  });

  it("MonsterStatblock labels", () => {
    render(<MonsterStatblock block={{ languages: "x", telepathy: 30, movement: { hover: true, fly: 30 }, senses: { passivePerception: 12 } } as never} />);

    expect(screen.getByText(/gameTerms\.monster\.languages/)).toBeTruthy();
    expect(screen.getByText(/gameTerms\.monster\.telepathy/)).toBeTruthy();
    expect(screen.getByText(/gameTerms\.monster\.passivePerception/)).toBeTruthy();
    expect(screen.getByText(/gameTerms\.monster\.hover/)).toBeTruthy();
  });

  it("SearchEmptyState and SearchInput", () => {
    render(
      <>
        <SearchEmptyState query="q" onClear={vi.fn()} />
        <SearchInput value="a" onChange={vi.fn()} label="l" />
      </>,
    );

    expect(screen.getByText(/common\.search\.noResults/)).toBeTruthy();
    expect(screen.getByText("common.search.clear")).toBeTruthy();
    expect(screen.getByLabelText("common.search.clear")).toBeTruthy();
    expect(screen.getByPlaceholderText("common.search.placeholder")).toBeTruthy();
  });
});
