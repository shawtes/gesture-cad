/**
 * Client-side glTF export using Three.js.
 * Converts TessellatedMesh features into a downloadable .glb file.
 */

import * as THREE from "three";
import type { TessellatedMesh } from "./features";

/**
 * Export features as a glTF binary (.glb) blob.
 */
export async function exportGLB(meshes: TessellatedMesh[]): Promise<Blob> {
  // Dynamic import to avoid bundling GLTFExporter when not used
  const { GLTFExporter } = await import("three/examples/jsm/exporters/GLTFExporter.js");

  const scene = new THREE.Scene();

  for (const mesh of meshes) {
    if (mesh.vertices.length === 0) continue;

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(mesh.vertices, 3));
    if (mesh.normals.length > 0) {
      geometry.setAttribute("normal", new THREE.Float32BufferAttribute(mesh.normals, 3));
    } else {
      geometry.computeVertexNormals();
    }
    geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(mesh.indices), 1));

    const material = new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.5, metalness: 0.3 });
    const threeMesh = new THREE.Mesh(geometry, material);
    scene.add(threeMesh);
  }

  const exporter = new GLTFExporter();

  return new Promise<Blob>((resolve, reject) => {
    exporter.parse(
      scene,
      (result) => {
        if (result instanceof ArrayBuffer) {
          resolve(new Blob([result], { type: "model/gltf-binary" }));
        } else {
          const json = JSON.stringify(result);
          resolve(new Blob([json], { type: "model/gltf+json" }));
        }
      },
      (error) => reject(error),
      { binary: true }
    );
  });
}

/**
 * Download a blob as a file.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
