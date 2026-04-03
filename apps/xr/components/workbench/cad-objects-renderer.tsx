"use client";

/**
 * Renders all CAD objects on the workbench as holograms.
 * Each object gets the hologram shader material.
 */

import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  createHologramMaterial,
  updateHologramTime,
  HOLOGRAM_PRESETS,
  type HologramPreset,
} from "@/lib/hologram-material";
import type { CADObject } from "@/lib/local-cad-engine";

interface CADObjectsRendererProps {
  objects: CADObject[];
  preset: HologramPreset;
  wireframe: boolean;
  scale?: number;
}

export function CADObjectsRenderer({ objects, preset, wireframe, scale = 0.15 }: CADObjectsRendererProps) {
  const holoMat = useMemo(() => {
    return createHologramMaterial({ ...HOLOGRAM_PRESETS[preset], wireframe });
  }, [preset, wireframe]);

  const wireMat = useMemo(() => {
    return createHologramMaterial({
      ...HOLOGRAM_PRESETS[preset], wireframe: true, opacity: 0.12, edgeGlow: 0.5,
    });
  }, [preset]);

  useFrame(({ clock }) => {
    updateHologramTime(holoMat, clock.elapsedTime);
    updateHologramTime(wireMat, clock.elapsedTime);
  });

  if (objects.length === 0) return null;

  return (
    <group scale={[scale, scale, scale]}>
      {objects.map((obj) => {
        if (!obj.visible) return null;
        // Clone geometry and apply hologram material
        return (
          <group key={obj.id}>
            <mesh
              geometry={obj.mesh.geometry}
              material={holoMat}
              position={obj.mesh.position.toArray()}
              rotation={obj.mesh.rotation.toArray() as [number, number, number]}
              scale={obj.mesh.scale.toArray()}
            />
            {/* Wireframe overlay */}
            <mesh
              geometry={obj.mesh.geometry}
              material={wireMat}
              position={obj.mesh.position.toArray()}
              rotation={obj.mesh.rotation.toArray() as [number, number, number]}
              scale={obj.mesh.scale.toArray()}
            />
          </group>
        );
      })}
    </group>
  );
}
