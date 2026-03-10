// Re-export from main types file for backward compatibility
export type { LoadingState } from '@/types';

import type { LoadingState } from '@/types';

export function createLoadingState(isLoading: boolean, message?: string): LoadingState {
  return {
    isLoading,
    message
  }
}

export function setLoading(loading: boolean, message?: string): LoadingState {
  return createLoadingState(loading, message)
}
