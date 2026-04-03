"use client";

/**
 * Holographic Model Viewer
 *
 * Renders any 3D model (GLB/GLTF or CAD mesh) as a holographic projection.
 * Features:
 * - Hologram shader (scan lines, edge glow, flicker)
 * - Hand gesture interaction (grab-rotate, bimanual scale)
 * - Controller support as fallback
 * - Wireframe overlay toggle
 * - Color preset switching
 * - Floating base platform with rotating ring
 */

import { useRef, useMemo, useEffect, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import {
  createHologramMaterial,
  updateHologramTime,
  HOLOGRAM_PRESETS,
  type HologramPreset,
} from "@/lib/hologram-material";

interface HologramViewerProps {
  /** URL to GLB/GLTF model */
  url?: string;
  /** Raw mesh data from CAD (vertices, normals, indices) */
  meshData?: {
    vertices: number[];
    normals: number[];
    indices: number[];
  };
  /** Hologram color preset */
  preset?: HologramPreset;
  /** Show wireframe overlay */
  wireframe?: boolean;
  /** Enable hand/controller interaction */
  interactive?: boolean;
  /** Model position */
  position?: [number, number, number];
  /** Model scale */
  scale?: number;
  /** Callback when model is grabbed */
  onGrab?: () => void;
  /** Callback when model is released */
  onRelease?: () => void;
}

export function HologramViewer({
  url,
  meshData,
  preset = "cyan",
  wireframe = false,
  interactive = true,
  position = [0, 0.8, -0.5],
  scale = 0.4,
  onGrab,
  onRelease,
}: HologramViewerProps) {
  const groupRef = useRef<THREE.Group>(null);
  const platformRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Create hologram material
  const holoMaterial = useMemo(() => {
    const presetParams = HOLOGRAM_PRESETS[preset];
    return createHologramMaterial({ ...presetParams, wireframe });
  }, [preset, wireframe]);

  // Create wireframe overlay material
  const wireMaterial = useMemo(() => {
    const presetParams = HOLOGRAM_PRESETS[preset];
    return createHologramMaterial({
      ...presetParams,
      wireframe: true,
      opacity: 0.15,
      edgeGlow: 0.5,
    });
  }, [preset]);

  // Platform glow material
  const platformMaterial = useMemo(() => {
    const color = new THREE.Color(HOLOGRAM_PRESETS[preset].color);
    return new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
    });
  }, [preset]);

  const ringMaterial = useMemo(() => {
    const color = new THREE.Color(HOLOGRAM_PRESETS[preset].color);
    return new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.3,
      wireframe: true,
    });
  }, [preset]);

  // Animate hologram
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    updateHologramTime(holoMaterial, t);
    updateHologramTime(wireMaterial, t);

    // Rotate the ring slowly
    if (ringRef.current) {
      ringRef.current.rotation.y = t * 0.5;
    }

    // Subtle hover bob
    if (groupRef.current && isHovered) {
      groupRef.current.position.y = position[1] + Math.sin(t * 2) * 0.005;
    }
  });

  return (
    <group position={position}>
      {/* Base platform — floating disc */}
      <mesh
        ref={platformRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.01, 0]}
        material={platformMaterial}
      >
        <circleGeometry args={[scale * 1.2, 32]} />
      </mesh>

      {/* Rotating ring around platform */}
      <mesh
        ref={ringRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        material={ringMaterial}
      >
        <torusGeometry args={[scale * 1.3, 0.005, 8, 64]} />
      </mesh>

      {/* Holographic model */}
      <group
        ref={groupRef}
        scale={[scale, scale, scale]}
        onPointerOver={() => interactive && setIsHovered(true)}
        onPointerOut={() => setIsHovered(false)}
      >
        {url && (
          <HologramGLTF
            url={url}
            holoMaterial={holoMaterial}
            wireMaterial={wireMaterial}
            showWireframe={wireframe}
          />
        )}
        {meshData && (
          <HologramMesh
            meshData={meshData}
            holoMaterial={holoMaterial}
            wireMaterial={wireMaterial}
            showWireframe={wireframe}
          />
        )}
      </group>

      {/* Vertical scan beam */}
      <HologramBeam color={HOLOGRAM_PRESETS[preset].color} height={scale * 2} />
    </group>
  );
}

/** Load and render a GLTF/GLB model with hologram shader */
function HologramGLTF({
  url,
  holoMaterial,
  wireMaterial,
  showWireframe,
}: {
  url: string;
  holoMaterial: THREE.ShaderMaterial;
  wireMaterial: THREE.ShaderMaterial;
  showWireframe: boolean;
}) {
  const { scene } = useGLTF(url);
  const clonedScene = useMemo(() => {
    const clone = scene.clone(true);

    // Replace all materials with hologram shader
    clone.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material = holoMaterial;
      }
    });

    // Auto-center and normalize size
    const box = new THREE.Box3().setFromObject(clone);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const normalizeScale = maxDim > 0 ? 1 / maxDim : 1;

    clone.position.sub(center).multiplyScalar(normalizeScale);
    clone.scale.multiplyScalar(normalizeScale);

    return clone;
  }, [scene, holoMaterial]);

  return (
    <>
      <primitive object={clonedScene} />
      {showWireframe && (
        <primitive object={clonedScene.clone(true)} />
      )}
    </>
  );
}

/** Render raw mesh data with hologram shader (for CAD models from web app) */
function HologramMesh({
  meshData,
  holoMaterial,
  wireMaterial,
  showWireframe,
}: {
  meshData: { vertices: number[]; normals: number[]; indices: number[] };
  holoMaterial: THREE.ShaderMaterial;
  wireMaterial: THREE.ShaderMaterial;
  showWireframe: boolean;
}) {
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(meshData.vertices, 3));
    if (meshData.normals.length > 0) {
      geo.setAttribute("normal", new THREE.Float32BufferAttribute(meshData.normals, 3));
    } else {
      geo.computeVertexNormals();
    }
    if (meshData.indices.length > 0) {
      geo.setIndex(new THREE.BufferAttribute(new Uint32Array(meshData.indices), 1));
    }

    // Center the geometry
    geo.computeBoundingBox();
    geo.center();

    // Normalize to unit size
    const box = geo.boundingBox!;
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    if (maxDim > 0) {
      geo.scale(1 / maxDim, 1 / maxDim, 1 / maxDim);
    }

    return geo;
  }, [meshData]);

  return (
    <>
      <mesh geometry={geometry} material={holoMaterial} />
      {showWireframe && (
        <mesh geometry={geometry} material={wireMaterial} />
      )}
    </>
  );
}

/** Vertical light beam under the hologram */
function HologramBeam({ color, height }: { color: string; height: number }) {
  const beamMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(color),
        transparent: true,
        opacity: 0.04,
        side: THREE.DoubleSide,
      }),
    [color]
  );

  return (
    <mesh position={[0, height / 2, 0]} material={beamMaterial}>
      <cylinderGeometry args={[0.02, 0.15, height, 16, 1, true]} />
    </mesh>
  );
}
