export type FieldInput = "number" | "text" | "select" | "multiselect" | "amount" | "flat" | "target" | "duration" | "effects" | "strings";

export interface FieldMeta {
  name: string;
  label: string;
  input: FieldInput;
  options?: readonly { value: string; label: string }[];
  optional?: boolean;
}

export const TARGET_FIELD: FieldMeta = { name: "target", label: "Ціль", input: "target", optional: true };

export const DURATION_FIELD: FieldMeta = { name: "duration", label: "Тривалість (раунди)", input: "duration", optional: true };
