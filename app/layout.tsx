import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Research Studio — Agentic intelligence", description: "AI research agents that investigate, analyze, verify, and report." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
