import type { ACQUAINTANCE_KINDS } from "@/lib/constants/acquaintances";

export type {
  CreateAcquaintanceData,
  CreateAcquaintanceEntryData,
  SaveAcquaintanceNoteData,
  UpdateAcquaintanceData,
  UpdateAcquaintanceEntryData,
} from "@/lib/schemas/acquaintances";

export type AcquaintanceKind = (typeof ACQUAINTANCE_KINDS)[number];

export interface AcquaintanceEntryView {
  id: string;
  pageId: string;
  sectionId: string;
  text: string;
  sortOrder: number;
  hidden: boolean;
}

export interface AcquaintanceNoteView {
  id: string;
  authorUserId: string;
  authorName: string;
  text: string;
  updatedAt: string;
  own: boolean;
}

export interface AcquaintanceView {
  id: string;
  kind: AcquaintanceKind;
  characterId: string | null;
  name: string;
  avatarUrl: string | null;
  description: string;
  sourcePageId: string;
  sourceSectionId: string;
  hidden: boolean;
  entries: AcquaintanceEntryView[];
  notes: AcquaintanceNoteView[];
}

export interface AcquaintancesResponse {
  isDM: boolean;
  enabled: boolean;
  items: AcquaintanceView[];
}
