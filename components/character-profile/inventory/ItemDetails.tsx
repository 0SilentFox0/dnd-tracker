import { useTranslations } from "next-intl";

import { useAbilityText } from "@/components/abilities";
import { Button } from "@/components/ui/button";
import { ArtifactSlot } from "@/lib/constants/artifacts";
import type { InventoryModel, InventorySelection } from "@/lib/hooks/characters";
import { useTranslator } from "@/lib/i18n/use-translator";
import type { SpecialItem } from "@/types/inventory";

export type TransferTarget = { artifact: { id: string; name: string; slot: string }; source: { slot: string } | { artifactId: string } };

interface ItemDetailsProps {
  inv: InventoryModel;
  on: { transfer: (t: TransferTarget) => void; edit: (item: SpecialItem) => void };
}

export const selectionTitle = (s: InventorySelection): string => (s.kind === "item" ? s.item.name : s.artifact.name);

export function ItemBody({ selection, withTitle = true }: { selection: InventorySelection | null; withTitle?: boolean }) {
  const t = useTranslator();

  const abilityText = useAbilityText();

  if (!selection) return <p className="text-sm text-hud-muted">{t("inventory.details.empty")}</p>;

  if (selection.kind === "item") {
    const { item } = selection;

    return (
      <div className="space-y-1.5">
        {withTitle && <h3 className="hud-sc text-lg text-hud-ink">{item.name}</h3>}
        <p className="text-xs text-hud-muted">
          {t("inventory.details.quantity", { count: item.quantity })}
          {item.consumable && ` · ${t("inventory.details.consumable")}`}
        </p>
        {item.description && <p className="whitespace-pre-line break-words text-sm text-hud-ink">{item.description}</p>}
      </div>
    );
  }

  const { artifact } = selection;

  const flags = [artifact.carried && t("inventory.details.carried"), artifact.attunement === "attuned" && t("inventory.details.attuned"), artifact.attunement === "required" && t("inventory.details.attunementRequired"), "charges" in artifact && artifact.charges && t("inventory.details.charges", { left: artifact.charges.left, max: artifact.charges.max })].filter(Boolean);

  const slot = selection.kind === "equipped" ? t(`inventory.grid.slots.${selection.slot}`) : t(`artifacts.slots.${artifact.slot}`);

  const effects = selection.kind === "equipped" ? abilityText.flows(selection.artifact.effects) : [];

  return (
    <div className="space-y-1.5">
      {withTitle && <h3 className="hud-sc text-lg text-hud-ink">{artifact.name}</h3>}
      <p className="text-xs text-hud-muted">{[artifact.rarity ? t(`artifacts.rarity.${artifact.rarity}`) : null, slot].filter(Boolean).join(" · ")}</p>
      {flags.length > 0 && (
        <p className="flex flex-wrap gap-x-2 text-xs text-hud-muted">
          {flags.map((f) => (
            <span key={String(f)}>{f}</span>
          ))}
        </p>
      )}
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
  const t = useTranslations("inventory.actions");

  const tc = useTranslations("common.actions");

  const { value } = inv.selection;

  if (!value || !inv.access.canAct) return null;

  const btn = (label: string, onClick: () => void) => (
    <Button key={label} size="sm" variant="outline" disabled={inv.isPending} onClick={onClick}>
      {label}
    </Button>
  );

  const attuneButtons = (a: { id: string; attunement?: "attuned" | "required" }) => [
    a.attunement === "required" && btn(t("attune"), () => void inv.actions.attune(a.id, true)),
    a.attunement === "attuned" && btn(t("unattune"), () => void inv.actions.attune(a.id, false)),
  ];

  const buttons =
    value.kind === "backpack"
      ? [
          value.artifact.slot !== ArtifactSlot.ITEM && btn(t("equip"), () => void inv.actions.equip(value.artifact.id)),
          inv.rules.offHand && value.artifact.light && btn(t("offHand"), () => void inv.actions.equip(value.artifact.id, "shield")),
          ...attuneButtons(value.artifact),
          btn(t("transfer"), () => on.transfer({ artifact: value.artifact, source: { artifactId: value.artifact.id } })),
          inv.access.isDM && btn(t("revoke"), () => inv.actions.revoke(value.artifact)),
        ]
      : value.kind === "equipped"
        ? [
            !value.artifact.carried && btn(t("unequip"), () => void inv.actions.unequip(value.slot)),
            ...attuneButtons(value.artifact),
            btn(t("transfer"), () => on.transfer({ artifact: value.artifact, source: value.artifact.carried ? { artifactId: value.artifact.id } : { slot: value.slot } })),
          ]
        : [
            value.item.consumable && btn(t("use"), () => void inv.actions.use(value.item.id)),
            btn(tc("edit"), () => on.edit(value.item)),
            btn(tc("delete"), () => inv.actions.remove(value.item)),
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
