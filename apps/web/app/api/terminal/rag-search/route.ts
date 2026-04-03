import { NextRequest, NextResponse } from "next/server";
import { retrieve } from "@/lib/rag/retriever";

export async function POST(req: NextRequest) {
  const { query, topK, category } = await req.json();
  const results = retrieve(query || "", topK || 5, category);
  return NextResponse.json(results);
}
