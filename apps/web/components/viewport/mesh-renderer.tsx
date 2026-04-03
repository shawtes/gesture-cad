"use client";

import { useMemo, useState, useEffect } from "react";
import * as THREE from "three";
import { useCADState } from "@/lib/store";

type SceneRenderMode = "Shaded" | "Wireframe" | "Shaded + Edges" | "Hidden Edges";

/**
 * Renders tessellated mesh data from features (extrude/revolve results).
 * Converts flat vertex/normal/index arrays into Three.js BufferGeometry.
 * Listens for render mode changes from viewport overlay.
 */
export function MeshRenderer() {
  const { features } = useCADState();
  const [renderMode, setRenderMode] = useState<SceneRenderMode>("Shaded");

  useEffect(() => {
    const handler = (e: Event) => {
      const mode = (e as CustomEvent).detail?.mode;
      if (mode) setRenderMode(mode as SceneRenderMode);
    };
    window.addEventListener("gesture-cad-scene-render-mode", handler);
    return () => window.removeEventListener("gesture-cad-scene-render-mode", handler);
  }, []);

  const visibleFeatures = features.filter((f) => f.visible && f.mesh);

  return (
    <group>
      {visibleFeatures.map((feature) => (
        <FeatureMesh key={feature.id} feature={feature} renderMode={renderMode} />
      ))}
    </group>
  );
}

function FeatureMesh({ feature, renderMode }: { feature: any; renderMode: SceneRenderMode }) {
  const geometry = useMemo(() => {
    if (!feature.mesh) return null;
    const { vertices, normals, indices } = feature.mesh;
    if (!vertices || vertices.length < 3 || !indices || indices.length < 3) return null;

    try {
      const geom = new THREE.BufferGeometry();
      geom.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
      if (normals && normals.length > 0) {
        geom.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
      }
      if (indices.length > 0) {
        geom.setIndex(new THREE.Uint32BufferAttribute(indices, 1));
      }
      if (!normals || normals.length === 0) {
        geom.computeVertexNormals();
      }
      return geom;
    } catch {
      return null; // Invalid mesh data
    }
  }, [feature.mesh]);

  if (!geometry) return null;

  const featureColors: Record<string, string> = {
    extrude: "#4a90d9",
    revolve: "#7c5cbf",
    pocket: "#d9534f",
    fillet: "#5bc0de",
    chamfer: "#5bc0de",
    shell: "#f0ad4e",
    draft: "#6c7a89",
    hole: "#d9534f",
    rib: "#8b6914",
    split: "#e67e22",
    thicken: "#27ae60",
    helix: "#2ecc71",
    boolean: "#9b59b6",
    linear_pattern: "#2ecc71",
    circular_pattern: "#2ecc71",
    curve_pattern: "#2ecc71",
    emboss: "#e74c3c",
    loft: "#3498db",
    sweep: "#1abc9c",
  };

  const color = featureColors[feature.type] || "#4a90d9";
  const isWireframe = renderMode === "Wireframe";
  const isXRay = renderMode === "Hidden Edges";

  return (
    <group>
      <mesh geometry={geometry} castShadow receiveShadow>
        <meshPhysicalMaterial
          color={color}
          roughness={0.35}
          metalness={0.7}
          clearcoat={0.3}
          clearcoatRoughness={0.2}
          envMapIntensity={1.2}
          side={THREE.DoubleSide}
          wireframe={isWireframe}
          transparent={isXRay}
          opacity={isXRay ? 0.25 : 1}
        />
      </mesh>
      {/* Always show edges for CAD-style look */}
      {!isWireframe && (
        <lineSegments>
          <edgesGeometry args={[geometry, 25]} />
          <lineBasicMaterial color={isXRay ? "#555" : "#1a1a1a"} transparent opacity={isXRay ? 0.3 : 0.4} />
        </lineSegments>
      )}
    </group>
  );
}
