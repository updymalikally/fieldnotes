import { NextResponse } from "next/server";
import { db } from "@/lib/database";
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try { const { id } = await params; const job = await db.researchJob.findUnique({ where: { id }, include: { executions: true, report: { include: { sources: true } } } }); return job ? NextResponse.json(job) : NextResponse.json({ error: "Research job not found." }, { status: 404 }); }
  catch { return NextResponse.json({ error: "Database is unavailable." }, { status: 503 }); }
}
