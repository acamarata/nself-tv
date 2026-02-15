import { useCallback, useMemo, useState } from 'react';

type QueryState<TData = unknown> = {
  data?: TData;
  loading: boolean;
  error?: Error;
};

type MutationState<TData = unknown> = QueryState<TData>;

type MutationFn<TData = unknown, TVariables = Record<string, unknown>> = (
  _options?: { variables?: TVariables }
) => Promise<{ data?: TData }>;

type LazyQueryFn<TData = unknown, TVariables = Record<string, unknown>> = (
  _options?: { variables?: TVariables }
) => Promise<{ data?: TData }>;

type QueryOptions<TVariables = Record<string, unknown>> = {
  variables?: TVariables;
  skip?: boolean;
};

export function gql(strings: TemplateStringsArray, ...expressions: unknown[]) {
  return strings.reduce((acc, part, index) => {
    const expr = index < expressions.length ? String(expressions[index]) : '';
    return acc + part + expr;
  }, '');
}

export function useQuery<TData = unknown, TVariables = Record<string, unknown>>(
  _query: unknown,
  options?: QueryOptions<TVariables>
): QueryState<TData> {
  const skipped = options?.skip ?? false;
  return useMemo(
    () => ({
      data: undefined,
      loading: !skipped && Boolean(options?.variables && false),
      error: undefined,
    }),
    [skipped, options?.variables]
  );
}

export function useLazyQuery<TData = unknown, TVariables = Record<string, unknown>>(
  _query: unknown
): [LazyQueryFn<TData, TVariables>, QueryState<TData>] {
  const [state] = useState<QueryState<TData>>({
    data: undefined,
    loading: false,
    error: undefined,
  });

  const run = useCallback<LazyQueryFn<TData, TVariables>>(async () => {
    return { data: undefined };
  }, []);

  return [run, state];
}

export function useMutation<TData = unknown, TVariables = Record<string, unknown>>(
  _mutation: unknown
): [MutationFn<TData, TVariables>, MutationState<TData>] {
  const [state] = useState<MutationState<TData>>({
    data: undefined,
    loading: false,
    error: undefined,
  });

  const run = useCallback<MutationFn<TData, TVariables>>(async () => {
    return { data: undefined };
  }, []);

  return [run, state];
}
