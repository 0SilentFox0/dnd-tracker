"use client";

import { useState } from "react";

import type { FieldProps } from "./FieldRenderer";

import { Input } from "@/components/ui/input";

type Range = { maxFeet: number; dice: string };

const show = (value: Range[] | undefined) => (value ?? []).map((r) => `${r.maxFeet}:${r.dice}`).join(", ");

export function DistanceDiceField({ id, value, onChange }: FieldProps<Range[] | undefined>) {
  const [draft, setDraft] = useState<string | null>(null);

  return (
    <Input
      id={id}
      placeholder="10:5d6, 60:4d6, 120:3d6"
      value={draft ?? show(value)}
      onChange={(e) => {
        setDraft(e.target.value);

        const ranges = e.target.value.split(",").flatMap((part) => {
          const [feet, dice] = part.split(":").map((x) => x.trim());

          return Number(feet) > 0 && dice ? [{ maxFeet: Number(feet), dice }] : [];
        });

        onChange(ranges.length ? ranges : undefined);
      }}
      onBlur={() => setDraft(null)}
    />
  );
}
