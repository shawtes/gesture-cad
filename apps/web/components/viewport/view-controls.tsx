"use client";

import { useState } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";

export type RenderMode = "shaded" | "wireframe" | "flat" | "xray";

interface ViewControlsProps {
  onRenderModeChange: (mode: RenderMode) => void;
  renderMode: RenderMode;
}

const VIEW_PRESETS: { label: string; pos: [number, number, number]; key: string }[] = [
  { label: "Top", pos: [0, 10, 0], key: "top" },
  { label: "Front", pos: [0, 0, 10], key: "front" },
  { label: "Right", pos: [10, 0, 0], key: "right" },
  { label: "Iso", pos: [5, 5, 5], key: "iso" },
  { label: "Back", pos: [0, 0, -10], key: "back" },
  { label: "Left", pos: [-10, 0, 0], key: "left" },
];

const RENDER_MODES: { id: RenderMode; label: string }[] = [
  { id: "shaded", label: "Shaded" },
  { id: "wireframe", label: "Wire" },
  { id: "flat", label: "Flat" },
  { id: "xray", label: "X-Ray" },
];

export function ViewControls({ onRenderModeChange, renderMode }: ViewControlsProps) {
  return null; // Rendered as HTML overlay, not inside Canvas
}

/** HTML overlay panel for view controls — placed outside Canvas */
export function ViewControlsPanel({
  onViewPreset,
  renderMode,
  onRenderModeChange,
}: {
  onViewPreset: (pos: [number, number, number]) => void;
  renderMode: RenderMode;
  onRenderModeChange: (mode: RenderMode) => void;
}) {
  return (
    <div style={styles.panel} data-testid="view-controls">
      {/* View presets */}
      <div style={styles.section}>
        <div style={styles.sectionLabel}>Views</div>
        <div style={styles.btnGrid}>
          {VIEW_PRESETS.map((v) => (
            <button
              key={v.key}
              data-testid={`view-${v.key}`}
              style={styles.viewBtn}
              onClick={() => onViewPreset(v.pos)}
              title={`${v.label} view`}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* Render mode */}
      <div style={styles.section}>
        <div style={styles.sectionLabel}>Display</div>
        <div style={styles.btnGrid}>
          {RENDER_MODES.map((m) => (
            <button
              key={m.id}
              data-testid={`render-${m.id}`}
              style={{
                ...styles.viewBtn,
                ...(renderMode === m.id ? styles.activeBtn : {}),
              }}
              onClick={() => onRenderModeChange(m.id)}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    position: "absolute",
    bottom: 40,
    right: 12,
    zIndex: 10,
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  section: {
    background: "rgba(20, 20, 20, 0.9)",
    border: "1px solid #2a2a2a",
    borderRadius: 8,
    padding: "8px 10px",
  },
  sectionLabel: {
    fontSize: 9,
    color: "#666",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
    marginBottom: 6,
    fontWeight: 600,
  },
  btnGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 3,
  },
  viewBtn: {
    padding: "4px 0",
    background: "#1e1e1e",
    border: "1px solid #333",
    borderRadius: 3,
    color: "#a0a0a0",
    cursor: "pointer",
    fontFamily: "inherit",
    fontSize: 10,
    textAlign: "center" as const,
  },
  activeBtn: {
    background: "#1e3a5f",
    border: "1px solid #3b82f6",
    color: "#e5e5e5",
  },
};
