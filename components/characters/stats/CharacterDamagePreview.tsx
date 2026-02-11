"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export interface DamagePreviewItem {
  total: number;
  breakdown: string[];
  diceFormula: string | null;
  hasWeapon: boolean;
}

export interface DamagePreviewResponse {
  melee: DamagePreviewItem;
  ranged: DamagePreviewItem;
}

interface CharacterDamagePreviewProps {
  campaignId: string;
  characterId: string;
  /** Коефіціент melee (×). Редагується лише DM. */
  meleeCoefficient?: number;
  /** Коефіціент ranged (×). Редагується лише DM. */
  rangedCoefficient?: number;
  onMeleeCoefficientChange?: (value: number) => void;
  onRangedCoefficientChange?: (value: number) => void;
  isDm?: boolean;
}

async function fetchDamagePreview(
  campaignId: string,
  characterId: string,
  meleeMultiplier: number,
  rangedMultiplier: number,
): Promise<DamagePreviewResponse> {
  const params = new URLSearchParams();

  if (meleeMultiplier !== 1)
    params.set("meleeMultiplier", String(meleeMultiplier));

  if (rangedMultiplier !== 1)
    params.set("rangedMultiplier", String(rangedMultiplier));

  const qs = params.toString();

  const url = `/api/campaigns/${campaignId}/characters/${characterId}/damage-preview${qs ? `?${qs}` : ""}`;

  const res = await fetch(url);

  if (!res.ok) throw new Error("Failed to load damage preview");

  return res.json();
}

function DamageBlock({
  title,
  data,
  coefficient = 1,
  onCoefficientChange,
  isDm,
}: {
  title: string;
  data: DamagePreviewItem;
  coefficient?: number;
  onCoefficientChange?: (value: number) => void;
  isDm?: boolean;
}) {
  const [localValue, setLocalValue] = useState(String(coefficient));

  useEffect(() => {
    setLocalValue(String(coefficient));
  }, [coefficient]);

  const handleSave = () => {
    const v = parseFloat(localValue);

    if (!Number.isNaN(v) && v >= 0.1 && v <= 3) {
      onCoefficientChange?.(v);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="space-y-1.5">
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription>
            {data.hasWeapon && data.diceFormula ? (
              <>
                <span className="font-mono text-foreground/80">
                  {data.diceFormula}
                </span>{" "}
                + база за рівнем → середній урон
              </>
            ) : (
              <>З руки (база за рівнем та характеристикою)</>
            )}
          </CardDescription>
        </div>
        {isDm && (
          <div className="flex items-center gap-2 pt-2">
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              Коеф. ×
            </span>
            <Input
              type="number"
              min={0.1}
              max={3}
              step={0.1}
              className="h-8 w-20 tabular-nums text-left"
              value={localValue}
              onChange={(e) => setLocalValue(e.target.value)}
            />
            <Button type="button" size="sm" variant="secondary" onClick={handleSave}>
              Зберегти
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-2xl font-semibold tabular-nums">{data.total}</p>
        {data.breakdown.length > 0 && (
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            {data.breakdown.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function CharacterDamagePreview({
  campaignId,
  characterId,
  meleeCoefficient = 1,
  rangedCoefficient = 1,
  onMeleeCoefficientChange,
  onRangedCoefficientChange,
  isDm,
}: CharacterDamagePreviewProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: [
      "character-damage-preview",
      campaignId,
      characterId,
      meleeCoefficient,
      rangedCoefficient,
    ],
    queryFn: () =>
      fetchDamagePreview(
        campaignId,
        characterId,
        meleeCoefficient,
        rangedCoefficient,
      ),
    enabled: !!campaignId && !!characterId,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div>
          <div className="h-4 w-48 rounded bg-muted animate-pulse" />
          <div className="mt-2 h-3 w-full max-w-md rounded bg-muted animate-pulse" />
        </div>
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="h-4 w-32 rounded bg-muted animate-pulse" />
              <div className="h-3 w-56 rounded bg-muted animate-pulse mt-2" />
              <div className="h-8 w-20 rounded bg-muted animate-pulse mt-3" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 rounded bg-muted animate-pulse" />
              <div className="mt-2 space-y-1">
                <div className="h-3 w-full rounded bg-muted animate-pulse" />
                <div className="h-3 w-[80%] rounded bg-muted animate-pulse" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <div className="h-4 w-32 rounded bg-muted animate-pulse" />
              <div className="h-3 w-56 rounded bg-muted animate-pulse mt-2" />
              <div className="h-8 w-20 rounded bg-muted animate-pulse mt-3" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 rounded bg-muted animate-pulse" />
              <div className="mt-2 space-y-1">
                <div className="h-3 w-full rounded bg-muted animate-pulse" />
                <div className="h-3 w-[80%] rounded bg-muted animate-pulse" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-destructive text-sm">
          Не вдалося завантажити превʼю урону
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-medium text-muted-foreground">
        Поточна шкода (середній урон за удар)
      </h4>
      <p className="text-xs text-muted-foreground">
        Модифікатор STR/DEX: (характеристика − 10) ÷ 2, округлення вниз. Ближній бій використовує STR, дальній — DEX.
      </p>
      <div className="space-y-4">
        <DamageBlock
          title="Ближній бій (melee)"
          data={data.melee}
          coefficient={meleeCoefficient}
          onCoefficientChange={onMeleeCoefficientChange}
          isDm={isDm}
        />
        <DamageBlock
          title="Дальній бій (ranged)"
          data={data.ranged}
          coefficient={rangedCoefficient}
          onCoefficientChange={onRangedCoefficientChange}
          isDm={isDm}
        />
      </div>
    </div>
  );
}
