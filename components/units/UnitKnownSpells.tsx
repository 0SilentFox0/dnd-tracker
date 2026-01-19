import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X } from "lucide-react";
import type { Unit } from "@/lib/api/units";
import type { Spell } from "@/lib/api/spells";

interface UnitKnownSpellsProps {
  formData: Partial<Unit>;
  spells: Spell[];
  onChange: (data: Partial<Unit>) => void;
}

export function UnitKnownSpells({
  formData,
  spells,
  onChange,
}: UnitKnownSpellsProps) {
  const knownSpellIds = formData.knownSpells || [];
  const knownSpells = spells.filter((spell) =>
    knownSpellIds.includes(spell.id)
  );

  const handleAdd = (spellId: string) => {
    if (!spellId || spellId === "none") return;
    if (knownSpellIds.includes(spellId)) return;

    onChange({
      knownSpells: [...knownSpellIds, spellId],
    });
  };

  const handleRemove = (spellId: string) => {
    const updated = knownSpellIds.filter((id) => id !== spellId);
    onChange({ knownSpells: updated });
  };

  const availableSpells = spells.filter(
    (spell) => !knownSpellIds.includes(spell.id)
  );

  return (
    <div className="space-y-4 border-t pt-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold">Заклинання</Label>
        {availableSpells.length > 0 && (
          <Select
            value="none"
            onValueChange={handleAdd}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Додати заклинання" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Виберіть заклинання</SelectItem>
              {availableSpells.map((spell) => (
                <SelectItem key={spell.id} value={spell.id}>
                  {spell.name} {spell.level > 0 ? `(${spell.level} рівень)` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {knownSpells.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">
            Відомі заклинання:
          </Label>
          <div className="flex flex-wrap gap-2">
            {knownSpells.map((spell) => (
              <div
                key={spell.id}
                className="flex items-center gap-2 bg-muted px-3 py-1 rounded-md"
              >
                <span className="text-sm">
                  {spell.name}
                  {spell.level > 0 && (
                    <span className="text-muted-foreground ml-1">
                      ({spell.level})
                    </span>
                  )}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0"
                  onClick={() => handleRemove(spell.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {knownSpells.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-2">
          Немає доданих заклинань. Виберіть заклинання зі списку вище.
        </p>
      )}

      {spells.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-2">
          Немає доступних заклинань у кампанії. Створіть заклинання в розділі
          &quot;Заклинання&quot;.
        </p>
      )}
    </div>
  );
}
