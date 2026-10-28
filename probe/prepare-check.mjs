import { WorkBuddyUpstreamClient } from "../src/upstream.ts"
const c = new WorkBuddyUpstreamClient()
const raw = JSON.stringify({
  model: "deepseek-v4.1-flash",
  stream: true,
  stream_options: { include_usage: true },
  tool_choice: { type: "function", function: { name: "bash" } },
  tools: [{ type: "function", function: { name: "bash", description: "d", parameters: { type: "object", properties: {} } } }],
  messages: [
    { role: "developer", content: "harness system prompt" },
    { role: "user", content: "hi" },
  ],
})
const out = c.prepareChatBody(raw)
console.log(out)
