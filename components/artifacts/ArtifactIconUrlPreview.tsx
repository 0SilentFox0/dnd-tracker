"use client";

import { useMemo, useState } from "react";

import { cn } from "@/lib/utils";

function looksLikeHttpUrl(s: string): boolean {
  const t = s.trim();

  if (!t.startsWith("http://") && !t.startsWith("https://")) return false;

  try {
    new URL(t);

    return true;
  } catch {
    return false;
  }
}

export interface ArtifactIconUrlPreviewProps {
  url: string;
  className?: string;
}

export function ArtifactIconUrlPreview({
  url,
  className,
}: ArtifactIconUrlPreviewProps) {
  const [loadError, setLoadError] = useState(false);

  const trimmed = url.trim();

  const valid = useMemo(() => looksLikeHttpUrl(trimmed), [trimmed]);

  if (!trimmed) {
    return null;
  }

  if (!valid) {
    return (
      <p className={cn("text-xs text-muted-foreground", className)}>
        Вкажіть посилання, що починається з https:// або http://
      </p>
    );
  }

  if (loadError) {
    return (
      <p className={cn("text-xs text-destructive", className)}>
        Не вдалося показати прев’ю (блокування з боку сайту або не зображення).
      </p>
    );
  }

  return (
    <div
      className={cn(
        "mt-2 inline-flex max-w-full flex-col gap-1 rounded-md border bg-muted/30 p-2",
        className,
      )}
    >
      <span className="text-xs text-muted-foreground">Прев’ю</span>
      {/* eslint-disable-next-line @next/next/no-img-element -- довільні URL для DM */}
      <img
        src={trimmed}
        alt=""
        className="max-h-36 max-w-[220px] object-contain"
        onError={() => setLoadError(true)}
      />
    </div>
  );
}
