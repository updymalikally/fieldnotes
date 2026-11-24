import OpenAI from "openai";
export const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "missing-api-key", maxRetries: 2, timeout: 60_000 });
export async function complete<T>(system: string, user: string): Promise<T> {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured.");
  const response = await openai.chat.completions.create({ model: process.env.OPENAI_MODEL || "gpt-4o-mini", temperature: 0.25, response_format: { type: "json_object" }, messages: [{ role: "system", content: system }, { role: "user", content: user }] });
  const content = response.choices[0]?.message.content;
  if (!content) throw new Error("The AI provider returned an empty response.");
  return JSON.parse(content) as T;
}
