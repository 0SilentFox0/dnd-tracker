import { OptimizedImage } from "@/components/common/OptimizedImage";
import { cn } from "@/lib/utils";

export interface EntityIconProps {
  src?: string | null;
  name: string;
  size?: number;
  className?: string;
}

export function EntityIcon({ src, name, size = 64, className }: EntityIconProps) {
  const letter = <span className="flex size-full items-center justify-center">{name.trim().charAt(0).toUpperCase() || "?"}</span>;

  return (
    <span className={cn("flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted text-muted-foreground", className)}>
      {src ? <OptimizedImage src={src} alt="" width={size} height={size} className="size-full object-cover" fallback={letter} /> : letter}
    </span>
  );
}
