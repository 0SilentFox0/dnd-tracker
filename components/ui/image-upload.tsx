"use client";

import { useRef } from "react";

import { IconUrlField } from "@/components/common/IconUrlField";
import { Button } from "@/components/ui/button";
import { useNotify } from "@/lib/hooks/common";
import { resizeImageToDataUrl } from "@/lib/utils/common/image-resize";

const MAX_SIZE_BYTES = 3 * 1024 * 1024;

const MAX_RESIZABLE_SIZE_BYTES = 15 * 1024 * 1024;

const ACCEPT = "image/jpeg,image/png,image/webp,image/gif";

export interface ImageUploadProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  fallbackText?: string;
  allowFile?: boolean;
  maxSide?: number;
}

export function ImageUpload({ value, onChange, label = "Картинка", fallbackText = "?", allowFile = true, maxSide }: ImageUploadProps) {
  const notify = useNotify();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file) return;

    const limit = maxSide ? MAX_RESIZABLE_SIZE_BYTES : MAX_SIZE_BYTES;

    if (file.size > limit) {
      void notify(`Файл завеликий. Максимум ${limit / 1024 / 1024} МБ.`);
      e.target.value = "";

      return;
    }

    if (maxSide) {
      resizeImageToDataUrl(file, maxSide).then(onChange, () => void notify("Не вдалося обробити зображення"));
    } else {
      const reader = new FileReader();

      reader.onload = () => onChange(reader.result as string);
      reader.readAsDataURL(file);
    }

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
