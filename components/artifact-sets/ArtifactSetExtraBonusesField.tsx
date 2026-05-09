"use client";

import { Plus, Trash2 } from "lucide-react";

import type { ArtifactSetExtraBonusRow } from "./artifact-set-bonus-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  extraBonuses: ArtifactSetExtraBonusRow[];
  onChange: (next: ArtifactSetExtraBonusRow[]) => void;
}

export function ArtifactSetExtraBonusesField({
  extraBonuses,
  onChange,
}: Props) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">Додаткові плоскі бонуси</p>
          <p className="text-xs text-muted-foreground">
            Довільний ключ у об&apos;єкті bonuses (якщо потрібно щось поза списком вище).
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange([...extraBonuses, { key: "", value: 0 }])}
        >
          <Plus className="mr-1 h-4 w-4" />
          Рядок
        </Button>
      </div>
      {extraBonuses.length === 0 ? (
        <p className="text-sm text-muted-foreground">Немає додаткових ключів</p>
      ) : (
        <div className="space-y-2">
          {extraBonuses.map((row, i) => (
            <div
              key={i}
              className="flex flex-col gap-2 rounded-md border bg-muted/10 p-2 sm:flex-row sm:items-end"
            >
              <div className="min-w-0 flex-1 space-y-1">
                <Label className="text-xs text-muted-foreground">Ключ</Label>
                <Input
                  value={row.key}
                  onChange={(e) => {
                    const next = [...extraBonuses];

                    next[i] = { ...row, key: e.target.value };

                    onChange(next);
                  }}
                  placeholder="customStat"
                  className="font-mono text-sm"
                />
              </div>
              <div className="w-28 space-y-1">
                <Label className="text-xs text-muted-foreground">Значення</Label>
                <Input
                  type="number"
                  value={String(row.value)}
                  onChange={(e) => {
                    const next = [...extraBonuses];

                    next[i] = {
                      ...row,
                      value:
                        e.target.value === "" ? 0 : parseFloat(e.target.value),
                    };

                    onChange(next);
                  }}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0"
                onClick={() => onChange(extraBonuses.filter((_, j) => j !== i))}
                aria-label="Видалити рядок"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
