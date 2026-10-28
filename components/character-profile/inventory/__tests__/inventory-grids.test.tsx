// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { BackpackGrid } from "@/components/character-profile/inventory/BackpackGrid";
import { EquipmentGrid } from "@/components/character-profile/inventory/EquipmentGrid";
import { PurseBar } from "@/components/character-profile/inventory/PurseBar";
import { ARTIFACT_GRID_9 } from "@/lib/constants/artifacts";
import type { InventoryModel } from "@/lib/hooks/characters";
import type { BackpackCell } from "@/lib/utils/inventory/backpack";
import type { SheetArtifact } from "@/types/characters";

const armor = { id: "a1", name: "Кольчуга ельфів", icon: null, slot: "armor", rarity: "rare", description: null, effects: [] } as unknown as SheetArtifact;

const makeInv = (over: Partial<InventoryModel> = {}, cells: BackpackCell[] = []): InventoryModel => ({
  equipment: ARTIFACT_GRID_9.map((c) => ({ key: c.key, label: c.label, slotType: c.slotType, artifact: c.key === "armor" ? armor : null })),
  backpack: { cells, query: {} as never },
  purse: { gp: 5, sp: 0, cp: 3 },
  access: { canAct: true, isDM: false, pending: false },
  layout: { desktop: true },
  rules: { offHand: false },
  selection: { value: null, set: vi.fn() },
  drag: { value: null, set: vi.fn() },
  actions: { equip: vi.fn(), attune: vi.fn(), unequip: vi.fn(), drop: vi.fn(), use: vi.fn(), revoke: vi.fn(), remove: vi.fn() },
  isPending: false,
  ...over,
});

const ring = { id: "r1", name: "Перстень сили", icon: null, rarity: "epic", slot: "ring", description: null };

describe("EquipmentGrid", () => {
  afterEach(cleanup);

  it("9 клітинок у порядку сітки, силует і title", () => {
    render(<EquipmentGrid inv={makeInv()} />);

    const buttons = screen.getAllByRole("button");

    expect(buttons).toHaveLength(9);
    expect(buttons[1].getAttribute("aria-label")).toBe("Шолом, порожньо");
    expect(buttons[1].querySelector("svg")).toBeTruthy();
    expect(screen.getByLabelText("Броня: Кольчуга ельфів").getAttribute("title")).toBe("Кольчуга ельфів · Рідкісний");
  });

  it("підсвічує сумісний слот під час drag з рюкзака", () => {
    render(<EquipmentGrid inv={makeInv({ drag: { value: { from: "backpack", artifactId: "r1", slotType: "ring" }, set: vi.fn() } })} />);

    expect(screen.getByLabelText("Перстень, порожньо").getAttribute("data-drop")).toBe("accept");
    expect(screen.getByLabelText("Шолом, порожньо").getAttribute("data-drop")).toBe("dim");
  });

  it("drop на слот викликає actions.drop", () => {
    const inv = makeInv();

    render(<EquipmentGrid inv={inv} />);
    fireEvent.drop(screen.getByLabelText("Перстень, порожньо"));

    expect(inv.actions.drop).toHaveBeenCalledWith({ kind: "slot", slot: "ring1" });
  });

  it("dragStart на заповненому слоті ставить payload", () => {
    const inv = makeInv();

    render(<EquipmentGrid inv={inv} />);
    fireEvent.dragStart(screen.getByLabelText("Броня: Кольчуга ельфів"));

    expect(inv.drag.set).toHaveBeenCalledWith({ from: "slot", slot: "armor" });
  });

  it("без прав не draggable", () => {
    const inv = makeInv({ access: { canAct: false, isDM: false, pending: false } });

    render(<EquipmentGrid inv={inv} />);

    const cell = screen.getByLabelText("Броня: Кольчуга ельфів");

    expect(cell.getAttribute("draggable")).toBe("false");
    fireEvent.dragStart(cell);
    expect(inv.drag.set).not.toHaveBeenCalled();
  });
});

