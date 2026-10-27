"use client";

import { SearchX } from "lucide-react";

import { EmptyState } from "@/components/common/states";
import { Button } from "@/components/ui/button";

export function SearchEmptyState({ query, onClear }: { query: string; onClear: () => void }) {
  return (
    <EmptyState
      icon={SearchX}
      title={`Нічого не знайдено за «${query.trim()}»`}
      action={<Button variant="outline" onClick={onClear}>Очистити пошук</Button>}
    />
  );
}
