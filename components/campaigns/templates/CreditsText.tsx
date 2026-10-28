import { cn } from "@/lib/utils";

export function CreditsText({ credits, className }: { credits: string; className?: string }) {
  return <p className={cn("whitespace-pre-line break-words text-xs leading-5 text-hud-muted", className)}>{credits}</p>;
}
