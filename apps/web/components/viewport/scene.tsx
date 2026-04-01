"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Mesh } from "three";

export function Scene() {
  const meshRef = useRef<Mesh>(null);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.3;
    }
  });

  return (
    <group>
      {/* Demo cube — will be replaced by CAD geometry */}
      <mesh ref={meshRef} position={[0, 0.75, 0]} castShadow>
        <boxGeometry args={[1.5, 1.5, 1.5]} />
        <meshStandardMaterial
          color="#3b82f6"
          roughness={0.3}
          metalness={0.7}
        />
      </mesh>

      {/* Origin axes indicator */}
      <axesHelper args={[3]} />
    </group>
  );
}
