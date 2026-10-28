"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { campaignKeys } from "./keys";

import { getTemplates } from "@/lib/api/templates";
import { REFERENCE_STALE_MS } from "@/lib/providers/query-provider";
import type { TemplateList, TemplateSelection } from "@/types/campaigns";

const EMPTY_TEMPLATE_NAME = "Порожня";

export function useTemplates() {
  return useQuery({ queryKey: campaignKeys.templates(), queryFn: getTemplates, staleTime: REFERENCE_STALE_MS });
}

const defaultSelection = (templates: TemplateList | undefined): TemplateSelection => ({
  templateId: templates?.official.find((t) => t.name === EMPTY_TEMPLATE_NAME)?.id ?? null,
});

export function useTemplateSelection() {
  const templates = useTemplates();

  const [chosen, setChosen] = useState<TemplateSelection | null>(null);

  const selection = chosen ?? defaultSelection(templates.data);

  const all = [...(templates.data?.official ?? []), ...(templates.data?.mine ?? [])];

  const name = selection.file?.name.replace(/\.json$/i, "") ?? all.find((t) => t.id === selection.templateId)?.name;

  return { selection, setSelection: setChosen, name, isLoading: templates.isLoading };
}
