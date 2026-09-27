import { describe, it, expect } from "vitest";
import { createDecisionClient } from "@starhn87/jev-decisions";
import { CHAT_CONTEXT_QUESTIONS, contextPlan } from "./chatContextDecision";

const evaluate = (choices: string[]) => createDecisionClient({ apiKey: "synthetic", model: "jev-1.13.0",
  fetch: async () => Response.json({ answers: Object.fromEntries(Object.keys(CHAT_CONTEXT_QUESTIONS).map((key, i) =>
    [key, { type: "choice", choice: choices[i], confidence: .98,
      probabilities: Object.fromEntries(["needed", "not_needed", "uncertain"].map(c => [c, c === choices[i] ? .98 : .01])) }])) }),
}).decide({ definitionId: "blog-context", definitionVersion: "1", state: { messages: [{ role: "user", content: "구현과 관련 글도 알려줘" }] }, questions: CHAT_CONTEXT_QUESTIONS });

describe("context policy", () => {
  it("keeps multiple sources for mixed questions", async () => {
    expect(contextPlan(await evaluate(["not_needed", "needed", "needed"]), .95)).toEqual({ about: false, code: true, posts: true });
  });
  it("keeps uncertain contexts and requires a separately configured threshold", async () => {
    const result = await evaluate(["uncertain", "not_needed", "needed"]);
    expect(contextPlan(result)).toEqual({ about: true, code: true, posts: true });
    expect(contextPlan(result, .95)).toEqual({ about: true, code: false, posts: true });
  });
  it("never forces an empty selection or excludes data after a provider failure", async () => {
    expect(contextPlan(await evaluate(["not_needed", "not_needed", "not_needed"]), .95)).toEqual({ about: true, code: true, posts: true });
    const result = await createDecisionClient({ apiKey: "synthetic", model: "jev-1.13.0", fetch: async () => new Response(null, { status: 500 }) })
      .decide({ definitionId: "blog-context", definitionVersion: "1", state: null, questions: CHAT_CONTEXT_QUESTIONS });
    expect(contextPlan(result, .95)).toEqual({ about: true, code: true, posts: true });
  });
});
