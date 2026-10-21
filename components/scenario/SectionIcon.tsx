import { BookOpen, Compass, KeyRound, type LucideIcon, MessagesSquare, ScrollText, Split, Swords, Tent } from "lucide-react";

import { SECTION_ICON_LABELS } from "@/lib/constants/scenario";
import type { SectionIconKey } from "@/types/scenario";

export const SECTION_ICON_COMPONENTS: Record<SectionIconKey, LucideIcon> = {
  scene: ScrollText, battle: Swords, secret: KeyRound, choice: Split, journey: Compass, dialogue: MessagesSquare, rest: Tent, prep: BookOpen,
};

export function SectionIcon({ name, className }: { name: SectionIconKey; className?: string }) {
  const Icon = SECTION_ICON_COMPONENTS[name];

  return <Icon data-section-icon={name} aria-label={SECTION_ICON_LABELS[name]} role="img" className={className} />;
}
