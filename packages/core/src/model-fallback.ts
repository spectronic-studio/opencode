export * as ModelFallback from "./model-fallback.js"

import { AIError } from "@opencode/ai"

/**
 * Cross-provider model fallback.
 *
 * Configured agents may declare an ordered candidate list (`agent.fallback`).
 * A candidate switch is preferred over backoff on a provider that is unusable
 * regardless of waiting: organization-level rate limits or quota, dropped
 * authentication, missing routes, or provider-side outages. Transient
 * same-model failures (timeouts, broken streams) stay governed by ModelRetry.
 */

/** Failures where switching models is more effective than another attempt on the same one. */
const SWITCHABLE = new Set(["RateLimit", "QuotaExceeded", "ProviderInternal", "Authentication", "NoRoute"])

export const isSwitchable = (error: AIError): boolean => SWITCHABLE.has(error.reason._tag)

/**
 * In-process provider health, shared across sessions like SessionExecution.
 * A switchable failure parks the provider for one rolling window; the common
 * limits are rolling per-minute quotas, so that long restores them. The state
 * is deliberately not durable: process recovery starts on the session's own
 * selection and re-learns availability from failures.
 */
const COOLDOWN_MS = 60_000
const providerCooldowns = new Map<string, number>()

export const isUnavailable = (providerID: string, now: number): boolean => {
  const until = providerCooldowns.get(providerID)
  return until !== undefined && until > now
}

export const markFailure = (providerID: string, now: number): void => {
  providerCooldowns.set(providerID, now + COOLDOWN_MS)
}

export const markHealthy = (providerID: string): void => {
  providerCooldowns.delete(providerID)
}
