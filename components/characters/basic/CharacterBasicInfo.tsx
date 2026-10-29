"use client";

import { useTranslations } from "next-intl";

import { CharacterClassesField } from "@/components/characters/basic/CharacterClassesField";
import { ImageUpload } from "@/components/ui/image-upload";
import { Label } from "@/components/ui/label";
import { LabeledInput } from "@/components/ui/labeled-input";
import { SelectField } from "@/components/ui/select-field";
import { ALIGNMENTS } from "@/lib/constants/alignment";
import { CharacterType, type CharacterTypeValue } from "@/lib/constants/characters";
import { useArchetypeOptions, useClassEntriesField } from "@/lib/hooks/characters";
import type { CharacterFormBindings } from "@/lib/utils/characters/form/bindings";
import { CampaignMember } from "@/types/campaigns";
import type { GameClassData } from "@/types/classes";
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
  const t = useTranslations("characters.form.basic");

  const { options: archetypeOptions, universalLabel } = useArchetypeOptions();

  const { data, set } = basicInfo;

  const setClasses = useClassEntriesField(basicInfo, classMode?.byId);

  const { name, type, controlledBy, level, class: className, subclass, archetype, race, subrace, alignment, avatar } = data;

  return (
    <div className="grid grid-cols-2 gap-4 w-full">
      <LabeledInput
        id="name"
        label={t("name")}
        value={name}
        onChange={(e) => set("name", e.target.value)}
        required
        placeholder={t("namePlaceholder")}
        containerClassName="w-full min-w-0"
        className="w-full"
      />

      <div className="w-full min-w-0">
        <Label htmlFor="type">{t("type")}</Label>
        <SelectField
          id="type"
          value={type}
          onValueChange={(value) => set("type", value as CharacterTypeValue)}
          placeholder={t("typePlaceholder")}
          options={[
            { value: CharacterType.PLAYER, label: t("typePlayer") },
            { value: CharacterType.NPC_HERO, label: t("typeNpcHero") },
          ]}
          required
          triggerClassName="w-full"
        />
      </div>

      {type === CharacterType.PLAYER && (
        <div className="w-full min-w-0">
          <Label htmlFor="controlledBy">{t("controlledBy")}</Label>
          <SelectField
            id="controlledBy"
            value={controlledBy}
            onValueChange={(value) => set("controlledBy", value)}
            placeholder={t("controlledByPlaceholder")}
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
        <Label htmlFor="race">{t("race")}</Label>
        <SelectField
          id="race"
          value={race}
          onValueChange={(value) => set("race", value)}
          placeholder={t("racePlaceholder")}
          options={races.map((r) => ({ value: r.name, label: r.name }))}
          required
          triggerClassName="w-full"
        />
        {races.length === 0 && <p className="mt-1 text-xs text-muted-foreground">{t("noRaces")}</p>}
      </div>

      <LabeledInput
        id="subrace"
        label={t("subrace")}
        value={subrace || ""}
        onChange={(e) => set("subrace", e.target.value)}
        placeholder={t("subracePlaceholder")}
        containerClassName="w-full min-w-0"
        className="w-full"
      />
      {classMode ? (
        <CharacterClassesField value={data.classes ?? []} classes={classMode.classes} onChange={setClasses} />
      ) : (
        <>
        <LabeledInput
          id="class"
          label={t("class")}
          value={className}
          onChange={(e) => set("class", e.target.value)}
          required
          placeholder={t("classPlaceholder")}
          containerClassName="w-full min-w-0"
          className="w-full"
        />
        <LabeledInput
          id="subclass"
          label={t("subclass")}
          value={subclass || ""}
          onChange={(e) => set("subclass", e.target.value)}
          placeholder={t("subclassPlaceholder")}
          containerClassName="w-full min-w-0"
          className="w-full"
        />
        </>
      )}
      {!isPlayerView && !classMode && (
        <div className="w-full min-w-0">
          <Label htmlFor="archetype">{t("archetype")}</Label>
          <SelectField
            id="archetype"
            value={archetype || ""}
            onValueChange={(value) => set("archetype", value)}
            options={archetypeOptions}
            allowNone
            noneLabel={universalLabel}
            triggerClassName="w-full"
          />
        </div>
      )}

      <div className="w-full min-w-0">
        <Label htmlFor="alignment">{t("alignment")}</Label>
        <SelectField
          id="alignment"
          value={alignment || ""}
          onValueChange={(value) => set("alignment", value)}
          placeholder={t("alignmentPlaceholder")}
          options={ALIGNMENTS.map((align) => ({ value: align, label: align }))}
          allowNone
          triggerClassName="w-full"
        />
      </div>

      {!classMode && (
        <div className="col-span-2 grid grid-cols-3 gap-2">
          <LabeledInput
            id="level"
            label={t("level")}
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
          <ImageUpload label={t("avatar")} value={avatar || ""} onChange={(value) => set("avatar", value)} fallbackText={name} maxSide={1200} />
        </div>
      )}
    </div>
  );
}
