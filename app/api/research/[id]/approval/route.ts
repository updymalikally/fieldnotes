import { NextResponse } from "next/server";
import { db } from "@/lib/database";
import { inngest } from "@/inngest/client";
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null) as { approved?: boolean } | null;
  if (typeof body?.approved !== "boolean") return NextResponse.json({ error: "Choose approve or reject." }, { status: 400 });
  const job = await db.researchJob.findUnique({ where: { id } });
  if (!job || job.status !== "WAITING_FOR_APPROVAL") return NextResponse.json({ error: "This job is not awaiting approval." }, { status: 409 });
  await inngest.send({ name: "research/approval.responded", data: { jobId: id, approved: body.approved } });
  if (!body.approved) await db.researchJob.update({ where: { id }, data: { status: "FAILED", error: "Report was rejected during human review." } });
  return NextResponse.json({ ok: true });
}
