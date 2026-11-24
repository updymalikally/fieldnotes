import { NonRetriableError } from "inngest";
import { inngest } from "@/inngest/client";
import { db } from "@/lib/database";
import { runResearchAgent } from "./research-agent";
import { runAnalysisAgent } from "./analysis-agent";
import { runFactCheckAgent } from "./fact-check-agent";
import { runWritingAgent } from "./writing-agent";
import { runReviewAgent } from "./review-agent";

export const researchWorkflow = inngest.createFunction({ id: "research-workflow", retries: 3, concurrency: [{ limit: 2 }] }, { event: "research/requested" }, async ({ event, step }) => {
  const { jobId, topic, instructions, depth = "standard", scheduleId } = event.data as { jobId: string; topic: string; instructions?: string; depth?: string; scheduleId?: string };
  if (!topic || topic.trim().length < 4 || topic.length > 300) throw new NonRetriableError("Research topic must be between 4 and 300 characters.");
  await step.run("create-research-job", async () => {
    const job = await db.researchJob.upsert({ where: { id: jobId }, create: { id: jobId, topic, instructions, depth, status: "RUNNING", currentStage: "Preparing agents" }, update: { status: "RUNNING", currentStage: "Preparing agents", error: null } });
    await db.agentExecution.createMany({ data: ["RESEARCH", "ANALYSIS", "FACT_CHECK", "WRITING", "REVIEW"].map(agent => ({ jobId: job.id, agent: agent as any })), skipDuplicates: true });
    return job.id;
  });
  const mark = (agent: string, data: Record<string, unknown>) => db.agentExecution.update({ where: { jobId_agent: { jobId, agent: agent as any } }, data: data as any });
  const runAgent = async <T,>(agent: string, task: () => Promise<T>) => {
    await db.researchJob.update({ where: { id: jobId }, data: { currentStage: `${agent.toLowerCase().replaceAll("_", " ")} agent` } });
    await mark(agent, { status: "RUNNING", progress: 10, startedAt: new Date(), error: null });
    try { const output = await task(); await mark(agent, { status: "COMPLETED", progress: 100, completedAt: new Date(), output: output as any }); return output; }
    catch (error) { await mark(agent, { status: "FAILED", error: error instanceof Error ? error.message : "Agent failed" }); throw error; }
  };
  try {
    await step.sleep("search-provider-cooldown", "1s");
    const research = await step.run("research-agent", () => runAgent("RESEARCH", () => runResearchAgent(topic, instructions)));
    await step.run("research-complete-event", () => inngest.send({ name: "research/agent.completed", data: { jobId, agent: "RESEARCH" } }));
    await step.run("record-parallel-stage", () => db.researchJob.update({ where: { id: jobId }, data: { currentStage: "Analysis & fact-check" } }));
    const [analysis, factCheck] = await Promise.all([
      step.run("analysis-agent", () => runAgent("ANALYSIS", () => runAnalysisAgent(topic, research))),
      step.run("fact-check-agent", () => runAgent("FACT_CHECK", () => runFactCheckAgent(research))),
    ]);
    const makeReport = async (revision?: string) => step.run(revision ? "writing-agent-revision" : "writing-agent", () => runAgent("WRITING", () => runWritingAgent(topic, depth, { ...research, revision }, analysis, factCheck)));
    let report = await makeReport();
    let review = await step.run("review-agent", () => runAgent("REVIEW", () => runReviewAgent(topic, report, research)));
    if (!review.approved) {
      await step.run("record-review-status", () => db.researchJob.update({ where: { id: jobId }, data: { status: "WAITING_FOR_APPROVAL", currentStage: "Review requested" } }));
      await step.run("approval-requested-event", () => inngest.send({ name: "research/approval", data: { jobId, topic, issues: review.issues } }));
      const approval = await step.waitForEvent("human-approval", { event: "research/approval.responded", timeout: "24h", if: `async.data.jobId == '${jobId}'` });
      if (!approval) throw new Error("Research approval timed out after 24 hours.");
      const approved = Boolean((approval.data as { approved?: boolean }).approved);
      if (!approved) throw new NonRetriableError("Report was rejected during human review.");
      await step.run("record-human-approval", () => db.researchJob.update({ where: { id: jobId }, data: { status: "RUNNING", approvedAt: new Date(), currentStage: "Revising report" } }));
      report = await makeReport(review.revisionInstructions);
      review = await step.run("review-revised-report", () => runAgent("REVIEW", () => runReviewAgent(topic, report, research)));
      if (!review.approved) throw new NonRetriableError(`Report did not pass its controlled revision: ${review.issues.join("; ")}`);
    }
    await step.run("save-research-results", async () => {
      await db.researchReport.upsert({ where: { jobId }, create: { jobId, title: report.title, executiveSummary: report.executiveSummary, findings: report.findings, analysis: report.detailedAnalysis, factCheck: report.factCheckSummary, conclusion: report.conclusion, markdown: report.markdown, sources: { create: research.sources.map(s => ({ title: s.title, url: s.url, snippet: s.content, domain: new URL(s.url).hostname })) } }, update: { title: report.title, executiveSummary: report.executiveSummary, findings: report.findings, analysis: report.detailedAnalysis, factCheck: report.factCheckSummary, conclusion: report.conclusion, markdown: report.markdown, sources: { deleteMany: {}, create: research.sources.map(s => ({ title: s.title, url: s.url, snippet: s.content, domain: new URL(s.url).hostname })) } } });
      await db.researchJob.update({ where: { id: jobId }, data: { status: "COMPLETED", currentStage: "Complete", completedAt: new Date(), error: null } });
      if (scheduleId) await db.scheduledResearch.update({ where: { id: scheduleId }, data: { lastRunAt: new Date() } });
      return true;
    });
    await step.run("notify-completion", () => inngest.send({ name: "research/completed", data: { jobId, topic } }));
    return { jobId, status: "COMPLETED" };
  } catch (error) {
    await step.run("mark-job-failed", () => db.researchJob.update({ where: { id: jobId }, data: { status: "FAILED", error: error instanceof Error ? error.message : "Research failed", currentStage: "Failed" } }).catch(() => null));
    await step.run("notify-failure", () => inngest.send({ name: "research/failed", data: { jobId, error: error instanceof Error ? error.message : "Research failed" } }));
    throw error;
  }
});
