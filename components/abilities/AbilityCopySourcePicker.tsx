"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getOwnerAbilities } from "@/lib/api/abilities";
import { useAbilitySources } from "@/lib/hooks/abilities";
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

  const [busy, setBusy] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const q = query.trim().toLowerCase();

  const sources = (data?.sources ?? []).filter((s) => !q || s.name.toLowerCase().includes(q));

  const pick = async (s: AbilitySourceRef) => {
    setBusy(true);
    setError(null);

    try {
      onPick((await getOwnerAbilities(campaignId, s.kind, s.id)).abilities);
    } catch {
      setError(`Не вдалося завантажити вміння «${s.name}». Спробуйте ще раз.`);
    } finally {
      setBusy(false);
    }
  };

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
                <Button key={`${s.kind}:${s.id}`} type="button" variant="outline" className="w-full justify-start" disabled={busy} onClick={() => pick(s)}>
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
