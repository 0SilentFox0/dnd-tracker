import type { ReactNode } from "react";

import type { ArtifactGridSlotKey } from "@/lib/constants/artifacts";

const stroke = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinejoin: "round", strokeLinecap: "round", "aria-hidden": true } as const;

export const SLOT_SILHOUETTES: Record<ArtifactGridSlotKey, ReactNode> = {
  ring1: (
    <svg {...stroke}>
      <circle cx="12" cy="15" r="6" />
      <path d="M9 6l3-3 3 3-3 3z" fill="currentColor" />
    </svg>
  ),
  helmet: (
    <svg {...stroke}>
      <path d="M4 15a8 8 0 0116 0v4H4z" />
      <path d="M12 7v7M8 15h8" />
    </svg>
  ),
  necklace: (
    <svg {...stroke}>
      <path d="M5 4c0 9 3 12 7 12s7-3 7-12" />
      <path d="M12 16l-2.5 3.5L12 22l2.5-2.5z" fill="currentColor" />
    </svg>
  ),
  range_weapon: (
    <svg {...stroke}>
      <path d="M6 3c8 3 8 15 0 18" />
      <path d="M6 3v18M6 12h14M16 9l4 3-4 3" />
    </svg>
  ),
  armor: (
    <svg {...stroke}>
      <path d="M8 3l-5 4 2 4 3-1v11h8V10l3 1 2-4-5-4c-1 2-2 3-4 3S9 5 8 3z" />
    </svg>
  ),
  shield: (
    <svg {...stroke}>
      <path d="M12 3l8 3v6c0 5-4 8-8 10-4-2-8-5-8-10V6z" />
      <path d="M12 3v19" />
    </svg>
  ),
  weapon: (
    <svg {...stroke}>
      <path d="M14 3h7v7L10 21l-3-3z" />
      <path d="M4 17l3 3M5 22l-3-3 2-2" />
    </svg>
  ),
  boots: (
    <svg {...stroke}>
      <path d="M8 3h6v9l6 3v5H5v-5l3-1z" />
    </svg>
  ),
  cape: (
    <svg {...stroke}>
      <path d="M8 3h8l4 17c-4-2-12-2-16 0z" />
      <path d="M9 3c0 3 6 3 6 0" />
    </svg>
  ),
};
