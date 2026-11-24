import { complete } from "@/lib/ai";
export async function runFactCheckAgent(research: unknown) {
  return complete<{ claims: { claim: string; status: "supported" | "partial" | "unsupported" | "conflicting"; evidence: string; sources: string[] }[]; caveats: string[] }>("Fact-check each key finding against the provided source snippets and URLs. Do not use outside knowledge. Identify unsupported and conflicting claims. Return JSON claims and caveats.", JSON.stringify(research));
}
