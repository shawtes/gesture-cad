/**
 * Asset library management — store, search, and export reusable assets.
 */

import type { TessellatedMesh } from './features';

export interface Asset {
  id: string;
  name: string;
  type: 'mesh' | 'material' | 'armature' | 'action' | 'hdri';
  thumbnail?: string;
  tags: string[];
  data: unknown;
  createdAt: number;
}

let assetIdCounter = 0;

function generateAssetId(): string {
  return `asset_${Date.now()}_${++assetIdCounter}`;
}

export class AssetLibrary {
  readonly assets: Map<string, Asset> = new Map();

  addAsset(asset: Asset): void {
    this.assets.set(asset.id, asset);
  }

  removeAsset(id: string): void {
    this.assets.delete(id);
  }

  /**
   * Search assets by name and tags (case-insensitive substring match).
   */
  search(query: string): Asset[] {
    const lower = query.toLowerCase();
    const results: Asset[] = [];

    for (const asset of this.assets.values()) {
      const nameMatch = asset.name.toLowerCase().includes(lower);
      const tagMatch = asset.tags.some((tag) => tag.toLowerCase().includes(lower));
      if (nameMatch || tagMatch) {
        results.push(asset);
      }
    }

    return results;
  }

  getByType(type: Asset['type']): Asset[] {
    const results: Asset[] = [];
    for (const asset of this.assets.values()) {
      if (asset.type === type) {
        results.push(asset);
      }
    }
    return results;
  }

  exportToJSON(): string {
    const entries: Asset[] = [];
    for (const asset of this.assets.values()) {
      entries.push(asset);
    }
    return JSON.stringify(entries, null, 2);
  }

  importFromJSON(json: string): void {
    const entries: Asset[] = JSON.parse(json) as Asset[];
    for (const asset of entries) {
      this.assets.set(asset.id, asset);
    }
  }
}

/**
 * Create an Asset from a TessellatedMesh.
 */
export function createAssetFromMesh(
  name: string,
  mesh: TessellatedMesh,
  tags: string[] = []
): Asset {
  return {
    id: generateAssetId(),
    name,
    type: 'mesh',
    thumbnail: generateThumbnailDataURL(mesh),
    tags,
    data: {
      vertices: mesh.vertices,
      normals: mesh.normals,
      indices: mesh.indices,
    },
    createdAt: Date.now(),
  };
}

/**
 * Create an Asset from a material definition.
 */
export function createAssetFromMaterial(
  name: string,
  material: Record<string, unknown>,
  tags: string[] = []
): Asset {
  return {
    id: generateAssetId(),
    name,
    type: 'material',
    tags,
    data: material,
    createdAt: Date.now(),
  };
}

/**
 * Generate a simple SVG wireframe thumbnail as a data URL.
 * Projects vertices onto a 2D plane using a basic orthographic projection.
 */
export function generateThumbnailDataURL(mesh: TessellatedMesh): string {
  const SIZE = 128;
  const PADDING = 8;

  const verts = mesh.vertices;
  if (verts.length < 9) {
    // Not enough vertices for any triangle — return a placeholder
    return `data:image/svg+xml,${encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}"><rect width="${SIZE}" height="${SIZE}" fill="#1a1a2e"/><text x="50%" y="50%" text-anchor="middle" fill="#555" font-size="12">empty</text></svg>`
    )}`;
  }

  // Project 3D → 2D: use X and Y (front view)
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;

  const projected: { x: number; y: number }[] = [];
  for (let i = 0; i < verts.length; i += 3) {
    const px = verts[i];
    const py = verts[i + 1];
    projected.push({ x: px, y: py });
    if (px < minX) minX = px;
    if (px > maxX) maxX = px;
    if (py < minY) minY = py;
    if (py > maxY) maxY = py;
  }

  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;
  const drawSize = SIZE - PADDING * 2;

  function mapX(v: number): number {
    return PADDING + ((v - minX) / rangeX) * drawSize;
  }

  function mapY(v: number): number {
    // Flip Y so up is up in the SVG
    return SIZE - PADDING - ((v - minY) / rangeY) * drawSize;
  }

  // Draw wireframe edges from triangle indices (limit to keep SVG small)
  const indices = mesh.indices;
  const MAX_EDGES = 200;
  const edgeSet = new Set<string>();
  const lines: string[] = [];

  for (let i = 0; i < indices.length && lines.length < MAX_EDGES; i += 3) {
    const a = indices[i];
    const b = indices[i + 1];
    const c = indices[i + 2];

    const edges: [number, number][] = [
      [Math.min(a, b), Math.max(a, b)],
      [Math.min(b, c), Math.max(b, c)],
      [Math.min(a, c), Math.max(a, c)],
    ];

    for (const [e0, e1] of edges) {
      const key = `${e0}-${e1}`;
      if (edgeSet.has(key)) continue;
      edgeSet.add(key);

      if (e0 < projected.length && e1 < projected.length) {
        const p0 = projected[e0];
        const p1 = projected[e1];
        lines.push(
          `<line x1="${mapX(p0.x).toFixed(1)}" y1="${mapY(p0.y).toFixed(1)}" x2="${mapX(p1.x).toFixed(1)}" y2="${mapY(p1.y).toFixed(1)}" stroke="#3b82f6" stroke-width="0.5" opacity="0.6"/>`
        );
      }

      if (lines.length >= MAX_EDGES) break;
    }
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}">
<rect width="${SIZE}" height="${SIZE}" fill="#0a0a0a"/>
${lines.join('\n')}
</svg>`;

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
