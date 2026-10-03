import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { useBackend } from './context';
import type { OwnerDataSource, OwnerIdentity } from './types';

const OwnerDataContext = createContext<OwnerDataSource | null>(null);

/**
 * One query cache and data source per signed-in owner. Mount with
 * key={identity.id} so signing in as someone else starts from an empty cache.
 */
export function OwnerDataProvider({ identity, children }: { identity: OwnerIdentity; children: ReactNode }) {
  const backend = useBackend();
  const [state] = useState(() => ({
    client: new QueryClient({ defaultOptions: { queries: { staleTime: 15_000, retry: 1 } } }),
    data: backend.createOwnerData(identity),
  }));

  useEffect(() => backend.subscribeToChanges?.(() => void state.client.invalidateQueries()), [backend, state]);

  return (
    <QueryClientProvider client={state.client}>
      <OwnerDataContext.Provider value={state.data}>{children}</OwnerDataContext.Provider>
    </QueryClientProvider>
  );
}

export function useOwnerData(): OwnerDataSource {
  const data = useContext(OwnerDataContext);
  if (!data) throw new Error('useOwnerData must be used inside <OwnerDataProvider>.');
  return data;
}

export function useOwnerQuery<T>(key: QueryKey, fn: (data: OwnerDataSource) => Promise<T>, { enabled = true } = {}) {
  const data = useOwnerData();
  return useQuery({ queryKey: key, queryFn: () => fn(data), enabled });
}

/** Runs a change, then refetches every owner query so counts and lists stay consistent. */
export function useOwnerMutation<TArgs, TResult = void>(fn: (data: OwnerDataSource, args: TArgs) => Promise<TResult>) {
  const data = useOwnerData();
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: (args: TArgs) => fn(data, args), onSettled: () => queryClient.invalidateQueries() });
}

export const useBusinessQuery = () => useOwnerQuery(['business'], (d) => d.getMyBusiness());
export const useStatsQuery = () => useOwnerQuery(['stats'], (d) => d.getDashboardStats());
export const useKnowledgeQuery = () => useOwnerQuery(['knowledge'], (d) => d.listKnowledge());
export const useInquiriesQuery = () => useOwnerQuery(['inquiries'], (d) => d.listInquiries());
export const useUnansweredQuery = () => useOwnerQuery(['unanswered'], (d) => d.listUnanswered());
