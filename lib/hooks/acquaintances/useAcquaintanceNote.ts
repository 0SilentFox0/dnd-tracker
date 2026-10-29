"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { acquaintanceKeys } from "./keys";

import { saveAcquaintanceNote } from "@/lib/api/acquaintances";
import { useOptionalNotify } from "@/lib/hooks/common";
import type { AcquaintanceNoteView, AcquaintancesResponse } from "@/types/acquaintances";

function withOwnNote(data: AcquaintancesResponse | undefined, acquaintanceId: string, text: string): AcquaintancesResponse | undefined {
  if (!data) return data;

  const draft = (n?: AcquaintanceNoteView): AcquaintanceNoteView => ({ id: n?.id ?? "pending", authorUserId: n?.authorUserId ?? "", authorName: n?.authorName ?? "", updatedAt: new Date().toISOString(), ...n, text, own: true });

  return {
    ...data,
    items: data.items.map((a) => {
      if (a.id !== acquaintanceId) return a;

      const rest = a.notes.filter((n) => !n.own);

      return { ...a, notes: text.trim() ? [...rest, draft(a.notes.find((n) => n.own))] : rest };
    }),
  };
}

export function useAcquaintanceNote(campaignId: string, acquaintanceId: string) {
  const queryClient = useQueryClient();

  const key = acquaintanceKeys.list(campaignId);

  const notify = useOptionalNotify();

  const mutation = useMutation({
    mutationFn: (text: string) => saveAcquaintanceNote(campaignId, acquaintanceId, { text }),
    onMutate: async (text) => {
      await queryClient.cancelQueries({ queryKey: key });

      const previous = queryClient.getQueryData<AcquaintancesResponse>(key);

      queryClient.setQueryData<AcquaintancesResponse>(key, (data) => withOwnNote(data, acquaintanceId, text));

      return { previous };
    },
    onError: (_error, _text, context) => {
      queryClient.setQueryData(key, context?.previous);
      notify("Не вдалося зберегти нотатку");
    },
    onSettled: () => void queryClient.invalidateQueries({ queryKey: key }),
  });

  return { save: (text: string) => mutation.mutateAsync(text).then(() => undefined, () => undefined), isPending: mutation.isPending };
}
