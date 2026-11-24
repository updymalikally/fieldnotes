import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/database";
import { inngest } from "@/inngest/client";
const schema = z.object({ topic: z.string().trim().min(4).max(300), instructions: z.string().max(2000).optional(), depth: z.enum(["brief", "standard", "deep"]).default("standard") });
export async function GET() {
  try { return NextResponse.json(await db.researchJob.findMany({ orderBy: { createdAt: "desc" }, take: 30, include: { executions: true, report: { include: { sources: true } } } })); }
  catch { return NextResponse.json({ error: "Database is unavailable. Configure DATABASE_URL and run prisma db push." }, { status: 503 }); }
}
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid research request." }, { status: 400 });
  try {
    const { topic, instructions, depth } = parsed.data;
    const job = await db.researchJob.create({ data: { topic, instructions, depth, status: "PENDING", currentStage: "Queued" } });
    await db.agentExecution.createMany({ data: ["RESEARCH", "ANALYSIS", "FACT_CHECK", "WRITING", "REVIEW"].map(agent => ({ jobId: job.id, agent: agent as any })), skipDuplicates: true });
    try { await inngest.send({ name: "research/requested", data: { jobId: job.id, topic, instructions, depth } }); }
    catch (error) { await db.researchJob.update({ where: { id: job.id }, data: { status: "FAILED", error: "Could not enqueue the workflow. Check Inngest configuration." } }); throw error; }
    return NextResponse.json({ jobId: job.id, status: job.status }, { status: 202 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not start research." }, { status: 503 }); }
}
