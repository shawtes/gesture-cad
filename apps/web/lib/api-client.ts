/** Backend API client for GestureCAD geometry operations. */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface GeometryResponse {
  id: string;
  type: string;
  vertices: number[];
  indices: number[];
  normals: number[];
}

export async function createBox(params: {
  width?: number;
  height?: number;
  depth?: number;
  position?: [number, number, number];
}): Promise<GeometryResponse> {
  const res = await fetch(`${API_BASE}/api/geometry/box`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function createSphere(params: {
  radius?: number;
  position?: [number, number, number];
}): Promise<GeometryResponse> {
  const res = await fetch(`${API_BASE}/api/geometry/sphere`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function getExportFormats(): Promise<{
  formats: { id: string; name: string; extension: string; status: string }[];
}> {
  const res = await fetch(`${API_BASE}/api/export/formats`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}
