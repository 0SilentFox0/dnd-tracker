"use client";

import { Layers } from "lucide-react";

import { EntityIcon } from "@/components/common/EntityIcon";
import { cn } from "@/lib/utils";

export interface ArtifactSetCardIconProps {
  url: string | null | undefined;
  name: string;
  className?: string;
  size?: "md" | "lg";
}

const SIZE = {
  md: { frame: "size-12", glyph: "size-6", px: 48 },
  lg: { frame: "size-14", glyph: "size-7", px: 56 },
} as const;

export function ArtifactSetCardIcon({ url, name, className, size = "md" }: ArtifactSetCardIconProps) {
  const { frame, glyph, px } = SIZE[size];

  return (
    <EntityIcon
      src={url?.trim()}
      name={name}
      alt={`Іконка сету «${name}»`}
      size={px}
      className={cn("rounded-lg border border-[#4a3c2c] bg-[#1a140f] text-[#8f8473]", frame, className)}
      fallback={<Layers className={glyph} aria-hidden />}
    />
  );
}
