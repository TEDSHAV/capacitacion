export interface LoadingState {
  isLoading: boolean
  message?: string
}

export function createLoadingState(isLoading: boolean, message?: string): LoadingState {
  return {
    isLoading,
    message
  }
}

export function setLoading(loading: boolean, message?: string): LoadingState {
  return createLoadingState(loading, message)
}
