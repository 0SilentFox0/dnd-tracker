"use client";

import { HudSection } from "@/components/hud/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface BattleFormBasicInfoProps {
  name: string;
  description: string;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
}

export function BattleFormBasicInfo({
  name,
  description,
  onNameChange,
  onDescriptionChange,
}: BattleFormBasicInfoProps) {
  return (
    <HudSection title="Основна інформація" className="space-y-4">
        <div>
          <Label htmlFor="name">Назва битви *</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            required
            placeholder="Назва битви"
          />
        </div>
        <div>
          <Label htmlFor="description">Опис</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder="Опис битви (опціонально)"
            rows={3}
          />
        </div>
    </HudSection>
  );
}
