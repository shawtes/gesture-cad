"use client";

/**
 * XR Overlay — renders 2D UI via DOM Overlay in AR.
 * Uses XRDomOverlay from @react-three/xr which portals children
 * into the WebXR DOM overlay root during immersive sessions.
 */

import { type ReactNode } from "react";
import { XRDomOverlay } from "@react-three/xr";

interface XROverlayProps {
  children: ReactNode;
}

export function XROverlay({ children }: XROverlayProps) {
  return (
    <XRDomOverlay
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: "none",
        zIndex: 100,
        fontFamily: "'SF Mono', Menlo, monospace",
      }}
    >
      {children}
    </XRDomOverlay>
  );
}
