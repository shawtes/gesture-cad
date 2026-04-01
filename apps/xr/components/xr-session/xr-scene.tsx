"use client";

import { Grid } from "@react-three/drei";

/**
 * Base XR scene: lighting, grid, reference geometry.
 * Renders in both desktop preview and immersive XR modes.
 * In AR mode, the grid provides spatial reference against passthrough.
 */
export function XRScene() {
  return (
    <group>
      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 8, 3]} intensity={0.8} castShadow />
      <directionalLight position={[-3, 5, -3]} intensity={0.3} />

      {/* Ground grid for spatial reference */}
      <Grid
        infiniteGrid
        cellSize={0.1}
        cellThickness={0.3}
        cellColor="#1a1a2e"
        sectionSize={0.5}
        sectionThickness={0.6}
        sectionColor="#2a2a4e"
        fadeDistance={5}
        fadeStrength={1}
        position={[0, 0, 0]}
      />

      {/* Origin marker */}
      <axesHelper args={[0.3]} />
    </group>
  );
}
