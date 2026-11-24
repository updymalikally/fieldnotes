import { inngest } from "@/inngest/client";
import { db } from "@/lib/database";

export const scheduledResearch = inngest.createFunction({ id: "scheduled-research-daily", retries: 2, concurrency: [{ limit: 2 }] }, { cron: "*/15 * * * *" }, async ({ step }) => {
  const schedules = await step.run("load-due-schedules", () => db.scheduledResearch.findMany({ where: { active: true, OR: [{ nextRunAt: null }, { nextRunAt: { lte: new Date() } }] } }));
  for (const schedule of schedules) {
    await step.run(`enqueue-${schedule.id}`, async () => {
      const jobId = `${schedule.id}-${schedule.nextRunAt?.getTime() ?? Date.now()}`;
      await db.researchJob.upsert({ where: { id: jobId }, create: { id: jobId, userId: schedule.userId, topic: schedule.topic, instructions: schedule.instructions, depth: schedule.depth, status: "PENDING", currentStage: "Queued" }, update: {} });
      await inngest.send({ name: "research/requested", data: { jobId, topic: schedule.topic, instructions: schedule.instructions, depth: schedule.depth, scheduleId: schedule.id } });
      await db.scheduledResearch.update({ where: { id: schedule.id }, data: { nextRunAt: new Date((schedule.nextRunAt?.getTime() ?? Date.now()) + 24 * 60 * 60 * 1000) } });
    });
  }
  return { enqueued: schedules.length };
});
