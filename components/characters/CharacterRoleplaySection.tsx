/**
 * Компонент для рольової гри персонажа
 */

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CharacterFormData } from "@/lib/api/characters";

interface CharacterRoleplaySectionProps {
  formData: CharacterFormData;
  onUpdate: <K extends keyof CharacterFormData>(
    field: K,
    value: CharacterFormData[K]
  ) => void;
}

export function CharacterRoleplaySection({
  formData,
  onUpdate,
}: CharacterRoleplaySectionProps) {
  return (
    <div className="space-y-4 w-full">
      <div className="w-full min-w-0">
        <Label htmlFor="personalityTraits">Особливості особистості</Label>
        <Textarea
          id="personalityTraits"
          value={formData.personalityTraits || ""}
          onChange={(e) => onUpdate("personalityTraits", e.target.value)}
          placeholder="Опишіть особливості особистості персонажа"
          rows={3}
          className="w-full"
        />
      </div>

      <div className="w-full min-w-0">
        <Label htmlFor="ideals">Ідеали</Label>
        <Textarea
          id="ideals"
          value={formData.ideals || ""}
          onChange={(e) => onUpdate("ideals", e.target.value)}
          placeholder="Що персонаж вважає важливим?"
          rows={3}
          className="w-full"
        />
      </div>

      <div className="w-full min-w-0">
        <Label htmlFor="bonds">Зв'язки</Label>
        <Textarea
          id="bonds"
          value={formData.bonds || ""}
          onChange={(e) => onUpdate("bonds", e.target.value)}
          placeholder="З ким або чим персонаж пов'язаний?"
          rows={3}
          className="w-full"
        />
      </div>

      <div className="w-full min-w-0">
        <Label htmlFor="flaws">Недоліки</Label>
        <Textarea
          id="flaws"
          value={formData.flaws || ""}
          onChange={(e) => onUpdate("flaws", e.target.value)}
          placeholder="Які слабкості має персонаж?"
          rows={3}
          className="w-full"
        />
      </div>
    </div>
  );
}
