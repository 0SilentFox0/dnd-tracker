"use client";

import type { SpellOnlyEditorProps } from "../spell-only-types";
import { SpellOnlyField } from "../SpellOnlyField";

export function CreateTerrainEditor({ effect, path, onChange }: SpellOnlyEditorProps<"createTerrain">) {
  const owner = { kind: "createTerrain", effect, path } as const;

  return (
    <>
      <SpellOnlyField owner={owner} field={{ name: "terrain", input: "select", options: ["wall", "difficult"] }} onChange={onChange} />
      <SpellOnlyField owner={owner} field={{ name: "shape", input: "select", options: ["cell", "line"] }} onChange={onChange} />
      <SpellOnlyField owner={owner} field={{ name: "cells", input: "number" }} onChange={onChange} />
      <SpellOnlyField owner={owner} field={{ name: "rounds", input: "number" }} onChange={onChange} />
    </>
  );
}
