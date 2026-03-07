"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

export interface SkillDamageAffinityProps {
  affectsDamage: boolean;
  damageType: "melee" | "ranged" | "magic" | null;
  onAffectsDamageChange: (value: boolean) => void;
  onDamageTypeChange: (value: "melee" | "ranged" | "magic" | null) => void;
}

export function SkillDamageAffinity({
  affectsDamage,
  damageType,
  onAffectsDamageChange,
  onDamageTypeChange,
}: SkillDamageAffinityProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Вплив на шкоду</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Checkbox
            id="affectsDamage"
            checked={affectsDamage}
            onCheckedChange={(v) => onAffectsDamageChange(v === true)}
          />
          <Label htmlFor="affectsDamage" className="cursor-pointer">
            Впливає на розрахунок шкоди
          </Label>
        </div>
        {affectsDamage && (
          <div className="space-y-2">
            <Label className="text-muted-foreground">Тип шкоди</Label>
            <Select
              value={damageType ?? ""}
              onValueChange={(v) =>
                onDamageTypeChange(
                  v === "" ? null : (v as "melee" | "ranged" | "magic")
                )
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Оберіть тип" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="melee">Ближній бій (melee)</SelectItem>
                <SelectItem value="ranged">Дальній бій (ranged)</SelectItem>
                <SelectItem value="magic">Магія (magic)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
