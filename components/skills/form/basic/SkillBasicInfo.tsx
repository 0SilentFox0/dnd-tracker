"use client";

import { OptimizedImage } from "@/components/common/OptimizedImage";
import { Label } from "@/components/ui/label";
import { LabeledInput } from "@/components/ui/labeled-input";
import { Textarea } from "@/components/ui/textarea";

interface SkillBasicInfoProps {
  basicInfo: {
    name: string;
    description: string;
    icon: string;
    setters: {
      setName: (value: string) => void;
      setDescription: (value: string) => void;
      setIcon: (value: string) => void;
    };
  };
}

export function SkillBasicInfo({
  basicInfo,
}: SkillBasicInfoProps) {
  const { name, description, icon, setters } = basicInfo;

  return (
    <div className="rounded-md border p-4 space-y-3">
      <LabeledInput
        id="skill-name"
        label="Назва"
        value={name}
        onChange={(e) => setters.setName(e.target.value)}
        placeholder="Наприклад: Майстерність з мечем"
        required
      />

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
        <LabeledInput
          id="skill-icon"
          label="Іконка (URL)"
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
    </div>
  );
}
