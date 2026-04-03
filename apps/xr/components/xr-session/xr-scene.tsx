"use client";

import { Grid, Text } from "@react-three/drei";

/**
 * Base XR scene: lighting, grid, reference geometry.
 * Renders in both desktop preview and immersive XR modes.
 * Includes a visible floor and instructions so VR is never a black void.
 */
export function XRScene() {
  return (
    <group>
      {/* Lighting — brighter so VR isn't dark */}
      <ambientLight intensity={0.8} />
      <directionalLight position={[5, 8, 3]} intensity={1.0} castShadow />
      <directionalLight position={[-3, 5, -3]} intensity={0.5} />
      <pointLight position={[0, 3, 0]} intensity={0.3} color="#00ffcc" />

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

      {/* Glowing floor disc so VR isn't pitch black */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <circleGeometry args={[2, 32]} />
        <meshBasicMaterial color="#0a0a2e" transparent opacity={0.5} />
      </mesh>

      {/* Origin marker */}
      <axesHelper args={[0.3]} />

      {/* Floating instruction text — dark, high contrast */}
      <Text position={[0, 1.6, -1.5]} fontSize={0.08} color="#111111" anchorX="center" fontWeight="bold">
        GestureCAD XR
      </Text>
      <Text position={[0, 1.48, -1.5]} fontSize={0.032} color="#333333" anchorX="center" fontWeight="bold">
        Use the menu to add objects
      </Text>
      <Text position={[0, 1.4, -1.5]} fontSize={0.024} color="#555555" anchorX="center" fontWeight="bold">
        Meta button to exit VR
      </Text>
    </group>
  );
}
