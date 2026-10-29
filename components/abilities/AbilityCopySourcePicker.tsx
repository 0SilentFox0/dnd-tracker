"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAbilitySources, useCopyOwnerAbilities } from "@/lib/hooks/abilities";
import type { Ability } from "@/lib/utils/abilities/schema";
import { matchesQuery } from "@/lib/utils/common/text-search";
import type { AbilitySourceRef } from "@/types/abilities";

const SOURCE_KINDS = ["skill", "race", "artifact", "artifactSet", "unit", "class", "feat"] as const satisfies readonly AbilitySourceRef["kind"][];

export function AbilityCopySourcePicker({ campaignId, onPick }: { campaignId: string; onPick: (abilities: Ability[]) => void }) {
  const t = useTranslations("abilities.copy");

  const { data, isLoading } = useAbilitySources(campaignId, true);

  const [query, setQuery] = useState("");

  const copy = useCopyOwnerAbilities(campaignId);

  const sources = (data?.sources ?? []).filter((s) => matchesQuery([s.name], query));

  const pick = (s: AbilitySourceRef) => copy.mutate(s, { onSuccess: onPick });

  const error = copy.isError ? t("loadFailed", { name: copy.variables?.name ?? "" }) : null;

  return (
    <div className="space-y-2">
      <Input placeholder={t("search")} value={query} onChange={(e) => setQuery(e.target.value)} />
      {isLoading && <p className="text-xs text-muted-foreground">{t("loading")}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="max-h-[50dvh] space-y-3 overflow-y-auto">
        {SOURCE_KINDS.map((kind) => {
          const items = sources.filter((s) => s.kind === kind);

          if (!items.length) return null;

          return (
            <div key={kind} className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground">{t(`kinds.${kind}`)}</p>
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
