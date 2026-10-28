"use client";

import { useProfile } from "../ProfileContext";

import { EntityIcon } from "@/components/common/EntityIcon";
import { EmptyState, LoadingState } from "@/components/common/states";
import { HUD_SELECT_CLASS } from "@/components/hud/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { artifactRarityLabel, artifactSlotLabel, ITEM_LIMITS } from "@/lib/constants/artifacts";
import { useGrantArtifactForm } from "@/lib/hooks/characters";
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

  const form = useGrantArtifactForm({ campaignId, characterId, open, onOpenChange });

  const { picked, artifacts, selectedBase, actions, fields } = form;

  const property = picked?.property;

  const kindLabel = (a: FreeArtifact) => (a.property ? "властивість" : a.consumable ? "витратний" : a.gear ? "спорядження" : null);

  const subtitle = (a: FreeArtifact) => [artifactSlotLabel(a.slot), kindLabel(a)].filter(Boolean).join(" · ");

  return (
    <ResponsiveDialog
      hud
      open={open}
      onOpenChange={actions.close}
      title={picked?.property ? `База для «${picked.name}»` : "Видати артефакт"}
      footer={
        form.detail && !form.isLoading ? (
          <>
            <Button type="button" variant="ghost" onClick={actions.back}>Назад</Button>
            <Button type="button" disabled={!form.canGrant} onClick={actions.submit}>Видати</Button>
          </>
        ) : undefined
      }
    >
      {form.isLoading ? (
        <LoadingState rows={3} />
      ) : picked && form.detail ? (
        <div className="space-y-2">
          {property && <>
            <Label htmlFor="grant-base-search" className="sr-only">Пошук бази</Label>
            <Input id="grant-base-search" placeholder="Пошук бази" value={fields.query} onChange={(e) => actions.setQuery(e.target.value)} />
            {form.bases.length === 0 ? <EmptyState title="Немає підхожих вільних баз" /> : <ul>
              {form.bases.map((b) => <ArtifactRow key={b.id} a={b} subtitle={`${composedName(b, picked, property.nameTemplate)} · ${artifactRarityLabel(picked.rarity ?? "")}`} disabled={form.isPending} onClick={() => actions.setBaseId(b.id)} />)}
            </ul>}
          </>}
          <p className="text-sm text-hud-ink">{property && selectedBase ? composedName(selectedBase, picked, property.nameTemplate) : picked.name}</p>
          {form.parameterRequired && <>
            <Label htmlFor="grant-parameter">Параметр предмета</Label>
            <select id="grant-parameter" className={`${HUD_SELECT_CLASS} w-full`} value={fields.parameter} onChange={(e) => actions.setParameter(e.target.value)}>
              <option value="">Оберіть параметр</option>
              {form.parameterOptions.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
            </select>
          </>}
          {picked.consumable && <>
            {form.spellOptions.length > 0 && <>
              <Label htmlFor="grant-spell">Заклинання сувою</Label>
              <select id="grant-spell" className={`${HUD_SELECT_CLASS} w-full`} value={fields.spellId} onChange={(e) => actions.setSpellId(e.target.value)}>
                <option value="">Оберіть заклинання</option>
                {form.spellOptions.map((spell) => <option key={spell.spellId} value={spell.spellId}>{spell.label}{spell.castLevel !== undefined ? ` · коло ${spell.castLevel}` : ""}</option>)}
              </select>
              <p className="text-xs text-hud-muted">Каст автоматизовано; право читати сувій визначає ДМ.</p>
            </>}
            <Label htmlFor="grant-quantity">Кількість</Label>
            <Input id="grant-quantity" type="number" min={MIN_QTY} max={MAX_QTY} value={fields.quantity} onChange={(e) => actions.setQuantity(e.target.value)} />
          </>}
        </div>
      ) : artifacts.length === 0 ? (
        <EmptyState title="Немає вільних артефактів" />
      ) : (
        <ul>
          {artifacts.map((a) => (
            <ArtifactRow key={a.id} a={a} subtitle={subtitle(a)} disabled={form.isPending} onClick={() => actions.pick(a)} />
          ))}
        </ul>
      )}
    </ResponsiveDialog>
  );
}
