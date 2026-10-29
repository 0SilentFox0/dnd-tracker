import { useState } from "react";

import type { AcquaintanceKind } from "@/types/acquaintances";

export type Section = { id: string; title: string };

export interface Fields {
  kind: AcquaintanceKind;
  characterId: string;
  name: string;
  description: string;
  avatarUrl: string;
}

export const FORM_ID = "acquaintance-form";

export const sectionTitle = (sections: Section[], pageId: string, sectionId: string, currentPageId: string, otherPage: string) =>
  pageId !== currentPageId ? otherPage : (sections.find((s) => s.id === sectionId)?.title ?? otherPage);

export const canSubmit = (f: Fields) => !!f.name.trim() && (f.kind !== "character" || !!f.characterId);

export const payload = (f: Fields) => ({ kind: f.kind, characterId: f.kind === "character" ? f.characterId : null, name: f.name.trim(), ...(f.kind === "micro" && { description: f.description, avatarUrl: f.avatarUrl.trim() || null }) });

export function useFields(initial: Fields) {
  const [fields, setFields] = useState(initial);

  return [fields, (patch: Partial<Fields>) => setFields((f) => ({ ...f, ...patch }))] as const;
}

