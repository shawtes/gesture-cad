"use client";

/**
 * Demo Hologram — shows a procedural CAD-style model when no file is loaded.
 * Ensures AR/VR always has something visible.
 * Generates: a house-like structure with walls, windows, door, and roof.
 */

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { createHologramMaterial, updateHologramTime, HOLOGRAM_PRESETS, type HologramPreset } from "@/lib/hologram-material";

interface DemoHologramProps {
  preset?: HologramPreset;
  wireframe?: boolean;
}

export function DemoHologram({ preset = "cyan", wireframe = false }: DemoHologramProps) {
  const groupRef = useRef<THREE.Group>(null);
  const platformRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  const holoMat = useMemo(() => {
    return createHologramMaterial({ ...HOLOGRAM_PRESETS[preset], wireframe });
  }, [preset, wireframe]);

  const wireMat = useMemo(() => {
    return createHologramMaterial({ ...HOLOGRAM_PRESETS[preset], wireframe: true, opacity: 0.12, edgeGlow: 0.5 });
  }, [preset]);

  const platformMat = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: new THREE.Color(HOLOGRAM_PRESETS[preset].color),
      transparent: true, opacity: 0.12, side: THREE.DoubleSide,
    });
  }, [preset]);

  const ringMat = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: new THREE.Color(HOLOGRAM_PRESETS[preset].color),
      transparent: true, opacity: 0.25, wireframe: true,
    });
  }, [preset]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    updateHologramTime(holoMat, t);
    updateHologramTime(wireMat, t);
    if (groupRef.current) {
      groupRef.current.rotation.y = t * 0.15; // Slow rotation
    }
    if (ringRef.current) {
      ringRef.current.rotation.y = t * 0.5;
    }
  });

  return (
    <group>
      {/* Platform */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} material={platformMat}>
        <circleGeometry args={[0.5, 32]} />
      </mesh>
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} material={ringMat}>
        <torusGeometry args={[0.55, 0.004, 8, 64]} />
      </mesh>

      {/* Light beam */}
      <mesh position={[0, 0.4, 0]}>
        <cylinderGeometry args={[0.015, 0.12, 0.8, 16, 1, true]} />
        <meshBasicMaterial color={HOLOGRAM_PRESETS[preset].color} transparent opacity={0.04} side={THREE.DoubleSide} />
      </mesh>

      {/* Rotating model group */}
      <group ref={groupRef} scale={[0.25, 0.25, 0.25]}>
        {/* Main building body */}
        <mesh position={[0, 0.5, 0]} material={holoMat}>
          <boxGeometry args={[1.2, 1, 0.8]} />
        </mesh>

        {/* Roof */}
        <mesh position={[0, 1.15, 0]} material={holoMat}>
          <boxGeometry args={[1.4, 0.15, 1.0]} />
        </mesh>
        {/* Roof peak (triangle prism approximated with box) */}
        <mesh position={[0, 1.4, 0]} rotation={[0, 0, Math.PI / 4]} material={holoMat}>
          <boxGeometry args={[0.5, 0.5, 0.9]} />
        </mesh>

        {/* Door */}
        <mesh position={[0, 0.25, 0.41]} material={wireMat}>
          <boxGeometry args={[0.25, 0.5, 0.02]} />
        </mesh>

        {/* Windows */}
        <mesh position={[-0.35, 0.55, 0.41]} material={wireMat}>
          <boxGeometry args={[0.2, 0.2, 0.02]} />
        </mesh>
        <mesh position={[0.35, 0.55, 0.41]} material={wireMat}>
          <boxGeometry args={[0.2, 0.2, 0.02]} />
        </mesh>

        {/* Side windows */}
        <mesh position={[0.61, 0.55, 0]} material={wireMat}>
          <boxGeometry args={[0.02, 0.2, 0.2]} />
        </mesh>
        <mesh position={[-0.61, 0.55, 0]} material={wireMat}>
          <boxGeometry args={[0.02, 0.2, 0.2]} />
        </mesh>

        {/* Chimney */}
        <mesh position={[0.35, 1.5, -0.15]} material={holoMat}>
          <boxGeometry args={[0.15, 0.5, 0.15]} />
        </mesh>

        {/* Ground plate */}
        <mesh position={[0, -0.01, 0]} material={holoMat}>
          <boxGeometry args={[1.6, 0.02, 1.2]} />
        </mesh>

        {/* Trees (simple cones + cylinders) */}
        {/* Tree 1 */}
        <mesh position={[-0.9, 0.15, 0.3]} material={holoMat}>
          <cylinderGeometry args={[0.03, 0.03, 0.3, 8]} />
        </mesh>
        <mesh position={[-0.9, 0.45, 0.3]} material={holoMat}>
          <coneGeometry args={[0.15, 0.35, 8]} />
        </mesh>

        {/* Tree 2 */}
        <mesh position={[0.9, 0.12, -0.2]} material={holoMat}>
          <cylinderGeometry args={[0.025, 0.025, 0.25, 8]} />
        </mesh>
        <mesh position={[0.9, 0.38, -0.2]} material={holoMat}>
          <coneGeometry args={[0.12, 0.3, 8]} />
        </mesh>

        {/* Gear (to show mechanical capability) */}
        <mesh position={[0.9, 0.65, 0.3]} rotation={[0, 0, 0]} material={holoMat}>
          <torusGeometry args={[0.1, 0.03, 8, 16]} />
        </mesh>
      </group>
    </group>
  );
}
