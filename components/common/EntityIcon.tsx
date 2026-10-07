import type { ReactNode } from "react";

import { OptimizedImage } from "@/components/common/OptimizedImage";
import { cn } from "@/lib/utils";

export interface EntityIconProps {
  src?: string | null;
  name: string;
  size?: number;
  className?: string;
  fallback?: ReactNode;
  emoji?: boolean;
  alt?: string;
}

const isImageSrc = (src: string) => /^(https?:\/\/|\/|data:image\/|blob:)/.test(src.trim());

export function EntityIcon({ src, name, size = 64, className, fallback, emoji = false, alt = "" }: EntityIconProps) {
  const initial = fallback ?? <span className="flex size-full items-center justify-center">{name.trim().charAt(0).toUpperCase() || "?"}</span>;

  const content = !src ? initial : isImageSrc(src) ? <OptimizedImage src={src.trim()} alt={alt} width={size} height={size} className="size-full object-cover" fallback={initial} /> : emoji ? <span title={name}>{src}</span> : initial;

  return <span className={cn("flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted text-muted-foreground", className)}>{content}</span>;
}
