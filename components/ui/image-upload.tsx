"use client";

import { useRef } from "react";

import { IconUrlField } from "@/components/common/IconUrlField";
import { Button } from "@/components/ui/button";
import { useNotify } from "@/lib/hooks/common";

const MAX_SIZE_BYTES = 3 * 1024 * 1024;

const ACCEPT = "image/jpeg,image/png,image/webp,image/gif";

export interface ImageUploadProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  fallbackText?: string;
  allowFile?: boolean;
}

export function ImageUpload({ value, onChange, label = "Картинка", fallbackText = "?", allowFile = true }: ImageUploadProps) {
  const notify = useNotify();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (file.size > MAX_SIZE_BYTES) {
      void notify(`Файл завеликий. Максимум ${MAX_SIZE_BYTES / 1024 / 1024} МБ.`);
      e.target.value = "";

      return;
    }

    const reader = new FileReader();

    reader.onload = () => onChange(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  return (
    <div className="space-y-2">
      <IconUrlField label={label} value={value} onChange={onChange} fallbackText={fallbackText} />
      {allowFile && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">або</span>
          <input ref={fileInputRef} type="file" accept={ACCEPT} className="hidden" onChange={handleFileChange} />
          <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
            Завантажити з комп&apos;ютера
          </Button>
          {value.startsWith("data:") && <span className="text-xs text-muted-foreground">(завантажено з файлу)</span>}
        </div>
      )}
    </div>
  );
}
