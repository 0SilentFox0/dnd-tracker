/**
 * Компонент для мов та профісій персонажа
 */

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface CharacterLanguagesSectionProps {
  roleplay: {
    languages: string[];
    proficiencies: Record<string, string[]>;
    handlers: {
      addLanguage: () => void;
      removeLanguage: (index: number) => void;
    };
    setters: {
      setProficiencies: (value: Record<string, string[]>) => void;
    };
  };
}

export function CharacterLanguagesSection({
  roleplay,
}: CharacterLanguagesSectionProps) {
  const { languages, proficiencies, handlers, setters } = roleplay;
  
  return (
    <div className="space-y-4 w-full">
      <div className="w-full min-w-0">
        <Label>Мови</Label>
        <div className="flex gap-2 mb-2">
          <Button type="button" variant="outline" size="sm" onClick={handlers.addLanguage}>
            + Додати мову
          </Button>
        </div>
        {languages.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {languages.map((lang, index) => (
              <span
                key={index}
                className="bg-muted px-2 py-1 rounded text-sm flex items-center gap-1"
              >
                {lang}
                <button
                  type="button"
                  onClick={() => handlers.removeLanguage(index)}
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
          value={JSON.stringify(proficiencies, null, 2)}
          onChange={(e) => {
            try {
              const parsed = JSON.parse(e.target.value);

              setters.setProficiencies(parsed);
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
