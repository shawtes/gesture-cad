"use client";

import { useEffect, useRef, useState } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";

interface SplatViewerProps {
  /** URL to .splat, .ksplat, or .ply file */
  url: string | null;
  /** Position offset in the scene */
  position?: [number, number, number];
  /** Scale factor */
  scale?: number;
}

/**
 * Gaussian Splatting viewer component.
 * Uses @mkkellogg/gaussian-splats-3d DropInViewer.
 * Loads dynamically to avoid SSR issues with the WASM-heavy library.
 */
export function SplatViewer({ url, position = [0, 0.5, 0], scale = 1 }: SplatViewerProps) {
  const { scene } = useThree();
  const viewerRef = useRef<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!url) return;
    const splatUrl = url; // narrow type for closure

    let mounted = true;

    async function loadSplat() {
      setLoading(true);
      setError(null);

      try {
        // Dynamic import to avoid SSR bundling
        const GaussianSplats3D = await import(
          /* webpackIgnore: true */
          "@mkkellogg/gaussian-splats-3d"
        );

        if (!mounted) return;

        // Clean up previous viewer
        if (viewerRef.current) {
          try { viewerRef.current.dispose(); } catch {}
          viewerRef.current = null;
        }

        const viewer = new GaussianSplats3D.DropInViewer({
          gpuAcceleratedSort: true,
          sharedMemoryForWorkers: false,
        });

        await viewer.addSplatScene(splatUrl, {
          position,
          rotation: [0, 0, 0, 1],
          scale: [scale, scale, scale],
        });

        if (!mounted) {
          viewer.dispose();
          return;
        }

        scene.add(viewer as any);
        viewerRef.current = viewer;
        setLoading(false);
      } catch (err: any) {
        if (mounted) {
          console.warn("[SplatViewer] Failed to load:", err);
          setError(err.message || "Failed to load splat");
          setLoading(false);
        }
      }
    }

    loadSplat();

    return () => {
      mounted = false;
      if (viewerRef.current) {
        try {
          scene.remove(viewerRef.current as any);
          viewerRef.current.dispose();
        } catch {}
        viewerRef.current = null;
      }
    };
  }, [url, scene, position, scale]);

  // Loading/error indicator
  if (!url) return null;

  return (
    <group>
      {loading && (
        <mesh position={[position[0], position[1] + 0.1, position[2]]}>
          <sphereGeometry args={[0.02, 8, 8]} />
          <meshBasicMaterial color="#eab308" />
        </mesh>
      )}
    </group>
  );
}
