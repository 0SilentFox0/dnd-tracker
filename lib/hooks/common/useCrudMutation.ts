"use client";

import {
  type QueryKey,
  useMutation,
  type UseMutationOptions,
  useQueryClient,
} from "@tanstack/react-query";

// useMutation + invalidateQueries for every key; extra onSuccess runs after invalidation
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
