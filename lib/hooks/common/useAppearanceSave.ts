"use client";

import { useState } from "react";

import { updateSkillAppearance } from "@/lib/api/skills";
import { updateSpellAppearance } from "@/lib/api/spells";

type EntityType = "skill" | "spell";

export function useAppearanceSave(
  campaignId: string,
  entityId: string,
  type: EntityType,
  initialValue: string,
) {
  const [value, setValue] = useState(initialValue);

  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      if (type === "skill") {
        await updateSkillAppearance(campaignId, entityId, value || null);
      } else {
        await updateSpellAppearance(campaignId, entityId, value || null);
      }
    } finally {
      setSaving(false);
    }
  };

  return { value, setValue, saving, save };
}
