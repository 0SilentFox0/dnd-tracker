import { useTranslations } from "next-intl";
import type { LucideIcon } from "lucide-react";
import { Trash2,X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { WORLD_NAME_MAX } from "@/lib/constants/world";

export const ROW = "hud-scroll-x flex min-h-12 items-center gap-x-2 gap-y-2 overflow-x-auto px-2 py-1.5 max-lg:flex-wrap";

export const CHIP = "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-hud-rule bg-black/40 px-2.5 text-sm text-hud-ink hover:border-[var(--gold)] disabled:opacity-40";

export const MEDALLION = "metal-gold metal-fill flex size-9 shrink-0 items-center justify-center rounded-full border border-[var(--gold)]";

export const POPOVER = "border-hud-rule bg-[rgba(17,14,11,.99)]";

export function CloseButton({ onClose }: { onClose(): void }) {
  const t = useTranslations("world.editor");

  return (
    <button type="button" aria-label={t("closePanel")} onClick={onClose} className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-hud-rule text-hud-muted hover:bg-white/10 hover:text-hud-ink">
      <X className="size-4" aria-hidden />
    </button>
  );
}

export function DeleteButton({ label, onClick }: { label: string; onClick(): void }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-hud-danger/60 bg-hud-danger/20 px-3 text-sm font-medium text-hud-danger transition-colors hover:bg-hud-danger/30 hover:text-hud-bad">
      <Trash2 className="size-4" aria-hidden />
      {label}
    </button>
  );
}

export function SwitchField({ label, title, checked, onChange }: { label: string; title?: string; checked: boolean; onChange(v: boolean): void }) {
  return (
    <label title={title} className="flex shrink-0 items-center gap-2 text-sm">
      <Switch checked={checked} onCheckedChange={onChange} />
      {label}
    </label>
  );
}

export function NameInput({ value, onChange, onCommit }: { value: string; onChange(v: string): void; onCommit(): void }) {
  const t = useTranslations("world");

  return (
    <Input
      aria-label={t("name")}
      className="h-9 w-44 shrink-0"
      maxLength={WORLD_NAME_MAX}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onCommit}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
    />
  );
}

export function StripLead({ icon: Icon, label, labelClassName = "" }: { icon: LucideIcon; label: string; labelClassName?: string }) {
  return (
    <span className="flex shrink-0 items-center gap-2">
      <span className={MEDALLION}>
        <Icon className="size-4 text-[#2a1d05]" aria-hidden />
      </span>
      <span className={`hud-sc text-xs text-hud-muted ${labelClassName}`}>{label}</span>
    </span>
  );
}
