export type ImportKind = "units" | "spells" | "skills" | "main-skills" | "spell-groups" | "races" | "classes" | "artifacts" | "artifact-sets";

export type ImportMode = "create" | "update" | "skip";

export type ImportFieldType = "string" | "int" | "number" | "bool" | "enum" | "list" | "dice" | "cr" | "ref" | "refList" | "json" | "attacks" | "abilitiesText";

export interface ImportField {
  key: string;
  label: string;
  aliases: readonly string[];
  type: ImportFieldType;
  enumValues?: readonly string[];
  /** accepted labels per enum value; the first one is shown in hints */
  enumLabels?: Readonly<Record<string, readonly string[]>>;
  /** words accepted instead of a number (normalized header form), e.g. "cantrip" -> 0 */
  numberWords?: Readonly<Record<string, number>>;
  ref?: ImportKind;
  required?: boolean;
  examples: readonly [string, string];
}

export type ImportRecord = Record<string, unknown>;

export interface ImportSpec {
  kind: ImportKind;
  label: string;
  fields: readonly ImportField[];
  toBody?: (record: ImportRecord, op: "create" | "update") => ImportRecord;
}

export type ImportMapping = Record<string, string | null>;

export interface ImportIssue {
  field?: string;
  level: "error" | "warning";
  message: string;
}

export type ImportRowStatus = "created" | "updated" | "skipped" | "error";

export interface ImportRowResult {
  row: number;
  status: ImportRowStatus;
  name?: string;
  issues: ImportIssue[];
}

export type ImportCounts = Record<ImportRowStatus, number>;

export interface ImportReport {
  dryRun: boolean;
  results: ImportRowResult[];
  counts: ImportCounts;
}

export interface ParsedTable {
  format: "csv" | "json";
  headers: string[];
  rows: Array<Record<string, unknown>>;
}

export interface AiMapResult {
  mapping: ImportMapping;
  notes: string[];
}
