import { NextResponse } from "next/server";
import { db } from "@/lib/database";
import { inngest } from "@/inngest/client";
export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try { const job = await db.researchJob.findUnique({ where: { id } }); if (!job || job.status !== "FAILED") return NextResponse.json({ error: "Only failed jobs can be retried." }, { status: 409 });
    const retry = await db.researchJob.create({ data: { topic: job.topic, instructions: job.instructions, depth: job.depth, status: "PENDING", currentStage: "Queued for retry" } });
    await db.agentExecution.createMany({ data: ["RESEARCH", "ANALYSIS", "FACT_CHECK", "WRITING", "REVIEW"].map(agent => ({ jobId: retry.id, agent: agent as any })) });
    await inngest.send({ name: "research/requested", data: { jobId: retry.id, topic: retry.topic, instructions: retry.instructions, depth: retry.depth } }); return NextResponse.json({ jobId: retry.id }, { status: 202 });
  } catch { return NextResponse.json({ error: "Could not retry this job." }, { status: 503 }); }
}
