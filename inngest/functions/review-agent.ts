import { complete } from "@/lib/ai";
export async function runReviewAgent(topic: string, report: unknown, research: unknown) {
  return complete<{ approved: boolean; issues: string[]; revisionInstructions: string }>("Review report for accuracy against supplied research, completeness, citation consistency, structure and readability. Approve unless there are material issues. Return JSON.", JSON.stringify({ topic, report, research }));
}
