"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAbilitySources, useCopyOwnerAbilities } from "@/lib/hooks/abilities";
import type { Ability } from "@/lib/utils/abilities/schema";
import type { AbilitySourceRef } from "@/types/abilities";

const KIND_LABELS: Record<AbilitySourceRef["kind"], string> = {
  skill: "Скіли",
  race: "Раси",
  artifact: "Артефакти",
  artifactSet: "Сети",
  unit: "Юніти",
};

export function AbilityCopySourcePicker({ campaignId, onPick }: { campaignId: string; onPick: (abilities: Ability[]) => void }) {
  const { data, isLoading } = useAbilitySources(campaignId, true);

  const [query, setQuery] = useState("");

  const copy = useCopyOwnerAbilities(campaignId);

  const q = query.trim().toLowerCase();

  const sources = (data?.sources ?? []).filter((s) => !q || s.name.toLowerCase().includes(q));

  const pick = (s: AbilitySourceRef) => copy.mutate(s, { onSuccess: onPick });

  const error = copy.isError ? `Не вдалося завантажити вміння «${copy.variables?.name}». Спробуйте ще раз.` : null;

  return (
    <div className="space-y-2">
      <Input placeholder="Пошук…" value={query} onChange={(e) => setQuery(e.target.value)} />
      {isLoading && <p className="text-xs text-muted-foreground">Завантаження…</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="max-h-[50dvh] space-y-3 overflow-y-auto">
        {(Object.keys(KIND_LABELS) as AbilitySourceRef["kind"][]).map((kind) => {
          const items = sources.filter((s) => s.kind === kind);

          if (!items.length) return null;

          return (
            <div key={kind} className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground">{KIND_LABELS[kind]}</p>
              {items.map((s) => (
                <Button key={`${s.kind}:${s.id}`} type="button" variant="outline" className="w-full justify-start" disabled={copy.isPending} onClick={() => pick(s)}>
                  {s.name}
                </Button>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
