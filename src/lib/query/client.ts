import { isServer, QueryClient } from "@tanstack/react-query"

import { isAppError } from "@/lib/utils/errors"
import type { AppError } from "@/types"

/*
 * Services only reject with AppException, so every query/mutation error is an
 * AppError. Registering it here types `error` across all hooks.
 */
declare module "@tanstack/react-query" {
  interface Register {
    defaultError: AppError
  }
}

const MAX_RETRIES = 2

function shouldRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= MAX_RETRIES) return false
  // Unknown throwables are retried once at most; AppErrors declare their own retryability.
  return isAppError(error) ? error.retryable : failureCount < 1
}

function retryDelay(attempt: number, error: unknown): number {
  const retryAfter = isAppError(error) ? error.details?.retryAfterSeconds : undefined
  if (retryAfter !== undefined) return Math.min(retryAfter * 1000, 30_000)
  return Math.min(500 * 2 ** attempt, 8_000)
}

/** Fresh client with WID defaults. Use directly in tests and server prefetching. */
export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Long enough that hydrated/prefetched data is not refetched on mount.
        staleTime: 60_000,
        gcTime: 5 * 60_000,
        retry: shouldRetry,
        retryDelay,
        refetchOnWindowFocus: true,
      },
      mutations: {
        // Mutations are never retried automatically: they may not be idempotent.
        retry: false,
      },
    },
  })
}

let browserQueryClient: QueryClient | undefined

/**
 * New client per server render, one shared client in the browser
 * (the pattern from Next.js' TanStack Query guide).
 */
export function getQueryClient(): QueryClient {
  if (isServer) return makeQueryClient()
  browserQueryClient ??= makeQueryClient()
  return browserQueryClient
}
