"use client";

import { useCallback } from "react";
import {
  type QueryKey,
  useMutation,
  type UseMutationOptions,
  useQueryClient,
} from "@tanstack/react-query";

import { useOptionalNotify } from "./useNotify";

type Options<TData, TError, TVariables, TContext> = UseMutationOptions<TData, TError, TVariables, TContext>;

// useMutation + invalidateQueries for every key; extra onSuccess runs after invalidation
export function useCrudMutation<
  TData = unknown,
  TVariables = void,
  TError = Error,
  TContext = unknown,
>(options: {
  mutationFn: (variables: TVariables) => Promise<TData>;
  invalidateKeys?: QueryKey[] | ((data: TData, variables: TVariables) => QueryKey[]);
  /** shown in a notice when the mutation fails */
  errorText?: string;
  onMutate?: Options<TData, TError, TVariables, TContext>["onMutate"];
  onSuccess?: Options<TData, TError, TVariables, TContext>["onSuccess"];
  onError?: Options<TData, TError, TVariables, TContext>["onError"];
  onSettled?: Options<TData, TError, TVariables, TContext>["onSettled"];
}) {
  const queryClient = useQueryClient();

  const notify = useOptionalNotify();

  const { mutationFn, invalidateKeys = [], errorText, onMutate, onSuccess, onError, onSettled } = options;

  const mutation = useMutation<TData, TError, TVariables, TContext>({
    mutationFn,
    onMutate,
    onSuccess: (data, variables, onMutateResult, context) => {
      const keys = typeof invalidateKeys === "function" ? invalidateKeys(data, variables) : invalidateKeys;

      for (const key of keys) {
        void queryClient.invalidateQueries({ queryKey: key });
      }

      onSuccess?.(data, variables, onMutateResult, context);
    },
    onError: (error, variables, onMutateResult, context) => {
      onError?.(error, variables, onMutateResult, context);

      if (errorText) notify(errorText);
    },
    onSettled,
  });

  const { mutateAsync } = mutation;

  // resolves false on failure instead of rejecting — the error is already in state (and notified with errorText)
  const mutateOk = useCallback((variables: TVariables) => mutateAsync(variables).then(() => true, () => false), [mutateAsync]);

  return { ...mutation, mutateOk };
}
