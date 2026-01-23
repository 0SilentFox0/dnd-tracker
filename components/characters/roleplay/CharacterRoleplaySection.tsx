/**
 * Компонент для рольової гри персонажа
 */

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface CharacterRoleplaySectionProps {
  roleplay: {
    personalityTraits?: string;
    ideals?: string;
    bonds?: string;
    flaws?: string;
    setters: {
      setPersonalityTraits: (value: string) => void;
      setIdeals: (value: string) => void;
      setBonds: (value: string) => void;
      setFlaws: (value: string) => void;
    };
  };
}

export function CharacterRoleplaySection({
  roleplay,
}: CharacterRoleplaySectionProps) {
  const { personalityTraits, ideals, bonds, flaws, setters } = roleplay;
  
  return (
    <div className="space-y-4 w-full">
      <div className="w-full min-w-0">
        <Label htmlFor="personalityTraits">Особливості особистості</Label>
        <Textarea
          id="personalityTraits"
          value={personalityTraits || ""}
          onChange={(e) => setters.setPersonalityTraits(e.target.value)}
          placeholder="Опишіть особливості особистості персонажа"
          rows={3}
          className="w-full"
        />
      </div>

      <div className="w-full min-w-0">
        <Label htmlFor="ideals">Ідеали</Label>
        <Textarea
          id="ideals"
          value={ideals || ""}
          onChange={(e) => setters.setIdeals(e.target.value)}
          placeholder="Що персонаж вважає важливим?"
          rows={3}
          className="w-full"
        />
      </div>

      <div className="w-full min-w-0">
        <Label htmlFor="bonds">Зв'язки</Label>
        <Textarea
          id="bonds"
          value={bonds || ""}
          onChange={(e) => setters.setBonds(e.target.value)}
          placeholder="З ким або чим персонаж пов'язаний?"
          rows={3}
          className="w-full"
        />
      </div>

      <div className="w-full min-w-0">
        <Label htmlFor="flaws">Недоліки</Label>
        <Textarea
          id="flaws"
          value={flaws || ""}
          onChange={(e) => setters.setFlaws(e.target.value)}
          placeholder="Які слабкості має персонаж?"
          rows={3}
          className="w-full"
        />
      </div>
    </div>
  );
}
