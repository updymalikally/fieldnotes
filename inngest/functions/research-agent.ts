import { complete } from "@/lib/ai";
import { webSearch } from "@/lib/search";
export async function runResearchAgent(topic: string, instructions?: string) {
  const queries = await complete<{ queries: string[] }>("Create up to 4 focused web-search queries for a research request. Return JSON {queries:string[]}.", JSON.stringify({ topic, instructions }));
  const resultSets = await Promise.all(queries.queries.slice(0, 4).map(q => webSearch(`${topic} ${q}`, 6)));
  const sources = [...new Map(resultSets.flat().filter(x => x.url.startsWith("http")).map(x => [x.url, x])).values()].slice(0, 18);
  if (!sources.length) throw new Error("Search returned no usable sources.");
  const findings = await complete<{ findings: { finding: string; sourceUrls: string[]; confidence: string }[]; researchGaps: string[] }>("Extract evidence-backed findings from provided search snippets. Cite only source URLs included in input. Flag uncertainty. Return JSON with findings and researchGaps.", JSON.stringify({ topic, instructions, sources }));
  return { sources, ...findings };
}
