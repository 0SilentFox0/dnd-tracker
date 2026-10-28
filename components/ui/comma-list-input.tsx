"use client";

import { useState } from "react";

import { Input } from "@/components/ui/input";
import { parseCommaList } from "@/lib/utils/common/text";

interface CommaListInputProps extends Omit<React.ComponentProps<typeof Input>, "value" | "onChange"> {
  value: string[];
  onChange: (next: string[]) => void;
}

export function CommaListInput({ value, onChange, placeholder = "Через кому", onBlur, ...rest }: CommaListInputProps) {
  const [text, setText] = useState(value.join(", "));

  const [seen, setSeen] = useState(value.join("\u0000"));

  const incoming = value.join("\u0000");

  if (incoming !== seen) {
    setSeen(incoming);

    if (incoming !== parseCommaList(text).join("\u0000")) setText(value.join(", "));
  }

  return (
    <Input
      {...rest}
      value={text}
      placeholder={placeholder}
      onChange={(e) => {
        const next = parseCommaList(e.target.value);

        setText(e.target.value);
        onChange(next);
      }}
      onBlur={(e) => {
        setText(value.join(", "));
        onBlur?.(e);
      }}
    />
  );
}
