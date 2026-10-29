"use client";

import type { Section } from "./acquaintance-fields";
import type { AcquaintanceDialogTarget } from "./acquaintance-target";
import { AcquaintanceCreateBody } from "./AcquaintanceCreateBody";
import { AcquaintanceEditBody } from "./AcquaintanceEditBody";

export type { AcquaintanceDialogTarget } from "./acquaintance-target";

interface Props {
  campaignId: string;
  target: AcquaintanceDialogTarget;
  sections: Section[];
  onInsert: (mention: { id: string; label: string }) => void;
  onClose: () => void;
}

export function AcquaintanceDialog(props: Props) {
  const { target } = props;

  return target.mode === "create" ? <AcquaintanceCreateBody {...props} target={target} /> : <AcquaintanceEditBody {...props} target={target} />;
}
