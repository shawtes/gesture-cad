/**
 * Linked Documents — cross-document part references.
 * Allows assemblies to reference parts from other documents.
 */

export interface LinkedDocument {
  id: string;
  name: string;
  /** URL or local reference to the source document */
  sourceRef: string;
  /** Parts available from this document */
  parts: LinkedPart[];
  lastSynced: number;
}

export interface LinkedPart {
  id: string;
  name: string;
  documentId: string;
  /** Cached mesh for display */
  meshData?: { vertices: number[]; normals: number[]; indices: number[] };
}

let linkCounter = 0;

export function createLinkedDocument(name: string, sourceRef: string): LinkedDocument {
  return {
    id: `ldoc_${++linkCounter}_${Date.now()}`,
    name,
    sourceRef,
    parts: [],
    lastSynced: Date.now(),
  };
}

export function addLinkedPart(doc: LinkedDocument, partName: string): LinkedDocument {
  const part: LinkedPart = {
    id: `lpart_${++linkCounter}_${Date.now()}`,
    name: partName,
    documentId: doc.id,
  };
  return { ...doc, parts: [...doc.parts, part] };
}

/** Standard hardware library (pre-defined linked parts) */
export const STANDARD_HARDWARE: { name: string; category: string }[] = [
  { name: "M3x8 Socket Head Cap Screw", category: "Fasteners" },
  { name: "M3x12 Socket Head Cap Screw", category: "Fasteners" },
  { name: "M4x10 Socket Head Cap Screw", category: "Fasteners" },
  { name: "M5x16 Socket Head Cap Screw", category: "Fasteners" },
  { name: "M3 Hex Nut", category: "Fasteners" },
  { name: "M4 Hex Nut", category: "Fasteners" },
  { name: "M5 Hex Nut", category: "Fasteners" },
  { name: "M3 Washer", category: "Fasteners" },
  { name: "M4 Washer", category: "Fasteners" },
  { name: "M5 Washer", category: "Fasteners" },
  { name: "608 Ball Bearing", category: "Bearings" },
  { name: "6001 Ball Bearing", category: "Bearings" },
  { name: "Dowel Pin 3x10", category: "Pins" },
  { name: "Dowel Pin 4x16", category: "Pins" },
  { name: "Retaining Ring M5", category: "Clips" },
];
