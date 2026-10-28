import type { CALLOUT_KINDS, LEGEND_KINDS, MARK_TYPES, MENTION_TYPES, NODE_TYPES, PAGE_KINDS, PAGE_STATUSES, SECTION_ICON_KEYS } from "@/lib/constants/scenario";

export type ScenarioPageKind = (typeof PAGE_KINDS)[number];
export type ScenarioPageStatus = (typeof PAGE_STATUSES)[number];
export type CalloutKind = (typeof CALLOUT_KINDS)[number];
export type LegendKind = (typeof LEGEND_KINDS)[number];
export type MentionType = (typeof MENTION_TYPES)[number];
export type RichNodeType = (typeof NODE_TYPES)[number];
export type RichMarkType = (typeof MARK_TYPES)[number];
export type SectionIconKey = (typeof SECTION_ICON_KEYS)[number];

export interface RichMark {
  type: RichMarkType;
  attrs?: Record<string, unknown>;
}

export interface RichNode {
  type: RichNodeType;
  attrs?: Record<string, unknown>;
  content?: RichNode[];
  marks?: RichMark[];
  text?: string;
}

export interface RichDoc {
  type: "doc";
  content: RichNode[];
}

export interface ScenarioRowSlide {
  deckId: string;
  slideId: string;
}

export interface ScenarioRow {
  id: string;
  story: RichDoc;
  notes: RichDoc;
  slide?: ScenarioRowSlide;
  battleId?: string;
}

export type RevealRule = { mode: "manual" } | { mode: "afterSection"; pageId: string; sectionId: string };

export interface ScenarioSection {
  id: string;
  title: string;
  played: boolean;
  icon?: SectionIconKey;
  reveal?: RevealRule;
  revealedAt?: string | null;
  rows: ScenarioRow[];
}

export interface LegendEntry {
  kind: LegendKind;
  label: string;
}

export interface ScenarioContent {
  legend: LegendEntry[];
  sections: ScenarioSection[];
}

export interface ScenarioPageSummary {
  id: string;
  kind: ScenarioPageKind;
  arc: string | null;
  title: string;
  subtitle: string | null;
  status: ScenarioPageStatus;
  sortOrder: number;
  characterId: string | null;
  version: number;
  updatedAt: string;
}

export interface ScenarioPage extends ScenarioPageSummary {
  content: ScenarioContent;
}

export interface ScenarioVersionSummary {
  id: string;
  createdAt: string;
  createdBy: string;
}

export interface ScenarioSearchHit {
  pageId: string;
  pageTitle: string;
  sectionId: string | null;
  snippet: string;
}

export interface MentionOption {
  type: MentionType;
  id: string;
  label: string;
}

export interface StoryChapter {
  id: string;
  title: string;
  rows: RichDoc[];
}

export interface CreateScenarioPageData {
  kind: ScenarioPageKind;
  title: string;
  arc?: string | null;
  subtitle?: string | null;
  characterId?: string | null;
}

export interface UpdateScenarioMetaData extends Partial<CreateScenarioPageData> {
  status?: ScenarioPageStatus;
  sortOrder?: number;
}

export interface SaveScenarioContentData {
  expectedVersion: number;
  content: ScenarioContent;
}

export interface ScenarioSectionPatch {
  played?: boolean;
  revealed?: boolean;
}

export interface ScenarioIndexGroups {
  arcs: { arc: string; pages: (ScenarioPageSummary & { number: number })[] }[];
  heroes: ScenarioPageSummary[];
  notes: ScenarioPageSummary[];
}
