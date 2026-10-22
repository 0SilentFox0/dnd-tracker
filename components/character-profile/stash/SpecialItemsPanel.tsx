"use client";

import { useState } from "react";

import { useProfile } from "../ProfileContext";
import { ItemDialog } from "./ItemDialog";

import { HudSection } from "@/components/hud/form";
import { HudPanel } from "@/components/hud/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useStashAction } from "@/lib/hooks/characters";
import { useConfirm, useNotify } from "@/lib/hooks/common";
import type { SpecialItem } from "@/types/inventory";

export function SpecialItemsPanel({ items, canAct }: { items: SpecialItem[]; canAct: boolean }) {
  const { campaignId, characterId } = useProfile();

  const action = useStashAction(campaignId, characterId);

  const confirm = useConfirm();

  const notify = useNotify();

  const [editing, setEditing] = useState<SpecialItem | "new" | null>(null);

  const run = (input: Parameters<typeof action.mutateAsync>[0]) =>
    action.mutateAsync(input).catch((e: Error) => notify(e.message || "Не вдалося виконати дію"));

  const remove = (item: SpecialItem) =>
    void confirm({ title: `Викинути «${item.name}»?`, confirmLabel: "Викинути", onConfirm: () => run({ action: "removeItem", itemId: item.id }) });

  return (
    <HudPanel>
      <HudSection title="ОСОБЛИВІ РЕЧІ" action={canAct && <Button size="sm" variant="outline" onClick={() => setEditing("new")}>Додати річ</Button>}>
        {items.length === 0 && <p className="text-sm text-hud-muted">Немає особливих речей.</p>}
        <ul className="space-y-2">
          {items.map((it) => (
            <li key={it.id} className="rounded-lg bg-[rgba(20,16,12,.85)] p-3 shadow-[inset_0_0_0_1px_rgba(230,194,90,.25)]">
              <div className="flex flex-wrap items-center gap-2">
                <span className="min-w-0 break-words text-sm text-hud-ink">{it.name}</span>
                <span className="text-xs text-hud-muted">×{it.quantity}</span>
                {it.consumable && <Badge variant="outline">одноразова</Badge>}
              </div>
              {it.description && <p className="mt-1 whitespace-pre-line break-words text-xs text-hud-muted">{it.description}</p>}
              {canAct && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {it.consumable && <Button size="sm" variant="outline" disabled={action.isPending} onClick={() => void run({ action: "useItem", itemId: it.id })}>Використати</Button>}
                  <Button size="sm" variant="outline" onClick={() => setEditing(it)}>Редагувати</Button>
                  <Button size="sm" variant="outline" onClick={() => remove(it)}>Видалити</Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </HudSection>
      {editing && <ItemDialog item={editing === "new" ? null : editing} open onOpenChange={(o) => !o && setEditing(null)} />}
    </HudPanel>
  );
}
