import { expect, test } from "bun:test"
import {
  AIError,
  AuthenticationError,
  ContentPolicyError,
  InvalidRequestError,
  ModelID,
  NoRouteError,
  ProviderID,
  ProviderInternalError,
  QuotaExceededError,
  RateLimitError,
  TransportError,
} from "@opencode/ai"
import { ModelFallback } from "@opencode/core/model-fallback"

test("switchable failures prefer a different model over backoff", () => {
  const switchable = [
    new RateLimitError({ message: "Wait" }),
    new QuotaExceededError({ message: "No quota" }),
    new ProviderInternalError({ message: "Unavailable" }),
    new AuthenticationError({ message: "Invalid credentials" }),
    new NoRouteError({ message: "failed", route: "route", provider: ProviderID.make("provider"), model: ModelID.make("model") }),
  ]

  for (const reason of switchable) {
    expect(ModelFallback.isSwitchable(new AIError({ reason }))).toBe(true)
  }
})

test("transient and request failures stay governed by ModelRetry", () => {
  const sameModel = [
    new TransportError({ message: "Timed out", transport: "http", operation: "request", code: "Timeout" }),
    new InvalidRequestError({ message: "Invalid prompt" }),
    new ContentPolicyError({ message: "Refused" }),
  ]

  for (const reason of sameModel) {
    expect(ModelFallback.isSwitchable(new AIError({ reason }))).toBe(false)
  }
})

test("a switchable failure parks the provider for one rolling window", () => {
  ModelFallback.markFailure("groq-fallback-test", 1_000)
  ModelFallback.markFailure("fallback-test-other", 1_000)

  expect(ModelFallback.isUnavailable("groq-fallback-test", 2_000)).toBe(true)
  expect(ModelFallback.isUnavailable("fallback-test-untouched", 2_000)).toBe(false)
  expect(ModelFallback.isUnavailable("groq-fallback-test", 61_000)).toBe(false)
})

test("a successful call clears the provider window", () => {
  ModelFallback.markFailure("openrouter-fallback-test", 0)

  expect(ModelFallback.isUnavailable("openrouter-fallback-test", 1)).toBe(true)

  ModelFallback.markHealthy("openrouter-fallback-test")

  expect(ModelFallback.isUnavailable("openrouter-fallback-test", 1)).toBe(false)
})
