import { Button } from "@/components/ui/button";
import { artifactRarityLabel, ArtifactSlot, artifactSlotLabel } from "@/lib/constants/artifacts";
import type { InventoryModel, InventorySelection } from "@/lib/hooks/characters";
import type { SpecialItem } from "@/types/inventory";

export type TransferTarget = { artifact: { id: string; name: string; slot: string }; source: { slot: string } | { artifactId: string } };

interface ItemDetailsProps {
  inv: InventoryModel;
  on: { transfer: (t: TransferTarget) => void; edit: (item: SpecialItem) => void };
}

export const selectionTitle = (s: InventorySelection): string => (s.kind === "item" ? s.item.name : s.artifact.name);

export function ItemBody({ selection, withTitle = true }: { selection: InventorySelection | null; withTitle?: boolean }) {
  if (!selection) return <p className="text-sm text-hud-muted">Вибери предмет, щоб побачити деталі</p>;

  if (selection.kind === "item") {
    const { item } = selection;

    return (
      <div className="space-y-1.5">
        {withTitle && <h3 className="hud-sc text-lg text-hud-ink">{item.name}</h3>}
        <p className="text-xs text-hud-muted">
          Кількість: {item.quantity}
          {item.consumable && " · одноразова"}
        </p>
        {item.description && <p className="whitespace-pre-line break-words text-sm text-hud-ink">{item.description}</p>}
      </div>
    );
  }

  const { artifact } = selection;

  const slot = selection.kind === "equipped" ? selection.label : artifactSlotLabel(artifact.slot);

  const effects = selection.kind === "equipped" ? selection.artifact.effects : [];

  return (
    <div className="space-y-1.5">
      {withTitle && <h3 className="hud-sc text-lg text-hud-ink">{artifact.name}</h3>}
      <p className="text-xs text-hud-muted">{[artifact.rarity ? artifactRarityLabel(artifact.rarity) : null, slot].filter(Boolean).join(" · ")}</p>
      {artifact.description && <p className="whitespace-pre-line break-words text-sm text-hud-ink">{artifact.description}</p>}
      {effects.length > 0 && (
        <ul className="list-disc pl-5 text-sm text-hud-ink">
          {effects.map((e, i) => (
            <li key={`${i}-${e}`}>{e}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ItemActions({ inv, on }: ItemDetailsProps) {
  const { value } = inv.selection;

  if (!value || !inv.access.canAct) return null;

  const btn = (label: string, onClick: () => void) => (
    <Button key={label} size="sm" variant="outline" disabled={inv.isPending} onClick={onClick}>
      {label}
    </Button>
  );

  const buttons =
    value.kind === "backpack"
      ? [
          value.artifact.slot !== ArtifactSlot.ITEM && btn("Вдягнути", () => void inv.actions.equip(value.artifact.id)),
          btn("Передати", () => on.transfer({ artifact: value.artifact, source: { artifactId: value.artifact.id } })),
          inv.access.isDM && btn("Забрати", () => inv.actions.revoke(value.artifact)),
        ]
      : value.kind === "equipped"
        ? [btn("Зняти", () => void inv.actions.unequip(value.slot)), btn("Передати", () => on.transfer({ artifact: value.artifact, source: { slot: value.slot } }))]
        : [
            value.item.consumable && btn("Використати", () => void inv.actions.use(value.item.id)),
            btn("Редагувати", () => on.edit(value.item)),
            btn("Видалити", () => inv.actions.remove(value.item)),
          ];

  return <div className="flex flex-wrap gap-2">{buttons}</div>;
}

export function ItemDetails({ inv, on }: ItemDetailsProps) {
  return (
    <div className="space-y-3">
      <ItemBody selection={inv.selection.value} />
      <ItemActions inv={inv} on={on} />
    </div>
  );
}
