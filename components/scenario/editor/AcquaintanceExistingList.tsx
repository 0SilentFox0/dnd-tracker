"use client";

import { useTranslations } from "next-intl";

import { SearchEmptyState } from "@/components/common/SearchEmptyState";
import { SearchInput } from "@/components/common/SearchInput";
import { Button } from "@/components/ui/button";
import { useSearch } from "@/lib/hooks/common";
import type { AcquaintanceView } from "@/types/acquaintances";

const fieldsOf = (a: AcquaintanceView) => [a.name];

export function AcquaintanceExistingList({ items, onPick }: { items: AcquaintanceView[]; onPick: (a: AcquaintanceView) => void }) {
  const t = useTranslations("scenario.acquaintance");

  const search = useSearch(items, fieldsOf);

  if (!items.length) return null;

  return (
    <div className="space-y-2">
      <p className="text-sm text-hud-muted">{t("existing")}</p>
      <SearchInput value={search.query.value} onChange={search.query.set} label={t("search")} />
      <div className="flex max-h-40 flex-col gap-1 overflow-y-auto">
        {search.items.map((a) => (
          <Button key={a.id} type="button" variant="ghost" className="justify-start" onClick={() => onPick(a)}>
            {a.name}
          </Button>
        ))}
        {search.isActive && search.items.length === 0 && <SearchEmptyState query={search.query.value} onClear={() => search.query.set("")} />}
      </div>
    </div>
  );
}
