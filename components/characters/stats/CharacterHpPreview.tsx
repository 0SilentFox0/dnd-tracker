"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { SheetTotal } from "@/types/characters";

interface CharacterHpPreviewProps {
  hp: SheetTotal;
  coefficient: number;
  onCoefficientChange: (value: number) => void;
}

export function CharacterHpPreview({ hp, coefficient, onCoefficientChange }: CharacterHpPreviewProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1.5">
            <CardTitle className="text-base">Здоровʼя (HP)</CardTitle>
            <CardDescription>Як у бою: рівень, сила, коефіцієнт і бонуси. Оновлюється після збереження.</CardDescription>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <span className="whitespace-nowrap text-xs text-muted-foreground">×</span>
            <Input
              aria-label="Коефіцієнт HP"
              type="number"
              min={0.1}
              max={3}
              step={0.1}
              className="h-8 w-24 text-left tabular-nums"
              value={coefficient}
              onChange={(e) => {
                const v = parseFloat(e.target.value);

                if (!Number.isNaN(v) && v >= 0.1 && v <= 3) onCoefficientChange(v);
              }}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-2xl font-semibold tabular-nums">{hp.total}</p>
        {hp.lines.length > 0 && (
          <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
            {hp.lines.map((line, i) => (
              <li key={i}>{line.value ? `${line.label} ${line.value}` : line.label}</li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
