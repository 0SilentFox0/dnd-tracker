"use client";

import { AcquaintanceCard } from "@/components/acquaintances/AcquaintanceCard";
import { SearchEmptyState } from "@/components/common/SearchEmptyState";
import { SearchInput } from "@/components/common/SearchInput";
import { EmptyState, QueryState } from "@/components/common/states";
import { HudPage, HudPageHeader, HudPanel } from "@/components/hud/page";
import { useAcquaintances } from "@/lib/hooks/acquaintances";
import { useSearch } from "@/lib/hooks/common";
import { useSeenOnOpen } from "@/lib/hooks/notifications";
import type { AcquaintanceView } from "@/types/acquaintances";

const fieldsOf = (a: AcquaintanceView) => [a.name, a.description];

function Grid({ campaignId, items, isDM, focusId, fresh }: { campaignId: string; items: AcquaintanceView[]; isDM: boolean; focusId?: string; fresh: ReadonlySet<string> }) {
  const search = useSearch(items, fieldsOf);

  if (!items.length) return <EmptyState title="Знайомств поки немає" />;

  return (
    <div className="space-y-3">
      <SearchInput value={search.query.value} onChange={search.query.set} label="Пошук знайомства" />
      {search.items.length === 0 ? (
        <SearchEmptyState query={search.query.value} onClear={() => search.query.set("")} />
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {search.items.map((a) => (
            <AcquaintanceCard key={a.id} campaignId={campaignId} item={a} flags={{ isDM, isNew: fresh.has(a.id), focused: a.id === focusId }} />
          ))}
        </div>
      )}
    </div>
  );
}

export function AcquaintancesPageClient({ campaignId, isDM, focusId }: { campaignId: string; isDM: boolean; focusId?: string }) {
  const query = useAcquaintances(campaignId);

  const fresh = useSeenOnOpen(campaignId, { types: ["acquaintance"], enabled: !isDM });

  return (
    <HudPage>
      <HudPageHeader title="Знайомства" subtitle="NPC, яких зустріли герої" />
      {isDM && query.data && !query.data.enabled && <HudPanel>Гравці ще не бачать цей розділ — увімкни в налаштуваннях кампанії.</HudPanel>}
      <QueryState query={query}>{(data) => <Grid campaignId={campaignId} items={data.items} isDM={isDM} focusId={focusId} fresh={fresh} />}</QueryState>
    </HudPage>
  );
}
