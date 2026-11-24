import { complete } from "@/lib/ai";
export async function runWritingAgent(topic: string, depth: string, research: unknown, analysis: unknown, factCheck: unknown) {
  return complete<{ title: string; executiveSummary: string; findings: string[]; detailedAnalysis: string[]; factCheckSummary: string[]; conclusion: string; markdown: string }>("Write a clear, professional research report using only supplied evidence. Cite claims inline with numbered source markers [1]. Include Markdown headings for Executive Summary, Key Findings, Detailed Analysis, Fact-check, Sources, Conclusion. Return valid JSON.", JSON.stringify({ topic, depth, research, analysis, factCheck }));
}
