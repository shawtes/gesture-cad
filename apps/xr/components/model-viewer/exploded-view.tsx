"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface ExplodedViewProps {
  enabled: boolean;
  /** Explosion factor: 0 = assembled, 1 = fully exploded */
  factor: number;
  children: React.ReactNode;
}

/**
 * Exploded view: separates child objects radially from center.
 * Animates smoothly between assembled (0) and exploded (1) states.
 */
export function ExplodedView({ enabled, factor, children }: ExplodedViewProps) {
  const groupRef = useRef<THREE.Group>(null);
  const targetFactor = useRef(0);

  targetFactor.current = enabled ? factor : 0;

  useFrame(() => {
    if (!groupRef.current) return;

    const center = new THREE.Vector3();
    const childCount = groupRef.current.children.length;
    if (childCount === 0) return;

    // Compute center of all children
    groupRef.current.children.forEach((child) => {
      center.add(child.position);
    });
    center.divideScalar(childCount);

    // Move each child away from center by factor
    groupRef.current.children.forEach((child) => {
      const dir = new THREE.Vector3().subVectors(child.position, center);
      if (dir.length() < 0.001) {
        // Assign a random direction for coincident objects
        dir.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5);
      }
      dir.normalize();

      const explosionOffset = dir.multiplyScalar(targetFactor.current * 0.5);
      // Lerp toward target
      child.position.lerp(
        new THREE.Vector3().copy(child.userData.originalPosition || child.position).add(explosionOffset),
        0.1
      );
    });
  });

  return <group ref={groupRef}>{children}</group>;
}
