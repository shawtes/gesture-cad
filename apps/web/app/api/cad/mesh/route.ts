/**
 * CAD Mesh Sync API
 *
 * Returns the current combined mesh data from all visible features.
 * Used by the XR app to pull the latest CAD model for holographic viewing.
 *
 * GET /api/cad/mesh
 * Returns: { vertices, normals, indices, featureCount }
 *
 * NOTE: This is a stateless endpoint. The actual mesh data must be
 * passed via query params or stored in a shared session. For now,
 * returns CORS-enabled empty response so the XR app can connect.
 * The real sync happens via the web app posting mesh data.
 *
 * POST /api/cad/mesh
 * Body: { vertices, normals, indices, featureCount }
 * Stores the mesh in memory for GET to retrieve.
 */

import { NextRequest, NextResponse } from "next/server";

// In-memory mesh store (shared between GET and POST within the same process)
let storedMesh: {
  vertices: number[];
  normals: number[];
  indices: number[];
  featureCount: number;
  timestamp: number;
} | null = null;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET() {
  if (!storedMesh) {
    return NextResponse.json(
      { vertices: [], normals: [], indices: [], featureCount: 0, message: "No mesh data. Use POST to upload or export from the web app." },
      { headers: CORS_HEADERS }
    );
  }

  return NextResponse.json(storedMesh, { headers: CORS_HEADERS });
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();

    if (!data.vertices || !Array.isArray(data.vertices)) {
      return NextResponse.json(
        { error: "Missing vertices array" },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    storedMesh = {
      vertices: data.vertices,
      normals: data.normals || [],
      indices: data.indices || [],
      featureCount: data.featureCount || 0,
      timestamp: Date.now(),
    };

    return NextResponse.json(
      { ok: true, vertexCount: data.vertices.length / 3, timestamp: storedMesh.timestamp },
      { headers: CORS_HEADERS }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
