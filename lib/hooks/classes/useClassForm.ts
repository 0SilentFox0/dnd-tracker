"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { useUpdateClass } from "./useClasses";

import { useAbilityValidity } from "@/lib/hooks/abilities";
import { useNavigateFresh } from "@/lib/hooks/common";
import type { ClassFormData } from "@/types/classes";

export function buildClassBody(data: ClassFormData): ClassFormData {
  return {
    ...data,
    name: data.name.trim(),
    icon: data.icon?.trim() || null,
    color: data.color?.trim() || null,
    spellcastingAbility: data.caster === "none" ? null : data.spellcastingAbility,
    subclassLevel: data.subclasses.length > 0 ? (data.subclassLevel ?? 3) : null,
  };
}

export function useClassForm(campaignId: string, classId: string, initial: ClassFormData) {
  const router = useRouter();

  const navigateFresh = useNavigateFresh();

  const update = useUpdateClass(campaignId);

  const [formData, setFormData] = useState<ClassFormData>(initial);

  const abilities = useAbilityValidity();

  const listHref = `/campaigns/${campaignId}/dm/classes`;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!abilities.valid) return;

    update.mutate({ classId, data: buildClassBody(formData) }, { onSuccess: () => navigateFresh(listHref) });
  };

  return {
    form: { data: formData, set: setFormData },
    abilities,
    status: { isSaving: update.isPending },
    actions: { submit, cancel: () => router.push(listHref) },
  };
}
