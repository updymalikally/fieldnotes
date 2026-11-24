import { NextResponse } from "next/server";
import { db } from "@/lib/database";
export async function GET() { try { await db.$queryRaw`SELECT 1`; return NextResponse.json({ database: "connected", openai: Boolean(process.env.OPENAI_API_KEY), search: Boolean(process.env.TAVILY_API_KEY), inngest: Boolean(process.env.INNGEST_EVENT_KEY) }); } catch { return NextResponse.json({ database: "disconnected", openai: Boolean(process.env.OPENAI_API_KEY), search: Boolean(process.env.TAVILY_API_KEY), inngest: Boolean(process.env.INNGEST_EVENT_KEY) }, { status: 503 }); } }
