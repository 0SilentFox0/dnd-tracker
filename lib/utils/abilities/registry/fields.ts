export type FieldInput =
  | "number"
  | "text"
  | "select"
  | "multiselect"
  | "amount"
  | "flat"
  | "target"
  | "duration"
  | "effects"
  | "strings"
  | "toggle"
  | "numberList"
  | "spells"
  | "unit"
  | "saveEnds";

export interface FieldMeta {
  name: string;
  input: FieldInput;
  options?: readonly { value: string }[];
  optional?: boolean;
  visibleWhen?: (value: Record<string, unknown>) => boolean;
}

export const TARGET_FIELD: FieldMeta = { name: "target", input: "target", optional: true };


export const DURATION_FIELD: FieldMeta = { name: "duration", input: "duration", optional: true };

export interface LocalizedFieldMeta extends Omit<FieldMeta, "options"> {
  label: string;
  options?: readonly { value: string; label: string; group?: string }[];
}
