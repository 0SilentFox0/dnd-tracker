"use client";

import { SelectField } from "@/components/ui/select-field";
import { useCharacters } from "@/lib/hooks/characters";

export function CharacterSelect({ campaignId, id, value, onValueChange, enabled = true }: { campaignId: string; id: string; value: string; onValueChange: (value: string) => void; enabled?: boolean }) {
  const { data: roster = [] } = useCharacters(campaignId, { compact: true, enabled });

  return <SelectField id={id} value={value} onValueChange={onValueChange} options={roster.map((c) => ({ value: c.id, label: c.name }))} allowNone noneLabel="— без прив'язки —" />;
}
