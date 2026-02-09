"use client";

import { useQuery } from "@tanstack/react-query";

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
  rangedMultiplier: number
): Promise<DamagePreviewResponse> {
  const params = new URLSearchParams();
  if (meleeMultiplier !== 1) params.set("meleeMultiplier", String(meleeMultiplier));
  if (rangedMultiplier !== 1) params.set("rangedMultiplier", String(rangedMultiplier));
  const qs = params.toString();
  const url = `/api/campaigns/${campaignId}/characters/${characterId}/damage-preview${qs ? `?${qs}` : ""}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to load damage preview");
  return res.json();
}

function DamageBlock({
  title,
  data,
  typeLabel,
  coefficient = 1,
  onCoefficientChange,
  isDm,
}: {
  title: string;
  data: DamagePreviewItem;
  typeLabel: string;
  coefficient?: number;
  onCoefficientChange?: (value: number) => void;
  isDm?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
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
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-xs text-muted-foreground whitespace-nowrap">×</span>
              <Input
                type="number"
                min={0.1}
                max={3}
                step={0.1}
                className="h-8 w-14 text-right tabular-nums"
                value={coefficient}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  if (!Number.isNaN(v) && v >= 0.1 && v <= 3) onCoefficientChange?.(v);
                }}
              />
            </div>
          )}
        </div>
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
    queryKey: ["character-damage-preview", campaignId, characterId, meleeCoefficient, rangedCoefficient],
    queryFn: () => fetchDamagePreview(campaignId, characterId, meleeCoefficient, rangedCoefficient),
    enabled: !!campaignId && !!characterId,
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-muted-foreground text-sm">
          Завантаження урону…
        </CardContent>
      </Card>
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
      <div className="grid gap-4 sm:grid-cols-2">
        <DamageBlock
          title="Ближній бій (melee)"
          data={data.melee}
          typeLabel="ближнього бою"
          coefficient={meleeCoefficient}
          onCoefficientChange={onMeleeCoefficientChange}
          isDm={isDm}
        />
        <DamageBlock
          title="Дальній бій (ranged)"
          data={data.ranged}
          typeLabel="дальнього бою"
          coefficient={rangedCoefficient}
          onCoefficientChange={onRangedCoefficientChange}
          isDm={isDm}
        />
      </div>
    </div>
  );
}
