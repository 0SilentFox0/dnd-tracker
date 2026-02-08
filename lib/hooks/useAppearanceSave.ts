"use client";

import { useState } from "react";

type EntityType = "skill" | "spell";

export function useAppearanceSave(
  campaignId: string,
  entityId: string,
  type: EntityType,
  initialValue: string
) {
  const [value, setValue] = useState(initialValue);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const path =
        type === "skill"
          ? `/api/campaigns/${campaignId}/skills/${entityId}`
          : `/api/campaigns/${campaignId}/spells/${entityId}`;
      const res = await fetch(path, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appearanceDescription: value || null }),
      });
      if (!res.ok) throw new Error("Не вдалося зберегти");
    } finally {
      setSaving(false);
    }
  };

  return { value, setValue, saving, save };
}
