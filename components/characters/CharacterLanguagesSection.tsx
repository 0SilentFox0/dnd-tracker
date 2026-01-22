/**
 * Компонент для мов та профісій персонажа
 */

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { CharacterFormData } from "@/types/characters";

interface CharacterLanguagesSectionProps {
  formData: CharacterFormData;
  onUpdate: <K extends keyof CharacterFormData>(
    field: K,
    value: CharacterFormData[K]
  ) => void;
  onAddLanguage: () => void;
  onRemoveLanguage: (index: number) => void;
}

export function CharacterLanguagesSection({
  formData,
  onUpdate,
  onAddLanguage,
  onRemoveLanguage,
}: CharacterLanguagesSectionProps) {
  return (
    <div className="space-y-4 w-full">
      <div className="w-full min-w-0">
        <Label>Мови</Label>
        <div className="flex gap-2 mb-2">
          <Button type="button" variant="outline" size="sm" onClick={onAddLanguage}>
            + Додати мову
          </Button>
        </div>
        {formData.languages.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {formData.languages.map((lang, index) => (
              <span
                key={index}
                className="bg-muted px-2 py-1 rounded text-sm flex items-center gap-1"
              >
                {lang}
                <button
                  type="button"
                  onClick={() => onRemoveLanguage(index)}
                  className="text-destructive hover:underline"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="w-full min-w-0">
        <Label>Профісії (JSON формат)</Label>
        <Textarea
          placeholder='{"weapons": ["sword", "bow"], "armor": ["light"]}'
          value={JSON.stringify(formData.proficiencies, null, 2)}
          onChange={(e) => {
            try {
              const parsed = JSON.parse(e.target.value);
              onUpdate("proficiencies", parsed);
            } catch {
              // Invalid JSON, ignore
            }
          }}
          rows={4}
          className="w-full"
        />
      </div>
    </div>
  );
}
