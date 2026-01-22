"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { OptimizedImage } from "@/components/common/OptimizedImage";
import type { Race } from "@/types/races";

interface SkillBasicInfoProps {
  basicInfo: {
    name: string;
    description: string;
    icon: string;
    selectedRaces: string[];
    isRacial: boolean;
    setters: {
      setName: (value: string) => void;
      setDescription: (value: string) => void;
      setIcon: (value: string) => void;
      setIsRacial: (checked: boolean) => void;
    };
    handlers: {
      handleRaceToggle: (raceId: string) => void;
    };
  };
  races: Race[];
}

export function SkillBasicInfo({
  basicInfo,
  races,
}: SkillBasicInfoProps) {
  const { name, description, icon, selectedRaces, isRacial, setters, handlers } = basicInfo;
  return (
    <div className="rounded-md border p-4 space-y-3">
      <div className="space-y-2">
        <Label htmlFor="skill-name">Назва *</Label>
        <Input
          id="skill-name"
          value={name}
          onChange={(e) => setters.setName(e.target.value)}
          placeholder="Наприклад: Майстерність з мечем"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="skill-description">Опис</Label>
        <Textarea
          id="skill-description"
          value={description}
          onChange={(e) => setters.setDescription(e.target.value)}
          placeholder="Опис скіла"
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="skill-icon">Іконка (URL)</Label>
        <Input
          id="skill-icon"
          type="url"
          value={icon}
          onChange={(e) => setters.setIcon(e.target.value)}
          placeholder="https://example.com/icon.png"
        />
        {icon && (
          <div className="mt-2">
            <div className="w-16 h-16 rounded border overflow-hidden bg-muted flex items-center justify-center">
              <OptimizedImage
                src={icon}
                alt="Preview"
                width={64}
                height={64}
                className="w-full h-full object-cover"
                fallback={
                  <div className="w-full h-full flex items-center justify-center bg-muted">
                    <span className="text-xs text-muted-foreground">
                      Помилка завантаження
                    </span>
                  </div>
                }
              />
            </div>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <Label>Раси (для яких підходить скіл)</Label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {races.map((race) => (
            <div key={race.id} className="flex items-center space-x-2">
              <Checkbox
                id={`race-${race.id}`}
                checked={selectedRaces.includes(race.id)}
                onCheckedChange={() => handlers.handleRaceToggle(race.id)}
              />
              <Label
                htmlFor={`race-${race.id}`}
                className="text-sm font-normal cursor-pointer"
              >
                {race.name}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="is-racial"
          checked={isRacial}
          onCheckedChange={(checked) => setters.setIsRacial(checked === true)}
        />
        <Label
          htmlFor="is-racial"
          className="text-sm font-normal cursor-pointer"
        >
          Рассовий навик
        </Label>
      </div>
    </div>
  );
}
