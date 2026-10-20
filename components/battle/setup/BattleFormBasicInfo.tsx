"use client";

import type { Dispatch, SetStateAction } from "react";

import { HudSection } from "@/components/hud/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface BattleDetails {
  name: string;
  description: string;
}

export function BattleFormBasicInfo({ details }: { details: { data: BattleDetails; set: Dispatch<SetStateAction<BattleDetails>> } }) {
  const { data, set } = details;

  return (
    <HudSection title="Основна інформація" className="space-y-4">
      <div>
        <Label htmlFor="name">Назва битви *</Label>
        <Input id="name" value={data.name} onChange={(e) => set((prev) => ({ ...prev, name: e.target.value }))} required placeholder="Назва битви" />
      </div>
      <div>
        <Label htmlFor="description">Опис</Label>
        <Textarea
          id="description"
          value={data.description}
          onChange={(e) => set((prev) => ({ ...prev, description: e.target.value }))}
          placeholder="Опис битви (опціонально)"
          rows={3}
        />
      </div>
    </HudSection>
  );
}
