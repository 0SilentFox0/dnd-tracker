"use client";

import { useState } from "react";

import { useProfile } from "../ProfileContext";

import { EntityIcon } from "@/components/common/EntityIcon";
import { EmptyState } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { artifactRarityLabel, artifactSlotLabel, ITEM_LIMITS } from "@/lib/constants/artifacts";
import { useFreeArtifacts, useStashAction } from "@/lib/hooks/characters";
import { useNotify } from "@/lib/hooks/common";
import { composedName } from "@/lib/utils/items/compose";
import type { FreeArtifact } from "@/types/inventory";

const [MIN_QTY, MAX_QTY] = ITEM_LIMITS.grantQuantity;

interface GrantArtifactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ROW = "flex min-h-11 w-full items-center gap-3 border-b border-[#2a2218] py-2 text-left disabled:opacity-50";

function ArtifactRow({ a, subtitle, disabled, onClick }: { a: FreeArtifact; subtitle: string; disabled: boolean; onClick: () => void }) {
  return (
    <li>
      <button type="button" disabled={disabled} onClick={onClick} className={ROW}>
        <span aria-hidden="true"><EntityIcon src={a.icon} name={a.name} size={36} className="hud-sc size-9 rounded-md border border-hud-line bg-transparent text-inherit" /></span>
        <span className="min-w-0">
          <span className="block truncate text-sm text-hud-ink">{a.name}</span>
          <span className="block text-xs text-hud-muted">{subtitle}</span>
        </span>
      </button>
    </li>
  );
}

export function GrantArtifactDialog({ open, onOpenChange }: GrantArtifactDialogProps) {
  const { campaignId, characterId } = useProfile();

  const action = useStashAction(campaignId, characterId);

  const free = useFreeArtifacts(campaignId, characterId, open);

  const artifacts = free.data ?? [];

  const notify = useNotify();

  const [picked, setPicked] = useState<FreeArtifact | null>(null);

  const [query, setQuery] = useState("");

  const [quantity, setQuantity] = useState("1");

  const [baseId, setBaseId] = useState("");

  const [parameter, setParameter] = useState("");

  const [spellId, setSpellId] = useState("");

  const close = (o: boolean) => {
    if (!o) {
      setPicked(null);
      setQuery("");
      setQuantity("1");
      setBaseId("");
      setParameter("");
      setSpellId("");
    }

    onOpenChange(o);
  };

  const grant = (body: { artifactId: string; baseId?: string; quantity?: number; parameter?: string; spellId?: string }) =>
    action.mutateAsync({ action: "grant", ...body }).then(
      () => close(false),
      (e: Error) => notify(e.message || "Не вдалося видати артефакт"),
    );

  const pick = (a: FreeArtifact) => (a.property || a.consumable || a.parameter ? setPicked(a) : void grant({ artifactId: a.id }));

  const kindLabel = (a: FreeArtifact) => (a.property ? "властивість" : a.consumable ? "витратний" : a.gear ? "спорядження" : null);

  const subtitle = (a: FreeArtifact) => [artifactSlotLabel(a.slot), kindLabel(a)].filter(Boolean).join(" · ");

  const property = picked?.property;

  const bases = property ? artifacts.filter((b) => property.bases.includes(b.id) && b.name.toLowerCase().includes(query.trim().toLowerCase())) : [];

  const selectedBase = artifacts.find((b) => b.id === baseId);

  const parameterOptions = picked?.parameter?.options ?? selectedBase?.parameter?.options ?? [];

  const parameterRequired = parameterOptions.length > 0;

  const spellOptions = picked?.spells ?? [];

  const qty = Math.min(MAX_QTY, Math.max(MIN_QTY, Math.trunc(Number(quantity)) || 1));

  return (
    <ResponsiveDialog hud open={open} onOpenChange={close} title={picked?.property ? `База для «${picked.name}»` : "Видати артефакт"}>
      {free.isLoading ? (
        <p className="text-sm text-hud-muted">Завантаження…</p>
      ) : picked && (property || picked.consumable || picked.parameter) ? (
        <div className="space-y-2">
          {property && <>
            <Label htmlFor="grant-base-search" className="sr-only">Пошук бази</Label>
            <Input id="grant-base-search" placeholder="Пошук бази" value={query} onChange={(e) => setQuery(e.target.value)} />
            {bases.length === 0 ? <EmptyState title="Немає підхожих вільних баз" /> : <ul>
              {bases.map((b) => <ArtifactRow key={b.id} a={b} subtitle={`${composedName(b, picked, property.nameTemplate)} · ${artifactRarityLabel(picked.rarity ?? "")}`} disabled={action.isPending} onClick={() => setBaseId(b.id)} />)}
            </ul>}
          </>}
          <p className="text-sm text-hud-ink">{property && selectedBase ? composedName(selectedBase, picked, property.nameTemplate) : picked.name}</p>
          {parameterRequired && <>
            <Label htmlFor="grant-parameter">{parameterOptions.length ? "Параметр предмета" : "Параметр"}</Label>
            <select id="grant-parameter" className="h-11 w-full rounded-md border border-hud-line bg-transparent px-3 text-hud-ink" value={parameter} onChange={(e) => setParameter(e.target.value)}>
              <option value="">Оберіть параметр</option>
              {parameterOptions.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
            </select>
          </>}
          {picked?.consumable && <>
            {spellOptions.length > 0 && <>
              <Label htmlFor="grant-spell">Заклинання сувою</Label>
              <select id="grant-spell" className="h-11 w-full rounded-md border border-hud-line bg-transparent px-3 text-hud-ink" value={spellId} onChange={(e) => setSpellId(e.target.value)}>
                <option value="">Оберіть заклинання</option>
                {spellOptions.map((spell) => <option key={spell.spellId} value={spell.spellId}>{spell.label}{spell.castLevel !== undefined ? ` · коло ${spell.castLevel}` : ""}</option>)}
              </select>
              <p className="text-xs text-hud-muted">Каст автоматизовано; право читати сувій визначає ДМ.</p>
            </>}
            <Label htmlFor="grant-quantity">Кількість</Label>
            <Input id="grant-quantity" type="number" min={MIN_QTY} max={MAX_QTY} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </>}
          <div className="flex gap-2">
            <Button type="button" disabled={action.isPending || (property !== undefined && !baseId) || (parameterRequired && !parameter) || (spellOptions.length > 0 && !spellId)} onClick={() => void grant({ artifactId: picked.id, ...(baseId && { baseId }), ...(picked.consumable && { quantity: qty }), ...(parameter && { parameter }), ...(spellId && { spellId }) })}>Видати</Button>
            <Button type="button" variant="ghost" onClick={() => setPicked(null)}>Назад</Button>
          </div>
        </div>
      ) : artifacts.length === 0 ? (
        <EmptyState title="Немає вільних артефактів" />
      ) : (
        <ul>
          {artifacts.map((a) => (
            <ArtifactRow key={a.id} a={a} subtitle={subtitle(a)} disabled={action.isPending} onClick={() => pick(a)} />
          ))}
        </ul>
      )}
    </ResponsiveDialog>
  );
}
