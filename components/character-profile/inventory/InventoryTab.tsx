"use client";

import { useState } from "react";

import { useProfile } from "../ProfileContext";
import { SetList } from "../SetList";
import { GrantArtifactDialog } from "../stash/GrantArtifactDialog";
import { InventoryLogPanel } from "../stash/InventoryLogPanel";
import { ItemDialog } from "../stash/ItemDialog";
import { MoneyDialog, type MoneyMode } from "../stash/MoneyDialog";
import { TransferArtifactDialog } from "../TransferArtifactDialog";
import { AddMenu } from "./AddMenu";
import { BackpackGrid } from "./BackpackGrid";
import { EquipmentGrid } from "./EquipmentGrid";
import { ItemActions, ItemBody, ItemDetails, selectionTitle, type TransferTarget } from "./ItemDetails";
import { PurseBar } from "./PurseBar";

import { EmptyState, QueryState } from "@/components/common/states";
import { HudPanel } from "@/components/hud/page";
import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { useInventory } from "@/lib/hooks/characters";
import type { SpecialItem } from "@/types/inventory";

export function InventoryTab() {
  const { campaignId, characterId, sheet } = useProfile();

  const inv = useInventory(campaignId, characterId, sheet);

  const [transfer, setTransfer] = useState<TransferTarget | null>(null);

  const [editing, setEditing] = useState<SpecialItem | "new" | null>(null);

  const [money, setMoney] = useState<MoneyMode | null>(null);

  const [grantOpen, setGrantOpen] = useState(false);

  const [addOpen, setAddOpen] = useState(false);

  const [logOpen, setLogOpen] = useState(false);

  const on = {
    transfer: (t: TransferTarget) => {
      inv.selection.set(null);
      setTransfer(t);
    },
    edit: (item: SpecialItem) => {
      inv.selection.set(null);
      setEditing(item);
    },
  };

  const onAdd = () => (inv.access.isDM ? setAddOpen(true) : setEditing("new"));

  const selected = inv.selection.value;

  const { desktop } = inv.layout;

  return (
    <div className="space-y-4">
      <div className="gap-4 lg:grid lg:grid-cols-[auto_1fr]">
        <div className="space-y-3">
          <EquipmentGrid inv={inv} />
          {inv.access.pending ? (
            <EmptyState title="Підсумок з'явиться після схвалення персонажа" />
          ) : (
            inv.backpack && (
              <QueryState query={inv.backpack.query}>
                {(view) => (
                  <>
                    <PurseBar purse={view.purse} access={inv.access} onMode={setMoney} />
                    <BackpackGrid inv={inv} onAdd={onAdd} />
                    <p className="text-xs text-hud-muted">Зміни під час бою діють з наступного бою.</p>
                  </>
                )}
              </QueryState>
            )
          )}
        </div>
        {desktop && (
          <HudPanel className="sticky top-4 self-start">
            <ItemDetails inv={inv} on={on} />
          </HudPanel>
        )}
      </div>
      <SetList sets={sheet.items.sets} />
      {!inv.access.pending && (
        <div className="space-y-2">
          <Button variant="outline" size="sm" aria-expanded={logOpen} onClick={() => setLogOpen((o) => !o)}>
            Журнал {logOpen ? "▾" : "▸"}
          </Button>
          {logOpen && <InventoryLogPanel />}
        </div>
      )}
      <ResponsiveDialog
        hud
        open={!desktop && !!selected}
        onOpenChange={(o) => !o && inv.selection.set(null)}
        title={selected ? selectionTitle(selected) : ""}
        footer={<ItemActions inv={inv} on={on} />}
      >
        <ItemBody selection={selected} withTitle={false} />
      </ResponsiveDialog>
      <AddMenu
        open={addOpen}
        onOpenChange={setAddOpen}
        isDM={inv.access.isDM}
        on={{
          grant: () => {
            setAddOpen(false);
            setGrantOpen(true);
          },
          item: () => {
            setAddOpen(false);
            setEditing("new");
          },
        }}
      />
      {grantOpen && <GrantArtifactDialog open onOpenChange={setGrantOpen} />}
      {editing && <ItemDialog item={editing === "new" ? null : editing} open onOpenChange={(o) => !o && setEditing(null)} />}
      {money && inv.purse && <MoneyDialog mode={money} purse={inv.purse} open onOpenChange={(o) => !o && setMoney(null)} />}
      {transfer && <TransferArtifactDialog artifact={transfer.artifact} source={transfer.source} open onOpenChange={(o) => !o && setTransfer(null)} />}
    </div>
  );
}
