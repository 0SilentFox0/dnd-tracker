"use client";

import { useRef } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useReadOnly } from "@/components/ui/read-only-context";
import { normalizeImageUrl } from "@/lib/utils/common/image-url";

const DEFAULT_MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB
const DEFAULT_ACCEPT = "image/jpeg,image/png,image/webp,image/gif";

export interface ImageUploadProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  maxSizeBytes?: number;
  accept?: string;
  previewAlt?: string;
  className?: string;
}

export function ImageUpload({
  value,
  onChange,
  label = "Картинка",
  placeholder = "Посилання на картинку (URL)",
  maxSizeBytes = DEFAULT_MAX_SIZE_BYTES,
  accept = DEFAULT_ACCEPT,
  previewAlt = "Попередній перегляд",
  className,
}: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const readOnly = useReadOnly();

  const previewSrc = value?.startsWith("data:")
    ? value
    : value
      ? normalizeImageUrl(value)
      : "";

  if (readOnly) {
    return (
      <div className={className}>
        {label && <Label>{label}</Label>}
        {value ? (
          <div className="mt-2">
            <div className="w-24 h-24 rounded-lg overflow-hidden bg-muted border shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewSrc}
                alt={previewAlt}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">—</p>
        )}
      </div>
    );
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (file.size > maxSizeBytes) {
      alert(
        `Файл завеликий. Максимум ${maxSizeBytes / 1024 / 1024} МБ.`
      );
      e.target.value = "";

      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      onChange(reader.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  return (
    <div className={className}>
      {label && <Label>{label}</Label>}
      <div className="mt-2 flex flex-col gap-2">
        <Input
          type="url"
          value={value?.startsWith("data:") ? "" : value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">або</span>
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            className="hidden"
            onChange={handleFileChange}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            Завантажити з комп&apos;ютера
          </Button>
          {value?.startsWith("data:") && (
            <span className="text-xs text-muted-foreground">
              (завантажено з файлу)
            </span>
          )}
        </div>
      </div>
      {value && (
        <div className="mt-2">
          <Label className="text-xs text-muted-foreground">
            Попередній перегляд
          </Label>
          <div className="mt-1 w-24 h-24 rounded-lg overflow-hidden bg-muted border shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element -- preview supports data URLs and any external URL */}
            <img
              src={previewSrc}
              alt={previewAlt}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
