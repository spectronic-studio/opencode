import { expect, test } from "bun:test"
import { Schema } from "effect"
import { Agent } from "../src/agent.js"
import { ConfigAgent } from "../src/config/agent.js"
import { Model } from "../src/model.js"
import { Provider } from "../src/provider.js"

test("Agent.Color preserves configured colors at the public boundary", () => {
  const encode = Schema.encodeSync(Agent.Color)

  expect(encode("info")).toBe("info")
  expect(encode("custom-color")).toBe("custom-color")
})

test("Agent.Info fallback candidates encode in declaration order and omit undefined", () => {
  const info = {
    ...Agent.Info.default(Agent.ID.make("build")),
    fallback: [
      Model.Ref.make({ id: Model.ID.make("kimi-k2"), providerID: Provider.ID.make("groq") }),
      Model.Ref.make({
        id: Model.ID.make("glm-5.3"),
        providerID: Provider.ID.make("zai"),
        variant: Model.VariantID.make("v2"),
      }),
    ],
  }

  expect(Schema.encodeSync(Agent.Info)(info).fallback).toEqual([
    { id: "kimi-k2", providerID: "groq" },
    { id: "glm-5.3", providerID: "zai", variant: "v2" },
  ])
})

test("Agent.Info omits an unset fallback from encoded objects", () => {
  const encoded = Schema.encodeSync(Agent.Info)(Agent.Info.default(Agent.ID.make("build")))

  expect(encoded).not.toHaveProperty("fallback")
})

test("ConfigAgent.Info decodes fallback candidates from short and explicit selections", () => {
  const decoded = Schema.decodeUnknownSync(ConfigAgent.Info)({
    fallback: ["groq/kimi-k2", "zai/glm-5.3#v2"],
  })

  expect(Schema.encodeSync(ConfigAgent.Info)(decoded).fallback).toEqual([
    { providerID: "groq", model: "kimi-k2" },
    { providerID: "zai", model: "glm-5.3", variant: "v2" },
  ])
})
