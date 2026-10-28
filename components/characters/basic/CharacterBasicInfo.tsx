"use client";

import { CharacterClassesField } from "@/components/characters/basic/CharacterClassesField";
import { ImageUpload } from "@/components/ui/image-upload";
import { Label } from "@/components/ui/label";
import { LabeledInput } from "@/components/ui/labeled-input";
import { SelectField } from "@/components/ui/select-field";
import { ALIGNMENTS } from "@/lib/constants/alignment";
import { CharacterType, type CharacterTypeValue } from "@/lib/constants/characters";
import { HERO_ARCHETYPE_OPTIONS } from "@/lib/constants/hero-archetypes";
import { classesLabel, classTotalLevel, subclassesLabel } from "@/lib/utils/characters/classes";
import type { CharacterFormBindings } from "@/lib/utils/characters/form/bindings";
import { resolveClassEntries } from "@/lib/utils/spells/class-slots";
import { CampaignMember } from "@/types/campaigns";
import type { CharacterClassEntry, GameClassData } from "@/types/classes";
import type { Race } from "@/types/races";

interface CharacterBasicInfoProps {
  basicInfo: CharacterFormBindings["basicInfo"];
  campaignMembers?: CampaignMember[];
  races?: Race[];
  isPlayerView?: boolean;
  classMode?: { classes: GameClassData[]; byId: Record<string, GameClassData> };
}

export function CharacterBasicInfo({
  basicInfo,
  campaignMembers = [],
  races = [],
  isPlayerView = false,
  classMode,
}: CharacterBasicInfoProps) {
  const { data, set } = basicInfo;

  const setClasses = (entries: CharacterClassEntry[]) => {
    const resolved = resolveClassEntries(entries, classMode?.byId ?? {});

    set("classes", entries);

    if (entries.length === 0) return;

    set("class", classesLabel(resolved));
    set("subclass", subclassesLabel(resolved) ?? undefined);
    set("level", classTotalLevel(entries));
  };

  const { name, type, controlledBy, level, class: className, subclass, archetype, race, subrace, alignment, avatar } = data;

  return (
    <div className="grid grid-cols-2 gap-4 w-full">
      <LabeledInput
        id="name"
        label="Ім'я"
        value={name}
        onChange={(e) => set("name", e.target.value)}
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
          onValueChange={(value) => set("type", value as CharacterTypeValue)}
          placeholder="Виберіть тип"
          options={[
            { value: CharacterType.PLAYER, label: "Гравець" },
            { value: CharacterType.NPC_HERO, label: "NPC Герой" },
          ]}
          required
          triggerClassName="w-full"
        />
      </div>

      {type === CharacterType.PLAYER && (
        <div className="w-full min-w-0">
          <Label htmlFor="controlledBy">Контролюється *</Label>
          <SelectField
            id="controlledBy"
            value={controlledBy}
            onValueChange={(value) => set("controlledBy", value)}
            placeholder="Виберіть гравця"
            options={campaignMembers.map((member) => ({
              value: member.id,
              label: member.email ? `${member.displayName} (${member.email})` : member.displayName,
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
          onValueChange={(value) => set("race", value)}
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
        onChange={(e) => set("subrace", e.target.value)}
        placeholder="Наприклад: Темний Ельф"
        containerClassName="w-full min-w-0"
        className="w-full"
      />
      {classMode ? (
        <CharacterClassesField value={data.classes ?? []} classes={classMode.classes} onChange={setClasses} />
      ) : (
        <>
        <LabeledInput
          id="class"
          label="Клас"
          value={className}
          onChange={(e) => set("class", e.target.value)}
          required
          placeholder="Наприклад: Паладин"
          containerClassName="w-full min-w-0"
          className="w-full"
        />
        <LabeledInput
          id="subclass"
          label="Підклас"
          value={subclass || ""}
          onChange={(e) => set("subclass", e.target.value)}
          placeholder="Наприклад: Клятва Месника"
          containerClassName="w-full min-w-0"
          className="w-full"
        />
        </>
      )}
      {!isPlayerView && !classMode && (
        <div className="w-full min-w-0">
          <Label htmlFor="archetype">Архетип</Label>
          <SelectField
            id="archetype"
            value={archetype || ""}
            onValueChange={(value) => set("archetype", value)}
            options={HERO_ARCHETYPE_OPTIONS.filter((o) => o.value)}
            allowNone
            noneLabel={HERO_ARCHETYPE_OPTIONS[0].label}
            triggerClassName="w-full"
          />
        </div>
      )}

      <div className="w-full min-w-0">
        <Label htmlFor="alignment">Світогляд</Label>
        <SelectField
          id="alignment"
          value={alignment || ""}
          onValueChange={(value) => set("alignment", value)}
          placeholder="Виберіть світогляд"
          options={ALIGNMENTS.map((align) => ({ value: align, label: align }))}
          allowNone
          triggerClassName="w-full"
        />
      </div>

      {!classMode && (
        <div className="col-span-2 grid grid-cols-3 gap-2">
          <LabeledInput
            id="level"
            label="Рівень"
            labelClassName="text-xs leading-tight"
            type="number"
            min="1"
            max="30"
            value={level}
            onChange={(e) => set("level", parseInt(e.target.value) || 1)}
            containerClassName="w-full min-w-0"
            className="w-full"
          />
        </div>
      )}
      {!isPlayerView && (
        <div className="w-full min-w-0 md:col-span-2">
          <ImageUpload label="Фото персонажа" value={avatar || ""} onChange={(value) => set("avatar", value)} fallbackText={name} maxSide={1200} />
        </div>
      )}
    </div>
  );
}
