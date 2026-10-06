"use client";

import { type ComponentProps, useState } from "react";

import { Input } from "@/components/ui/input";

type NumberInputProps = Omit<ComponentProps<typeof Input>, "type" | "value" | "defaultValue" | "onChange"> & {
  value: number | null | undefined;
  onChange: (value: number | undefined) => void;
};

const show = (value: number | null | undefined) => (value == null ? "" : String(value));

// undefined = empty field, null = unfinished input such as "-"
function parse(text: string): number | undefined | null {
  if (text.trim() === "") return undefined;

  const n = Number(text);

  return Number.isFinite(n) ? Math.trunc(n) : null;
}

export function NumberInput({ value, onChange, inputMode = "numeric", ...props }: NumberInputProps) {
  const [text, setText] = useState(() => show(value));

  const [seen, setSeen] = useState(value);

  if (value !== seen) {
    setSeen(value);

    if (parse(text) !== (value ?? undefined)) setText(show(value));
  }

  return (
    <Input
      {...props}
      inputMode={inputMode}
      value={text}
      onChange={(e) => {
        const next = e.target.value;

        setText(next);

        const n = parse(next);

        if (n !== null) onChange(n);
      }}
    />
  );
}
