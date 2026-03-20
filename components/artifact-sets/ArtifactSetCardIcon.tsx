"use client";

import { Layers } from "lucide-react";

import { cn } from "@/lib/utils";
import { normalizeImageUrl } from "@/lib/utils/common/image-url";

export interface ArtifactSetCardIconProps {
  url: string | null | undefined;
  name: string;
  className?: string;
  size?: "md" | "lg";
}

const frameClass = {
  md: "h-12 w-12",
  lg: "h-14 w-14",
} as const;

const placeholderIconClass = {
  md: "h-6 w-6",
  lg: "h-7 w-7",
} as const;

/** Плашка іконки сету в картці списку (URL з БД / Supabase). */
export function ArtifactSetCardIcon({
  url,
  name,
  className,
  size = "md",
}: ArtifactSetCardIconProps) {
  const trimmed = url?.trim();

  if (!trimmed) {
    return (
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-lg border bg-muted text-muted-foreground",
          frameClass[size],
          className,
        )}
        aria-hidden
      >
        <Layers className={placeholderIconClass[size]} />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "shrink-0 overflow-hidden rounded-lg border bg-muted",
        frameClass[size],
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- зовнішні та storage URL */}
      <img
        src={normalizeImageUrl(trimmed)}
        alt={`Іконка сету «${name}»`}
        className="h-full w-full object-cover"
        referrerPolicy="no-referrer"
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = "none";
        }}
      />
    </div>
  );
}
