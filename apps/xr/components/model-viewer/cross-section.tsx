"use client";

import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface CrossSectionProps {
  /** Enable/disable the clipping plane */
  enabled: boolean;
  /** Normal direction of the clipping plane */
  normal?: [number, number, number];
  /** Offset along the normal */
  offset?: number;
}

/**
 * Cross-section plane using Three.js clipping planes.
 * Cuts through the model to reveal internal structure.
 * In XR: position the plane with hand gestures.
 */
export function CrossSection({
  enabled,
  normal = [0, 1, 0],
  offset = 0.5,
}: CrossSectionProps) {
  const planeRef = useRef(
    new THREE.Plane(new THREE.Vector3(...normal), -offset)
  );

  useFrame(({ gl }) => {
    if (enabled) {
      gl.clippingPlanes = [planeRef.current];
      gl.localClippingEnabled = true;
    } else {
      gl.clippingPlanes = [];
    }
  });

  if (!enabled) return null;

  // Visual indicator for the clipping plane
  return (
    <group position={[0, offset, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2, 2]} />
        <meshBasicMaterial
          color="#ef4444"
          transparent
          opacity={0.15}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      {/* Edge outline */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.98, 1.0, 64]} />
        <meshBasicMaterial color="#ef4444" transparent opacity={0.5} />
      </mesh>
    </group>
  );
}
