/**
 * Scene export and render capture utilities.
 */

import type { TessellatedMesh } from '../features';

export interface RenderCaptureConfig {
  width: number;
  height: number;
  format: 'png' | 'jpeg' | 'webp';
  quality: number;
  transparent: boolean;
  samples: number;
}

export const DEFAULT_RENDER_CAPTURE_CONFIG: RenderCaptureConfig = {
  width: 1920,
  height: 1080,
  format: 'png',
  quality: 0.92,
  transparent: false,
  samples: 1,
};

/**
 * Capture the current canvas frame as a Blob.
 */
export async function captureFrame(
  canvas: HTMLCanvasElement,
  config: RenderCaptureConfig
): Promise<Blob> {
  const mimeType = `image/${config.format}`;

  // If canvas dimensions differ from config, create an offscreen canvas and draw scaled
  if (canvas.width !== config.width || canvas.height !== config.height) {
    const offscreen = document.createElement('canvas');
    offscreen.width = config.width;
    offscreen.height = config.height;
    const ctx = offscreen.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D context for capture');
    }

    if (!config.transparent) {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, config.width, config.height);
    }

    ctx.drawImage(canvas, 0, 0, config.width, config.height);

    return new Promise<Blob>((resolve, reject) => {
      offscreen.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Canvas toBlob returned null'));
        },
        mimeType,
        config.quality
      );
    });
  }

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas toBlob returned null'));
      },
      mimeType,
      config.quality
    );
  });
}

export interface RenderSequenceConfig {
  startFrame: number;
  endFrame: number;
  fps: number;
  config: RenderCaptureConfig;
}

/**
 * Async generator that yields rendered frames.
 * The caller is responsible for advancing the scene between yields.
 */
export async function* renderSequence(
  canvas: HTMLCanvasElement,
  seqConfig: RenderSequenceConfig,
  onFrame: (frame: number, total: number) => void
): AsyncGenerator<{ frame: number; blob: Blob }> {
  const totalFrames = seqConfig.endFrame - seqConfig.startFrame + 1;

  for (let frame = seqConfig.startFrame; frame <= seqConfig.endFrame; frame++) {
    onFrame(frame - seqConfig.startFrame, totalFrames);

    // Allow a microtask tick so the renderer can update
    await new Promise<void>((r) => requestAnimationFrame(() => r()));

    const blob = await captureFrame(canvas, seqConfig.config);
    yield { frame, blob };
  }
}

/**
 * Trigger a browser download for a Blob.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();

  // Cleanup
  setTimeout(() => {
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }, 100);
}

/**
 * Build a minimal glTF 2.0 JSON structure from tessellated meshes and materials.
 */
export function exportSceneAsGLTF(
  meshes: TessellatedMesh[],
  materials: { name?: string; color?: [number, number, number, number]; metallic?: number; roughness?: number }[]
): Record<string, unknown> {
  const byteChunks: Uint8Array[] = [];
  const bufferViews: Record<string, unknown>[] = [];
  const accessors: Record<string, unknown>[] = [];
  const gltfMeshes: Record<string, unknown>[] = [];
  const gltfMaterials: Record<string, unknown>[] = [];
  const nodes: Record<string, unknown>[] = [];

  let byteOffset = 0;

  meshes.forEach((mesh, meshIndex) => {
    const vertexData = new Float32Array(mesh.vertices);
    const normalData = new Float32Array(mesh.normals);
    const indexData = new Uint32Array(mesh.indices);

    // Compute bounding box for position accessor
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    for (let i = 0; i < vertexData.length; i += 3) {
      minX = Math.min(minX, vertexData[i]);
      minY = Math.min(minY, vertexData[i + 1]);
      minZ = Math.min(minZ, vertexData[i + 2]);
      maxX = Math.max(maxX, vertexData[i]);
      maxY = Math.max(maxY, vertexData[i + 1]);
      maxZ = Math.max(maxZ, vertexData[i + 2]);
    }

    const vertexByteLength = vertexData.byteLength;
    const normalByteLength = normalData.byteLength;
    const indexByteLength = indexData.byteLength;

    const posViewIndex = bufferViews.length;
    bufferViews.push({
      buffer: 0,
      byteOffset,
      byteLength: vertexByteLength,
      target: 34962, // ARRAY_BUFFER
    });
    const posAccessorIndex = accessors.length;
    accessors.push({
      bufferView: posViewIndex,
      componentType: 5126, // FLOAT
      count: vertexData.length / 3,
      type: 'VEC3',
      min: [minX, minY, minZ],
      max: [maxX, maxY, maxZ],
    });
    byteOffset += vertexByteLength;

    const normViewIndex = bufferViews.length;
    bufferViews.push({
      buffer: 0,
      byteOffset,
      byteLength: normalByteLength,
      target: 34962,
    });
    const normAccessorIndex = accessors.length;
    accessors.push({
      bufferView: normViewIndex,
      componentType: 5126,
      count: normalData.length / 3,
      type: 'VEC3',
    });
    byteOffset += normalByteLength;

    const idxViewIndex = bufferViews.length;
    bufferViews.push({
      buffer: 0,
      byteOffset,
      byteLength: indexByteLength,
      target: 34963, // ELEMENT_ARRAY_BUFFER
    });
    const idxAccessorIndex = accessors.length;
    accessors.push({
      bufferView: idxViewIndex,
      componentType: 5125, // UNSIGNED_INT
      count: indexData.length,
      type: 'SCALAR',
    });
    byteOffset += indexByteLength;

    // Collect raw bytes
    byteChunks.push(
      new Uint8Array(vertexData.buffer),
      new Uint8Array(normalData.buffer),
      new Uint8Array(indexData.buffer)
    );

    const materialIndex = Math.min(meshIndex, materials.length - 1);

    gltfMeshes.push({
      primitives: [
        {
          attributes: {
            POSITION: posAccessorIndex,
            NORMAL: normAccessorIndex,
          },
          indices: idxAccessorIndex,
          material: materialIndex >= 0 ? materialIndex : undefined,
        },
      ],
    });

    nodes.push({
      mesh: meshIndex,
      name: `mesh_${meshIndex}`,
    });
  });

  // Materials
  materials.forEach((mat) => {
    const color = mat.color ?? [0.8, 0.8, 0.8, 1.0];
    gltfMaterials.push({
      name: mat.name ?? 'default',
      pbrMetallicRoughness: {
        baseColorFactor: color,
        metallicFactor: mat.metallic ?? 0.0,
        roughnessFactor: mat.roughness ?? 0.5,
      },
    });
  });

  // Encode buffer as base64 data URI
  const totalLength = byteChunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const rawBytes = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of byteChunks) {
    rawBytes.set(chunk, offset);
    offset += chunk.length;
  }
  let binary = '';
  for (let i = 0; i < rawBytes.length; i++) {
    binary += String.fromCharCode(rawBytes[i]);
  }
  const base64 = typeof btoa !== 'undefined' ? btoa(binary) : '';

  return {
    asset: { version: '2.0', generator: 'GestureCAD' },
    scene: 0,
    scenes: [{ nodes: nodes.map((_, i) => i) }],
    nodes,
    meshes: gltfMeshes,
    materials: gltfMaterials,
    accessors,
    bufferViews,
    buffers: [
      {
        uri: `data:application/octet-stream;base64,${base64}`,
        byteLength: rawBytes.length,
      },
    ],
  };
}
