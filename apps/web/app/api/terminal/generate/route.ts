/**
 * Floor Plan Generator API Route
 *
 * Uses RAG knowledge base to generate cad-commands for house floor plans.
 * Supports: 1bed, 2bed, 3bed templates with optional adjustments.
 *
 * POST /api/terminal/generate
 * Body: { type: "1bed"|"2bed"|"3bed", adjustments?: { scale?, wallHeight?, includeFurniture?, includeRoof? } }
 * Returns: { commands: CadCommand[], plan: FloorPlanConfig, ragContext: string }
 */

import { NextRequest, NextResponse } from "next/server";
import {
  generateFloorPlan,
  adjustFloorPlan,
  getFloorPlanTypes,
  type FloorPlanType,
} from "@/lib/rag/floor-plan-generator";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, adjustments } = body;

    if (!type) {
      return NextResponse.json({
        error: "Missing 'type'. Options: 1bed, 2bed, 3bed",
        available: getFloorPlanTypes(),
      }, { status: 400 });
    }

    const validTypes: FloorPlanType[] = ["1bed", "2bed", "3bed"];
    if (!validTypes.includes(type)) {
      return NextResponse.json({
        error: `Invalid type '${type}'. Options: ${validTypes.join(", ")}`,
        available: getFloorPlanTypes(),
      }, { status: 400 });
    }

    // Generate with or without adjustments
    if (adjustments && Object.keys(adjustments).length > 0) {
      const result = adjustFloorPlan(type, adjustments);
      return NextResponse.json({
        commands: result.commands,
        plan: result.plan,
        commandCount: result.commands.length,
        ragContext: "Adjusted plan — RAG context applied at base generation.",
      });
    }

    const result = generateFloorPlan(type);
    return NextResponse.json({
      commands: result.commands,
      plan: result.plan,
      commandCount: result.commands.length,
      ragContext: result.ragContext,
    });
  } catch (err: any) {
    return NextResponse.json({
      error: err.message || "Failed to generate floor plan",
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    available: getFloorPlanTypes(),
    usage: "POST with { type: '1bed' | '2bed' | '3bed', adjustments?: { scale?, wallHeight?, includeFurniture?, includeRoof? } }",
  });
}
