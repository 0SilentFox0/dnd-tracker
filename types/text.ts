export type TextArg = string | number | TextRef;

/** A full translation key with params (params may nest refs), or plain content text where a `LogLine` allows a string. */
export interface TextRef {
  message: string;
  params?: Record<string, TextArg>;
}

/** `string` = legacy or content text, shown as is. */
export type LogLine = string | TextRef;
