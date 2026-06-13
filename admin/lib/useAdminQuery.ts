'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api, ApiError } from './api';
import { useAuth } from './auth';

/** Fetches an admin API path with the JWT; redirects to /login on 401/403. */
export function useAdminQuery<T>(key: readonly unknown[], path: string, refetchInterval?: number) {
  const { token, signOut } = useAuth();
  const router = useRouter();

  const query = useQuery<T>({
    queryKey: [...key, token],
    queryFn: () => api<T>(path, { token }),
    enabled: !!token,
    retry: false,
    refetchInterval,
  });

  useEffect(() => {
    const err = query.error;
    if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
      signOut();
      router.replace('/login');
    }
  }, [query.error, signOut, router]);

  return query;
}
