import { NextResponse } from "next/server";
import { getStats } from "@/lib/rag/retriever";

export async function GET() {
  const stats = getStats();
  return NextResponse.json(stats);
}
