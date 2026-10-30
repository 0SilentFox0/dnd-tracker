import type { MentionType, ScenarioPageKind, ScenarioPageStatus } from "@/types/scenario";

export interface GraphNode {
  id: string;
  kind: "scene" | "entity";
  pageKind?: ScenarioPageKind;
  type?: MentionType;
  label: string;
  degree: number;
  missing: boolean;
  status?: ScenarioPageStatus;
  order?: number;
  refId: string;
  hidden: number;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  count: number;
  secret: boolean;
}

export interface GraphFilters {
  types: ReadonlySet<MentionType>;
  showAll: boolean;
  showLeaves: boolean;
  onlyMissing: boolean;
}

export interface GraphModel {
  nodes: GraphNode[];
  edges: GraphEdge[];
  truncated: number;
  entityTotal: number;
}

export interface GraphDetail {
  node: GraphNode & { x: number; y: number };
  links: { node: GraphNode; count: number; secret: boolean }[];
}
