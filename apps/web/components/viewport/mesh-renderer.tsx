"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { useCADState } from "@/lib/store";

/**
 * Renders tessellated mesh data from features (extrude/revolve results).
 * Converts flat vertex/normal/index arrays into Three.js BufferGeometry.
 */
export function MeshRenderer() {
  const { features } = useCADState();

  const visibleFeatures = features.filter((f) => f.visible && f.mesh);

  return (
    <group>
      {visibleFeatures.map((feature) => (
        <FeatureMesh key={feature.id} feature={feature} />
      ))}
    </group>
  );
}

function FeatureMesh({ feature }: { feature: any }) {
  const geometry = useMemo(() => {
    if (!feature.mesh) return null;
    const { vertices, normals, indices } = feature.mesh;

    const geom = new THREE.BufferGeometry();
    geom.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(vertices, 3)
    );
    if (normals.length > 0) {
      geom.setAttribute(
        "normal",
        new THREE.Float32BufferAttribute(normals, 3)
      );
    }
    if (indices.length > 0) {
      geom.setIndex(new THREE.Uint32BufferAttribute(indices, 1));
    }
    if (normals.length === 0) {
      geom.computeVertexNormals();
    }
    return geom;
  }, [feature.mesh]);

  if (!geometry) return null;

  const color =
    feature.type === "extrude" ? "#3b82f6" :
    feature.type === "revolve" ? "#8b5cf6" :
    "#22c55e";

  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial
        color={color}
        roughness={0.4}
        metalness={0.6}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
