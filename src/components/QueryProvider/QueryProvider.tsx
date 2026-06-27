'use client';

import { useState, type ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { createAppQueryClient } from '@/lib/client/query-client';

interface QueryProviderProps {
  children: ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  const [queryClient] = useState(() => createAppQueryClient());

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
