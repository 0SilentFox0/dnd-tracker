"use client";

import { useState } from "react";

import { useFreeArtifacts, useStashAction } from "./useStash";

import { ITEM_LIMITS } from "@/lib/constants/artifacts";
import { useNotify } from "@/lib/hooks/common";
import type { FreeArtifact } from "@/types/inventory";

const [MIN_QTY, MAX_QTY] = ITEM_LIMITS.grantQuantity;

const NO_ARTIFACTS: FreeArtifact[] = [];

interface GrantBody {
  artifactId: string;
  baseId?: string;
  quantity?: number;
  parameter?: string;
  spellId?: string;
}

export const clampGrantQuantity = (raw: string) => Math.min(MAX_QTY, Math.max(MIN_QTY, Math.trunc(Number(raw)) || 1));

export function useGrantArtifactForm({ campaignId, characterId, open, onOpenChange }: { campaignId: string; characterId: string; open: boolean; onOpenChange: (open: boolean) => void }) {
  const action = useStashAction(campaignId, characterId);

  const free = useFreeArtifacts(campaignId, characterId, open);

  const artifacts = free.data ?? NO_ARTIFACTS;

  const notify = useNotify();

  const [picked, setPicked] = useState<FreeArtifact | null>(null);

  const [query, setQuery] = useState("");

  const [quantity, setQuantity] = useState("1");

  const [baseId, setBaseId] = useState("");

  const [parameter, setParameter] = useState("");

  const [spellId, setSpellId] = useState("");

  const reset = () => {
    setPicked(null);
    setQuery("");
    setQuantity("1");
    setBaseId("");
    setParameter("");
    setSpellId("");
  };

  const close = (o: boolean) => {
    if (!o) reset();

    onOpenChange(o);
  };

  const grant = (body: GrantBody) =>
    action.mutateAsync({ action: "grant", ...body }).then(
      () => close(false),
      (e: Error) => notify(e.message || "Не вдалося видати артефакт"),
    );

  const property = picked?.property;

  const detail = !!picked && (!!property || !!picked.consumable || !!picked.parameter);

  const bases = property ? artifacts.filter((b) => property.bases.includes(b.id) && b.name.toLowerCase().includes(query.trim().toLowerCase())) : [];

  const selectedBase = artifacts.find((b) => b.id === baseId);

  const parameterOptions = picked?.parameter?.options ?? selectedBase?.parameter?.options ?? [];

  const parameterRequired = parameterOptions.length > 0;

  const spellOptions = picked?.spells ?? [];

  const canGrant = !action.isPending && (property === undefined || !!baseId) && (!parameterRequired || !!parameter) && (spellOptions.length === 0 || !!spellId);

  const submit = () => {
    if (!picked || !canGrant) return;

    void grant({ artifactId: picked.id, ...(baseId && { baseId }), ...(picked.consumable && { quantity: clampGrantQuantity(quantity) }), ...(parameter && { parameter }), ...(spellId && { spellId }) });
  };

  const pick = (a: FreeArtifact) => (a.property || a.consumable || a.parameter ? setPicked(a) : void grant({ artifactId: a.id }));

  return {
    artifacts,
    isLoading: free.isLoading,
    isPending: action.isPending,
    picked,
    detail,
    bases,
    selectedBase,
    parameterOptions,
    parameterRequired,
    spellOptions,
    canGrant,
    fields: { query, quantity, baseId, parameter, spellId },
    actions: { pick, close, submit, back: () => setPicked(null), setQuery, setQuantity, setBaseId, setParameter, setSpellId },
  };
}
