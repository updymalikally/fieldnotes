import { complete } from "@/lib/ai";
export async function runAnalysisAgent(topic: string, research: unknown) {
  return complete<{ themes: string[]; perspectives: { perspective: string; evidence: string }[]; analysis: string[]; implications: string[] }>("Analyze research evidence. Separate source-supported insights from inference. Return valid JSON with themes, perspectives, analysis and implications.", JSON.stringify({ topic, research }));
}
