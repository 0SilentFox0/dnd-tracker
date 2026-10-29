import { useTranslations } from "next-intl";
import { BookOpen, Compass, KeyRound, type LucideIcon, MessagesSquare, ScrollText, Split, Swords, Tent } from "lucide-react";

import type { SectionIconKey } from "@/types/scenario";

const SECTION_ICON_COMPONENTS: Record<SectionIconKey, LucideIcon> = {
  scene: ScrollText, battle: Swords, secret: KeyRound, choice: Split, journey: Compass, dialogue: MessagesSquare, rest: Tent, prep: BookOpen,
};

export function SectionIcon({ name, className }: { name: SectionIconKey; className?: string }) {
  const t = useTranslations("scenario.sectionIcons");

  const Icon = SECTION_ICON_COMPONENTS[name];

  return <Icon data-section-icon={name} aria-label={t(name)} role="img" className={className} />;
}
