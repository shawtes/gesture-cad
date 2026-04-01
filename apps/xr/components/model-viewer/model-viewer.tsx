"use client";

import { useRef, useState } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

interface ModelViewerProps {
  url: string;
}

/**
 * GLB/GLTF model viewer with grab/rotate/scale interaction.
 * In XR mode: hand gestures control the model.
 * In desktop mode: mouse orbit controls (via OrbitControls).
 */
export function ModelViewer({ url }: ModelViewerProps) {
  const { scene } = useGLTF(url);
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  // Auto-center and scale the model to fit in a 1m bounding box
  const box = new THREE.Box3().setFromObject(scene);
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  const scale = maxDim > 0 ? 0.5 / maxDim : 1;
  const center = box.getCenter(new THREE.Vector3());

  return (
    <group ref={groupRef} data-testid="model-group">
      <group
        scale={[scale, scale, scale]}
        position={[-center.x * scale, -center.y * scale + 0.5, -center.z * scale]}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <primitive object={scene.clone()} />
        {/* Hover outline */}
        {hovered && (
          <mesh>
            <boxGeometry args={[size.x * 1.02, size.y * 1.02, size.z * 1.02]} />
            <meshBasicMaterial
              color="#3b82f6"
              wireframe
              transparent
              opacity={0.3}
            />
          </mesh>
        )}
      </group>
    </group>
  );
}
