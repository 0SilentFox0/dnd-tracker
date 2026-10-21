"use client";

import { Button } from "@/components/ui/button";

export function AiProposalBadge({ count, onClick }: { count: number; onClick: () => void }) {
  if (count === 0) return null;

  return (
    <Button type="button" size="sm" variant="outline" onClick={onClick} aria-label={`Пропозицій AI: ${count}`}>
      {count}
    </Button>
  );
}
