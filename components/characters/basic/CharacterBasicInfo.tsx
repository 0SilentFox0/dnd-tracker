"use client";

/**
 * Компонент для базової інформації про персонажа
 */

import { ImageUpload } from "@/components/ui/image-upload";
import { Label } from "@/components/ui/label";
import { LabeledInput } from "@/components/ui/labeled-input";
import { SelectField } from "@/components/ui/select-field";
import { ALIGNMENTS } from "@/lib/constants";
import { CampaignMember } from "@/types/campaigns";
import type { Race } from "@/types/races";

interface CharacterBasicInfoProps {
  basicInfo: {
    name: string;
    type: "player" | "npc_hero";
    controlledBy: string;
    level: number;
    class: string;
    subclass?: string;
    race: string;
    subrace?: string;
    alignment?: string;
    background?: string;
    experience: number;
    avatar?: string;
    setters: {
      setName: (value: string) => void;
      setType: (value: "player" | "npc_hero") => void;
      setControlledBy: (value: string) => void;
      setLevel: (value: number) => void;
      setClass: (value: string) => void;
      setSubclass: (value: string) => void;
      setRace: (value: string) => void;
      setSubrace: (value: string) => void;
      setAlignment: (value: string) => void;
      setBackground: (value: string) => void;
      setExperience: (value: number) => void;
      setAvatar: (value: string) => void;
    };
  };
  campaignMembers?: CampaignMember[];
  races?: Race[];
  isPlayerView?: boolean;
}

export function CharacterBasicInfo({
  basicInfo,
  campaignMembers = [],
  races = [],
  isPlayerView = false,
}: CharacterBasicInfoProps) {
  const {
    name,
    type,
    controlledBy,
    level,
    class: className,
    subclass,
    race,
    subrace,
    alignment,
    background,
    experience,
    avatar,
    setters,
  } = basicInfo;

  return (
    <div className="grid grid-cols-2 gap-4 w-full">
      <LabeledInput
        id="name"
        label="Ім'я"
        value={name}
        onChange={(e) => setters.setName(e.target.value)}
        required
        placeholder="Ім'я персонажа"
        containerClassName="w-full min-w-0"
        className="w-full"
      />

      <div className="w-full min-w-0">
        <Label htmlFor="type">Тип *</Label>
        <SelectField
          id="type"
          value={type}
          onValueChange={(value) =>
            setters.setType(value as "player" | "npc_hero")
          }
          placeholder="Виберіть тип"
          options={[
            { value: "player", label: "Гравець" },
            { value: "npc_hero", label: "NPC Герой" },
          ]}
          required
          triggerClassName="w-full"
        />
      </div>

      {type === "player" && (
        <div className="w-full min-w-0">
          <Label htmlFor="controlledBy">Контролюється *</Label>
          <SelectField
            id="controlledBy"
            value={controlledBy}
            onValueChange={(value) => setters.setControlledBy(value)}
            placeholder="Виберіть гравця"
            options={campaignMembers.map((member) => ({
              value: member.id,
              label: `${member.displayName} (${member.email})`,
            }))}
            required
            triggerClassName="w-full"
          />
        </div>
      )}

      <div className="w-full min-w-0">
        <Label htmlFor="race">Раса *</Label>
        <SelectField
          id="race"
          value={race}
          onValueChange={(value) => setters.setRace(value)}
          placeholder="Виберіть расу"
          options={races.map((r) => ({ value: r.name, label: r.name }))}
          required
          triggerClassName="w-full"
        />
      </div>

      <LabeledInput
        id="subrace"
        label="Підраса"
        value={subrace || ""}
        onChange={(e) => setters.setSubrace(e.target.value)}
        placeholder="Наприклад: Темний Ельф"
        containerClassName="w-full min-w-0"
        className="w-full"
      />
      <LabeledInput
        id="class"
        label="Клас"
        value={className}
        onChange={(e) => setters.setClass(e.target.value)}
        required
        placeholder="Наприклад: Паладин"
        containerClassName="w-full min-w-0"
        className="w-full"
      />
      <LabeledInput
        id="subclass"
        label="Підклас"
        value={subclass || ""}
        onChange={(e) => setters.setSubclass(e.target.value)}
        placeholder="Наприклад: Клятва Месника"
        containerClassName="w-full min-w-0"
        className="w-full"
      />

      <div className="w-full min-w-0">
        <Label htmlFor="alignment">Світогляд</Label>
        <SelectField
          id="alignment"
          value={alignment || ""}
          onValueChange={(value) => setters.setAlignment(value)}
          placeholder="Виберіть світогляд"
          options={ALIGNMENTS.map((align) => ({ value: align, label: align }))}
          allowNone
          triggerClassName="w-full"
        />
      </div>

      <LabeledInput
        id="background"
        label="Передісторія"
        value={background || ""}
        onChange={(e) => setters.setBackground(e.target.value)}
        placeholder="Наприклад: Народжений на вулиці"
        containerClassName="w-full min-w-0"
        className="w-full"
      />
      <LabeledInput
        id="level"
        label="Рівень"
        type="number"
        min="1"
        max="30"
        value={level}
        onChange={(e) => setters.setLevel(parseInt(e.target.value) || 1)}
        containerClassName="w-full min-w-0"
        className="w-full"
      />
      <LabeledInput
        id="experience"
        label="Досвід (XP)"
        type="number"
        min="0"
        value={experience}
        onChange={(e) => setters.setExperience(parseInt(e.target.value) || 0)}
        containerClassName="w-full min-w-0"
        className="w-full"
      />
      {!isPlayerView && (
        <div className="w-full min-w-0 md:col-span-2">
          <ImageUpload
            label="Картинка персонажа"
            value={avatar || ""}
            onChange={setters.setAvatar}
            placeholder="Посилання на картинку (URL)"
            previewAlt="Аватар"
          />
        </div>
      )}
    </div>
  );
}
