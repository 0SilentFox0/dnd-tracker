"use client";

import { useTranslations } from "next-intl";
import { SearchX } from "lucide-react";

import { EmptyState } from "@/components/common/states";
import { Button } from "@/components/ui/button";

export function SearchEmptyState({ query, onClear }: { query: string; onClear: () => void }) {
  const t = useTranslations("common.search");

  return (
    <EmptyState
      icon={SearchX}
      title={t("noResults", { query: query.trim() })}
      action={<Button variant="outline" onClick={onClear}>{t("clear")}</Button>}
    />
  );
}
