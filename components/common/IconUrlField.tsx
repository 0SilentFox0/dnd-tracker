"use client";

import { useId } from "react";

import { EntityIcon } from "@/components/common/EntityIcon";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isHttpUrl } from "@/lib/utils/common/image-url";

export interface IconUrlFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  fallbackText: string;
  id?: string;
}

export function IconUrlField({ label, value, onChange, fallbackText, id }: IconUrlFieldProps) {
  const autoId = useId();

  const inputId = id ?? autoId;

  const url = value.trim();

  const fromFile = url.startsWith("data:");

  const invalid = url !== "" && !fromFile && !isHttpUrl(url);

  return (
    <div className="space-y-2">
      <Label htmlFor={inputId}>{label}</Label>
      <div className="flex items-center gap-3">
        <EntityIcon src={invalid ? null : url || null} name={fallbackText} size={64} className="size-16 rounded-lg border text-xl" />
        <Input
          id={inputId}
          type="url"
          value={fromFile ? "" : value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://example.com/icon.png"
          aria-invalid={invalid || undefined}
          className="flex-1"
        />
      </div>
      {invalid && <p className="text-xs text-destructive">Вкажіть посилання, що починається з https:// або http://</p>}
    </div>
  );
}
