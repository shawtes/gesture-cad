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

export interface SketchValidationResult {
  valid: boolean;
  closed: boolean;
  entity_count: number;
  constraint_count: number;
  errors: string[];
}

export async function validateSketch(
  entities: any[],
  constraints: any[] = []
): Promise<SketchValidationResult> {
  const res = await fetch(`${API_BASE}/api/sketch/validate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      entities: entities.map((e) => ({
        ...e,
        entity_ids: undefined,
        entityIds: undefined,
      })),
      constraints: constraints.map((c) => ({
        id: c.id,
        type: c.type,
        entity_ids: c.entityIds,
        value: c.value ?? null,
      })),
    }),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

// ─── Operations API (Build123d backend) ───

export interface OperationResponse {
  id: string;
  vertices: number[];
  normals: number[];
  indices: number[];
}

async function postOperation(endpoint: string, body: unknown): Promise<OperationResponse> {
  const res = await fetch(`${API_BASE}/api/operations/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export function extrudeRect(params: {
  x1: number; z1: number; x2: number; z2: number;
  distance: number; direction?: string;
}): Promise<OperationResponse> {
  return postOperation("extrude/rect", params);
}

export function extrudeCircle(params: {
  cx: number; cz: number; radius: number; distance: number;
}): Promise<OperationResponse> {
  return postOperation("extrude/circle", params);
}

export function apiBoolean(params: {
  meshA: { vertices: number[]; normals: number[]; indices: number[] };
  meshB: { vertices: number[]; normals: number[]; indices: number[] };
  operation: string;
}): Promise<OperationResponse> {
  return postOperation("boolean", params);
}

export function filletEdges(params: {
  mesh: { vertices: number[]; normals: number[]; indices: number[] };
  edgeIndices: number[];
  radius: number;
}): Promise<OperationResponse> {
  return postOperation("fillet", params);
}

export function chamferEdges(params: {
  mesh: { vertices: number[]; normals: number[]; indices: number[] };
  edgeIndices: number[];
  distance: number;
}): Promise<OperationResponse> {
  return postOperation("chamfer", params);
}

export function shellFace(params: {
  mesh: { vertices: number[]; normals: number[]; indices: number[] };
  faceIndex: number;
  thickness: number;
}): Promise<OperationResponse> {
  return postOperation("shell", params);
}

// ─── New Operations (from Onshape feature research) ───

export function draftFaces(params: {
  mesh: { vertices: number[]; normals: number[]; indices: number[] };
  faceIndices: number[];
  angle: number;
  pullDirection: [number, number, number];
}): Promise<OperationResponse> {
  return postOperation("draft", params);
}

export function createHole(params: {
  mesh: { vertices: number[]; normals: number[]; indices: number[] };
  center: [number, number, number];
  diameter: number;
  depth: number;
  holeType: "simple" | "counterbore" | "countersink" | "tapped";
  cboreDiameter?: number;
  cboreDepth?: number;
  csinkAngle?: number;
}): Promise<OperationResponse> {
  return postOperation("hole", params);
}

export function createRib(params: {
  mesh: { vertices: number[]; normals: number[]; indices: number[] };
  profilePoints: number[];
  thickness: number;
  direction: "parallel" | "perpendicular";
}): Promise<OperationResponse> {
  return postOperation("rib", params);
}

export function splitBody(params: {
  mesh: { vertices: number[]; normals: number[]; indices: number[] };
  planeNormal: [number, number, number];
  planeOffset: number;
  keepSide: "above" | "below" | "both";
}): Promise<OperationResponse> {
  return postOperation("split", params);
}

export function thickenSurface(params: {
  mesh: { vertices: number[]; normals: number[]; indices: number[] };
  thickness: number;
  direction: "inward" | "outward" | "both";
}): Promise<OperationResponse> {
  return postOperation("thicken", params);
}

export function createHelix(params: {
  center: [number, number, number];
  radius: number;
  pitch: number;
  height: number;
  taperAngle?: number;
  clockwise?: boolean;
}): Promise<OperationResponse> {
  return postOperation("helix", params);
}

export function loftProfiles(params: {
  profiles: { vertices: number[]; indices: number[] }[];
  closed: boolean;
}): Promise<OperationResponse> {
  return postOperation("loft", params);
}

export function sweepProfile(params: {
  profile: { vertices: number[]; indices: number[] };
  pathPoints: number[];
}): Promise<OperationResponse> {
  return postOperation("sweep", params);
}
