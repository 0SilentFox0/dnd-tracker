"use client";

import type { SpellOnlyEditorProps } from "../spell-only-types";
import { SpellOnlyField } from "../SpellOnlyField";

export function InputDiceEditor({ effect, path, onChange }: SpellOnlyEditorProps<"inputDice">) {
  const owner = { kind: "inputDice", effect, path } as const;

  return (
    <>
      <SpellOnlyField owner={owner} field={{ name: "label", input: "text" }} onChange={onChange} />
      <SpellOnlyField owner={owner} field={{ name: "max", input: "number" }} onChange={onChange} />
    </>
  );
}