describe("BackpackGrid", () => {
  afterEach(cleanup);

  const cells: BackpackCell[] = [
    { kind: "artifact", key: "artifact-r1", artifact: ring },
    { kind: "item", key: "item-p1", item: { id: "p1", name: "Зілля", quantity: 2, consumable: false } },
    { kind: "empty", key: "empty-2" },
  ];

  it("предмети не draggable, бейдж кількості, клік по артефакту", () => {
    const inv = makeInv({}, cells);

    render(<BackpackGrid inv={inv} onAdd={vi.fn()} />);

    expect(screen.getByLabelText("Зілля").getAttribute("draggable")).toBe("false");
    expect(screen.getByLabelText("Перстень сили").getAttribute("draggable")).toBe("true");
    expect(screen.getByText("×2")).toBeTruthy();

    fireEvent.click(screen.getByLabelText("Перстень сили"));

    expect(inv.selection.set).toHaveBeenCalledWith({ kind: "artifact", id: "r1" });
  });

  it("клітинка add викликає onAdd; без неї кнопки немає", () => {
    const onAdd = vi.fn();

    const { unmount } = render(<BackpackGrid inv={makeInv({}, [...cells, { kind: "add", key: "add" }])} onAdd={onAdd} />);

    fireEvent.click(screen.getByLabelText("Додати"));
    expect(onAdd).toHaveBeenCalled();
    unmount();

    render(<BackpackGrid inv={makeInv({}, cells)} onAdd={onAdd} />);
    expect(screen.queryByLabelText("Додати")).toBeNull();
  });

  it("drop на рюкзак викликає actions.drop", () => {
    const inv = makeInv({}, cells);

    render(<BackpackGrid inv={inv} onAdd={vi.fn()} />);
    fireEvent.drop(screen.getByLabelText("Зілля"));

    expect(inv.actions.drop).toHaveBeenCalledWith({ kind: "backpack" });
  });
});

describe("PurseBar", () => {
  afterEach(cleanup);

  const purse = { gp: 5, sp: 0, cp: 3 };

  it("без прав — лише суми", () => {
    render(<PurseBar purse={purse} access={{ canAct: false, isDM: false, pending: false }} onMode={vi.fn()} />);

    expect(screen.getByText(/5/)).toBeTruthy();
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  it("гравець: витратити/отримати без «Задати суму»", () => {
    render(<PurseBar purse={purse} access={{ canAct: true, isDM: false, pending: false }} onMode={vi.fn()} />);

    expect(screen.getByLabelText("Витратити")).toBeTruthy();
    expect(screen.getByLabelText("Отримати")).toBeTruthy();
    expect(screen.queryByLabelText("Задати суму")).toBeNull();
  });

  it("DM: усі три, set → onMode", () => {
    const onMode = vi.fn();

    render(<PurseBar purse={purse} access={{ canAct: true, isDM: true, pending: false }} onMode={onMode} />);
    fireEvent.click(screen.getByLabelText("Задати суму"));

    expect(onMode).toHaveBeenCalledWith("set");
  });
});

describe("BackpackGrid new pills", () => {
  afterEach(cleanup);

  it("marks only the cells whose artifact id is in newIds", () => {
    const cells: BackpackCell[] = [
      { kind: "artifact", key: "k1", artifact: { id: "a1", name: "Перстень", icon: null, rarity: "epic", slot: "ring" } } as never,
      { kind: "artifact", key: "k2", artifact: { id: "a2", name: "Плащ", icon: null, rarity: "rare", slot: "cloak" } } as never,
    ];

    render(<BackpackGrid inv={makeInv({}, cells)} onAdd={vi.fn()} newIds={new Set(["a1"])} />);

    expect(screen.getAllByText("common.notifications.new")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Перстень" }).textContent).toContain("common.notifications.new");
    expect(screen.getByRole("button", { name: "Плащ" }).textContent).not.toContain("common.notifications.new");
  });
});
