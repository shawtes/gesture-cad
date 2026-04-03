"use client";

/**
 * Overlay Toolbar — 2D HTML toolbar rendered via DOM Overlay.
 * Visible in both desktop and AR/VR modes.
 */

import type { HologramPreset } from "@/lib/hologram-material";

const PRESET_HEX: Record<string, string> = {
  cyan: "#00ffcc", blue: "#00aaff", green: "#22ff66",
  orange: "#ff8800", purple: "#aa44ff",
};
const PRESETS: HologramPreset[] = ["cyan", "blue", "green", "orange", "purple"];

interface OverlayToolbarProps {
  onEnterAR: () => void;
  onEnterVR: () => void;
  preset: HologramPreset;
  onPresetChange: (p: HologramPreset) => void;
  wireframe: boolean;
  onWireframeToggle: () => void;
  objectCount: number;
  activeTool: string;
}

export function OverlayToolbar({
  onEnterAR, onEnterVR, preset, onPresetChange,
  wireframe, onWireframeToggle, objectCount, activeTool,
}: OverlayToolbarProps) {
  return (
    <div data-xr-ui style={bar}>
      <span style={{ color: "#00ffcc", fontSize: 16 }}>◈</span>
      <button style={arBtn} onClick={onEnterAR}>AR</button>
      <button style={vrBtn} onClick={onEnterVR}>VR</button>
      <div style={{ flex: 1 }} />
      <div style={{ display: "flex", gap: 3 }}>
        {PRESETS.map(p => (
          <button key={p} onClick={() => onPresetChange(p)} style={{
            width: 18, height: 18, borderRadius: 9, background: PRESET_HEX[p],
            border: preset === p ? "2px solid #fff" : "2px solid transparent",
            cursor: "pointer",
          }} />
        ))}
      </div>
      <button style={sm} onClick={onWireframeToggle}>{wireframe ? "◼" : "◻"}</button>
      <span style={badge}>{objectCount} obj</span>
      <span style={badge}>{activeTool === "select" ? "READY" : activeTool}</span>
    </div>
  );
}

const bar: React.CSSProperties = {
  position: "fixed", top: 0, left: 0, right: 0,
  padding: "6px 10px", display: "flex", alignItems: "center", gap: 8,
  background: "rgba(245,240,232,0.95)", borderBottom: "1px solid #d4cfc7",
  pointerEvents: "auto", zIndex: 110,
};
const arBtn: React.CSSProperties = {
  padding: "10px 24px", fontSize: 15, fontWeight: 700, fontFamily: "inherit",
  background: "#00ccaa", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer",
};
const vrBtn: React.CSSProperties = {
  padding: "10px 24px", fontSize: 15, fontWeight: 700, fontFamily: "inherit",
  background: "#2288dd", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer",
};
const sm: React.CSSProperties = {
  width: 28, height: 28, fontSize: 14, background: "rgba(255,255,255,0.06)",
  color: "#666", border: "1px solid #ccc", borderRadius: 6, cursor: "pointer", fontFamily: "inherit",
};
const badge: React.CSSProperties = {
  fontSize: 10, color: "#00886a", fontFamily: "monospace",
  background: "rgba(0,200,160,0.1)", padding: "2px 8px", borderRadius: 4,
};
