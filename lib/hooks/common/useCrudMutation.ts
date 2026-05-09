"use client";

import {
  type QueryKey,
  useMutation,
  type UseMutationOptions,
  useQueryClient,
} from "@tanstack/react-query";

/**
 * Generic mutation hook з автоматичним `invalidateQueries` (CODE_AUDIT 2.4).
 *
 * Усуває ~15 повторів того самого `useMutation` з ручним
 * `queryClient.invalidateQueries` у lib/hooks/{units,battles,skills,characters,
 * artifacts,spells,races,campaigns}.
 *
 * Використання:
 *   const mutation = useCrudMutation({
 *     mutationFn: (id: string) => deleteUnit(campaignId, id),
 *     invalidateKeys: [["units", campaignId]],
 *   });
 *
 * Багатоключова інвалідація:
 *   useCrudMutation({
 *     mutationFn: () => deleteAllUnits(campaignId),
 *     invalidateKeys: [
 *       ["units", campaignId],
 *       ["unitGroups", campaignId],
 *     ],
 *   });
 *
 * Додатковий onSuccess/onError — викликається ПІСЛЯ invalidate (можна
 * додати toast, navigate, тощо).
 */
export function useCrudMutation<
  TData = unknown,
  TVariables = void,
  TError = Error,
  TContext = unknown,
>(options: {
  mutationFn: (variables: TVariables) => Promise<TData>;
  invalidateKeys: QueryKey[];
  onSuccess?: UseMutationOptions<TData, TError, TVariables, TContext>["onSuccess"];
  onError?: UseMutationOptions<TData, TError, TVariables, TContext>["onError"];
  onSettled?: UseMutationOptions<TData, TError, TVariables, TContext>["onSettled"];
}) {
  const queryClient = useQueryClient();

  const { mutationFn, invalidateKeys, onSuccess, onError, onSettled } = options;

  return useMutation<TData, TError, TVariables, TContext>({
    mutationFn,
    onSuccess: (data, variables, onMutateResult, context) => {
      for (const key of invalidateKeys) {
        queryClient.invalidateQueries({ queryKey: key });
      }

      onSuccess?.(data, variables, onMutateResult, context);
    },
    onError,
    onSettled,
  });
}
