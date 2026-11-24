import { NextResponse } from "next/server";
import { db } from "@/lib/database";
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const format = new URL(request.url).searchParams.get("format") ?? "json";
  try { const report = await db.researchReport.findUnique({ where: { jobId: id }, include: { sources: true } }); if (!report) return NextResponse.json({ error: "Report not ready." }, { status: 404 });
    if (format === "md") return new Response(report.markdown, { headers: { "content-type": "text/markdown; charset=utf-8", "content-disposition": `attachment; filename="${report.title.replace(/[^\w-]+/g, "-")}.md"` } });
    return NextResponse.json(report);
  } catch { return NextResponse.json({ error: "Could not load report." }, { status: 503 }); }
}
