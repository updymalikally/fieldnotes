export type SearchResult = { title: string; url: string; content: string; published_date?: string };
export async function webSearch(query: string, maxResults = 8): Promise<SearchResult[]> {
  if (!process.env.TAVILY_API_KEY) throw new Error("TAVILY_API_KEY is not configured. Add it to enable real web research.");
  const response = await fetch("https://api.tavily.com/search", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ api_key: process.env.TAVILY_API_KEY, query, search_depth: "advanced", max_results: maxResults, include_answer: false }), signal: AbortSignal.timeout(25_000) });
  if (!response.ok) throw new Error(`Web search failed (${response.status}).`);
  const data = await response.json();
  return (data.results ?? []).map((r: any) => ({ title: String(r.title ?? "Untitled"), url: String(r.url), content: String(r.content ?? ""), published_date: r.published_date }));
}
