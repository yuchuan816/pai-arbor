import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { formatClientError, showErrorToast } from '@/lib/client/show-error-toast';

export function createAppQueryClient(): QueryClient {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => {
        console.error('[ReactQuery] query 失败:', formatClientError(error), {
          queryKey: query.queryKey,
        });

        if (query.meta?.showErrorToast === false) return;

        showErrorToast(formatClientError(error), `query:${JSON.stringify(query.queryKey)}`);
      },
    }),
    mutationCache: new MutationCache({
      onError: (error, _variables, _context, mutation) => {
        console.error('[ReactQuery] mutation 失败:', formatClientError(error), {
          mutationKey: mutation.options.mutationKey,
        });

        const mutationKey = mutation.options.mutationKey;
        const id =
          mutationKey !== undefined
            ? `mutation:${JSON.stringify(mutationKey)}`
            : 'mutation:unknown';

        showErrorToast(formatClientError(error), id);
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        retry: 1,
      },
    },
  });
}
