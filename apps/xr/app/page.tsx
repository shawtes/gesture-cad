"use client";

/**
 * GestureCAD XR — Holographic AR CAD Viewer
 *
 * Two-phase loading for Quest Browser compatibility:
 * 1. Lightweight landing page (no Three.js) — loads instantly
 * 2. Full 3D scene loaded on demand when user taps "Launch"
 */

import { useState } from "react";
import dynamic from "next/dynamic";

// Lazy-load the heavy 3D scene — only downloads Three.js when needed
const XRScene3D = dynamic(() => import("@/components/xr-app"), {
  ssr: false,
  loading: () => (
    <div style={loadingStyle}>
      <div style={spinnerStyle} />
      <p>Loading 3D engine...</p>
    </div>
  ),
});

export default function XRPage() {
  const [launched, setLaunched] = useState(false);
  const [xrSupport, setXrSupport] = useState<string>("checking...");

  // Check WebXR on mount
  if (typeof window !== "undefined" && xrSupport === "checking...") {
    if (navigator.xr) {
      navigator.xr
        .isSessionSupported("immersive-ar")
        .then((supported) =>
          setXrSupport(supported ? "AR supported" : "VR only")
        )
        .catch(() => setXrSupport("WebXR error"));
    } else {
      setXrSupport("No WebXR (desktop mode)");
    }
  }

  if (launched) {
    return <XRScene3D />;
  }

  return (
    <div style={landingStyle}>
      <div style={cardStyle}>
        <span style={{ fontSize: 48 }}>◈</span>
        <h1 style={titleStyle}>GestureCAD XR</h1>
        <p style={badgeStyle}>HOLOGRAM</p>

        <p style={descStyle}>
          View your CAD models as holograms in AR.
          <br />
          Control with your hands or controllers.
        </p>

        <div style={statusStyle}>
          <span style={{ color: xrSupport.includes("AR") ? "#00ccaa" : "#888" }}>
            {xrSupport}
          </span>
        </div>

        <button style={launchBtnStyle} onClick={() => setLaunched(true)}>
          Launch 3D Viewer
        </button>

        <div style={hintsStyle}>
          <p>Pinch = grab & move</p>
          <p>Two-hand pinch = scale</p>
          <p>Fist = rotate</p>
          <p>Open palm = reset</p>
        </div>
      </div>
    </div>
  );
}

const landingStyle: React.CSSProperties = {
  width: "100vw",
  height: "100vh",
  background: "#f5f0e8",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: "'SF Mono', 'Menlo', monospace",
};

const cardStyle: React.CSSProperties = {
  textAlign: "center",
  color: "#333",
  maxWidth: 400,
  padding: "40px 30px",
};

const titleStyle: React.CSSProperties = {
  fontSize: 28,
  fontWeight: 700,
  color: "#333",
  margin: "12px 0 8px",
  letterSpacing: "-0.02em",
};

const badgeStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  color: "#00ccaa",
  letterSpacing: "0.2em",
  background: "rgba(0,255,204,0.1)",
  border: "1px solid rgba(0,255,204,0.3)",
  display: "inline-block",
  padding: "3px 12px",
  borderRadius: 4,
  marginBottom: 24,
};

const descStyle: React.CSSProperties = {
  fontSize: 14,
  color: "#668",
  lineHeight: 1.6,
  marginBottom: 20,
};

const statusStyle: React.CSSProperties = {
  fontSize: 12,
  marginBottom: 24,
  padding: "8px 16px",
  background: "rgba(0,255,204,0.05)",
  border: "1px solid rgba(0,255,204,0.15)",
  borderRadius: 8,
  display: "inline-block",
};

const launchBtnStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  padding: "16px 0",
  fontSize: 16,
  fontWeight: 700,
  fontFamily: "inherit",
  color: "#f5f0e8",
  background: "#00ccaa",
  border: "none",
  borderRadius: 10,
  cursor: "pointer",
  marginBottom: 24,
};

const hintsStyle: React.CSSProperties = {
  fontSize: 11,
  color: "#445",
  lineHeight: 1.8,
};

const loadingStyle: React.CSSProperties = {
  width: "100vw",
  height: "100vh",
  background: "#f5f0e8",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  color: "#00ccaa",
  fontFamily: "'SF Mono', monospace",
  fontSize: 14,
  gap: 16,
};

const spinnerStyle: React.CSSProperties = {
  width: 32,
  height: 32,
  border: "3px solid #112",
  borderTop: "3px solid #00ccaa",
  borderRadius: "50%",
  animation: "spin 1s linear infinite",
};
