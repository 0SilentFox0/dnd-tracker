/**
 * Компонент для базової інформації про персонажа
 */

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ALIGNMENTS } from "@/lib/constants";
import { CharacterFormData } from "@/types/characters";
import { CampaignMember } from "@/types/campaigns";
import type { Race } from "@/types/races";

interface CharacterBasicInfoProps {
  formData: CharacterFormData;
  onUpdate: <K extends keyof CharacterFormData>(
    field: K,
    value: CharacterFormData[K]
  ) => void;
  campaignMembers?: CampaignMember[];
  races?: Race[];
}

export function CharacterBasicInfo({
  formData,
  onUpdate,
  campaignMembers = [],
  races = [],
}: CharacterBasicInfoProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
      <div className="w-full min-w-0">
        <Label htmlFor="name">Ім'я *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => onUpdate("name", e.target.value)}
          required
          placeholder="Ім'я персонажа"
          className="w-full"
        />
      </div>

      <div className="w-full min-w-0">
        <Label htmlFor="type">Тип *</Label>
        <Select
          value={formData.type}
          onValueChange={(value: "player" | "npc_hero") => onUpdate("type", value)}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="player">Гравець</SelectItem>
            <SelectItem value="npc_hero">NPC Герой</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {formData.type === "player" && (
        <div className="w-full min-w-0">
          <Label htmlFor="controlledBy">Контролюється *</Label>
          <Select
            value={formData.controlledBy}
            onValueChange={(value) => onUpdate("controlledBy", value)}
            required
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Виберіть гравця" />
            </SelectTrigger>
            <SelectContent>
              {campaignMembers.map((member) => (
                <SelectItem key={member.id} value={member.id}>
                  {member.displayName} ({member.email})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="w-full min-w-0">
        <Label htmlFor="race">Раса *</Label>
        {races.length > 0 ? (
          <Select
            value={formData.race}
            onValueChange={(value) => onUpdate("race", value)}
            required
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Виберіть расу" />
            </SelectTrigger>
            <SelectContent>
              {races.map((race) => (
                <SelectItem key={race.id} value={race.name}>
                  {race.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            id="race"
            value={formData.race}
            onChange={(e) => onUpdate("race", e.target.value)}
            required
            placeholder="Наприклад: Ельф"
            className="w-full"
          />
        )}
      </div>

      <div className="w-full min-w-0">
        <Label htmlFor="subrace">Підраса</Label>
        <Input
          id="subrace"
          value={formData.subrace || ""}
          onChange={(e) => onUpdate("subrace", e.target.value)}
          placeholder="Наприклад: Темний Ельф"
          className="w-full"
        />
      </div>

      <div className="w-full min-w-0">
        <Label htmlFor="class">Клас *</Label>
        <Input
          id="class"
          value={formData.class}
          onChange={(e) => onUpdate("class", e.target.value)}
          required
          placeholder="Наприклад: Паладин"
          className="w-full"
        />
      </div>

      <div className="w-full min-w-0">
        <Label htmlFor="subclass">Підклас</Label>
        <Input
          id="subclass"
          value={formData.subclass || ""}
          onChange={(e) => onUpdate("subclass", e.target.value)}
          placeholder="Наприклад: Клятва Месника"
          className="w-full"
        />
      </div>

      <div className="w-full min-w-0">
        <Label htmlFor="alignment">Світогляд</Label>
        <Select
          value={formData.alignment || ""}
          onValueChange={(value) => onUpdate("alignment", value)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Виберіть світогляд" />
          </SelectTrigger>
          <SelectContent>
            {ALIGNMENTS.map((align) => (
              <SelectItem key={align} value={align}>
                {align}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="w-full min-w-0">
        <Label htmlFor="background">Передісторія</Label>
        <Input
          id="background"
          value={formData.background || ""}
          onChange={(e) => onUpdate("background", e.target.value)}
          placeholder="Наприклад: Народжений на вулиці"
          className="w-full"
        />
      </div>

      <div className="w-full min-w-0">
        <Label htmlFor="level">Рівень</Label>
        <Input
          id="level"
          type="number"
          min="1"
          max="30"
          value={formData.level}
          onChange={(e) => onUpdate("level", parseInt(e.target.value) || 1)}
          className="w-full"
        />
      </div>

      <div className="w-full min-w-0">
        <Label htmlFor="experience">Досвід (XP)</Label>
        <Input
          id="experience"
          type="number"
          min="0"
          value={formData.experience}
          onChange={(e) => onUpdate("experience", parseInt(e.target.value) || 0)}
          className="w-full"
        />
      </div>

      <div className="w-full min-w-0">
        <Label htmlFor="avatar">Аватар (URL)</Label>
        <Input
          id="avatar"
          type="url"
          value={formData.avatar || ""}
          onChange={(e) => onUpdate("avatar", e.target.value)}
          placeholder="https://example.com/avatar.png"
          className="w-full"
        />
      </div>
    </div>
  );
}
