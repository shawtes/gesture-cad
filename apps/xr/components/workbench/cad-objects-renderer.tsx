"use client";

/**
 * Renders CAD objects with selectable material modes.
 * Supports: hologram, solid, wireframe, glass, metallic, matte.
 * Handles per-object selection visuals and click-to-select.
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
import { createCADMaterial, type MaterialMode, type CADObject } from "@/lib/local-cad-engine";

interface CADObjectsRendererProps {
  objects: CADObject[];
  preset: HologramPreset;
  wireframe: boolean;
  materialMode: MaterialMode;
  selectedId: string | null;
  onSelect: (id: string) => void;
  scale?: number;
}

export function CADObjectsRenderer({
  objects, preset, wireframe, materialMode, selectedId, onSelect, scale = 0.15,
}: CADObjectsRendererProps) {
  const presetColor = HOLOGRAM_PRESETS[preset].color;

  // Hologram materials (only created when needed)
  const holoMat = useMemo(() => {
    if (materialMode !== "hologram") return null;
    return createHologramMaterial({ ...HOLOGRAM_PRESETS[preset], wireframe });
  }, [preset, wireframe, materialMode]);

  const holoWireMat = useMemo(() => {
    if (materialMode !== "hologram") return null;
    return createHologramMaterial({
      ...HOLOGRAM_PRESETS[preset], wireframe: true, opacity: 0.12, edgeGlow: 0.5,
    });
  }, [preset, materialMode]);

  // Standard material (for non-hologram modes)
  const stdMat = useMemo(() => {
    if (materialMode === "hologram") return null;
    return createCADMaterial(materialMode, presetColor);
  }, [materialMode, presetColor]);

  // Selection highlight material
  const selMat = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: new THREE.Color("#ff6600"),
      wireframe: true,
      transparent: true,
      opacity: 0.5,
    });
  }, []);

  // Update hologram time
  useFrame(({ clock }) => {
    if (holoMat) updateHologramTime(holoMat, clock.elapsedTime);
    if (holoWireMat) updateHologramTime(holoWireMat, clock.elapsedTime);
  });

  if (objects.length === 0) return null;

  return (
    <group scale={[scale, scale, scale]}>
      {objects.map((obj) => {
        if (!obj.visible) return null;
        const isSelected = obj.id === selectedId;
        const mat = materialMode === "hologram" ? holoMat! : stdMat!;
        const pos = obj.mesh.position.toArray();
        const rot = obj.mesh.rotation.toArray() as [number, number, number];
        const s = obj.scale;

        return (
          <group key={obj.id}>
            {/* Main mesh */}
            <mesh
              geometry={obj.mesh.geometry}
              material={mat}
              position={pos}
              rotation={rot}
              scale={[s, s, s]}
              onClick={(e) => { e.stopPropagation(); onSelect(obj.id); }}
            />

            {/* Hologram wireframe overlay */}
            {materialMode === "hologram" && holoWireMat && (
              <mesh
                geometry={obj.mesh.geometry}
                material={holoWireMat}
                position={pos}
                rotation={rot}
                scale={[s, s, s]}
              />
            )}

            {/* Selection highlight */}
            {isSelected && (
              <mesh
                geometry={obj.mesh.geometry}
                material={selMat}
                position={pos}
                rotation={rot}
                scale={[s * 1.02, s * 1.02, s * 1.02]}
              />
            )}
          </group>
        );
      })}
    </group>
  );
}
