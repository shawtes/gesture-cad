"use client";

import React from "react";
import type { BrushType } from "@/lib/sculpting/brushes";

// ─── Types ───────────────────────────────────────────────

export interface SculptOverlayProps {
  active: boolean;
  brushRadius: number;
  brushStrength: number;
  onBrushChange: (type: BrushType, radius: number, strength: number) => void;
  cursorPosition: { x: number; y: number } | null;
}

// ─── Styles ──────────────────────────────────────────────

const overlayStyle: React.CSSProperties = {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  pointerEvents: "none",
  zIndex: 50,
};

const panelStyle: React.CSSProperties = {
  position: "absolute",
  top: 12,
  right: 12,
  pointerEvents: "auto",
  backgroundColor: "#0a0a0a",
  border: "1px solid #1f2937",
  borderRadius: 8,
  padding: 12,
  display: "flex",
  flexDirection: "column",
  gap: 10,
  minWidth: 200,
};

const labelStyle: React.CSSProperties = {
  color: "#9ca3af",
  fontSize: 11,
  fontWeight: 500,
  textTransform: "uppercase" as const,
  letterSpacing: "0.05em",
};

const sliderContainerStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
};

const sliderRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
};

const sliderStyle: React.CSSProperties = {
  flex: 1,
  accentColor: "#3b82f6",
  height: 4,
};

const valueStyle: React.CSSProperties = {
  color: "#d1d5db",
  fontSize: 12,
  fontFamily: "monospace",
  minWidth: 36,
  textAlign: "right" as const,
};

const brushGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: 4,
};

const titleStyle: React.CSSProperties = {
  color: "#e5e7eb",
  fontSize: 13,
  fontWeight: 600,
  marginBottom: 2,
};

// ─── Brush Buttons ───────────────────────────────────────

const BRUSH_OPTIONS: { type: BrushType; label: string }[] = [
  { type: "grab", label: "Grab" },
  { type: "smooth", label: "Smooth" },
  { type: "inflate", label: "Inflate" },
  { type: "pinch", label: "Pinch" },
  { type: "crease", label: "Crease" },
  { type: "flatten", label: "Flatten" },
];

function brushButtonStyle(isActive: boolean): React.CSSProperties {
  return {
    padding: "6px 4px",
    fontSize: 11,
    fontWeight: 500,
    border: isActive ? "1px solid #3b82f6" : "1px solid #374151",
    borderRadius: 4,
    backgroundColor: isActive ? "rgba(59, 130, 246, 0.15)" : "transparent",
    color: isActive ? "#3b82f6" : "#9ca3af",
    cursor: "pointer",
    textAlign: "center" as const,
    transition: "all 0.15s ease",
  };
}

// ─── Component ───────────────────────────────────────────

export function SculptOverlay({
  active,
  brushRadius,
  brushStrength,
  onBrushChange,
  cursorPosition,
}: SculptOverlayProps) {
  const [selectedBrush, setSelectedBrush] = React.useState<BrushType>("grab");

  const handleBrushSelect = React.useCallback(
    (type: BrushType) => {
      setSelectedBrush(type);
      onBrushChange(type, brushRadius, brushStrength);
    },
    [onBrushChange, brushRadius, brushStrength]
  );

  const handleRadiusChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newRadius = parseFloat(e.target.value);
      onBrushChange(selectedBrush, newRadius, brushStrength);
    },
    [onBrushChange, selectedBrush, brushStrength]
  );

  const handleStrengthChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newStrength = parseFloat(e.target.value);
      onBrushChange(selectedBrush, brushRadius, newStrength);
    },
    [onBrushChange, selectedBrush, brushRadius]
  );

  if (!active) return null;

  const cursorStyle: React.CSSProperties | null = cursorPosition
    ? {
        position: "absolute",
        left: cursorPosition.x - brushRadius,
        top: cursorPosition.y - brushRadius,
        width: brushRadius * 2,
        height: brushRadius * 2,
        borderRadius: "50%",
        border: "1.5px solid rgba(59, 130, 246, 0.6)",
        backgroundColor: "rgba(59, 130, 246, 0.08)",
        pointerEvents: "none",
        transition: "left 0.016s linear, top 0.016s linear",
      }
    : null;

  return (
    <div style={overlayStyle} data-testid="sculpt-overlay">
      {/* Brush cursor circle */}
      {cursorStyle && <div style={cursorStyle} data-testid="brush-cursor" />}

      {/* Control panel */}
      <div style={panelStyle}>
        <div style={titleStyle}>Sculpt</div>

        {/* Brush type selector */}
        <div>
          <div style={labelStyle}>Brush</div>
          <div style={{ ...brushGridStyle, marginTop: 4 }}>
            {BRUSH_OPTIONS.map(({ type, label }) => (
              <button
                key={type}
                type="button"
                style={brushButtonStyle(selectedBrush === type)}
                onClick={() => handleBrushSelect(type)}
                data-testid={`brush-btn-${type}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Radius slider */}
        <div style={sliderContainerStyle}>
          <div style={labelStyle}>Radius</div>
          <div style={sliderRowStyle}>
            <input
              type="range"
              min={1}
              max={200}
              step={1}
              value={brushRadius}
              onChange={handleRadiusChange}
              style={sliderStyle}
              data-testid="brush-radius-slider"
            />
            <span style={valueStyle}>{brushRadius}</span>
          </div>
        </div>

        {/* Strength slider */}
        <div style={sliderContainerStyle}>
          <div style={labelStyle}>Strength</div>
          <div style={sliderRowStyle}>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={brushStrength}
              onChange={handleStrengthChange}
              style={sliderStyle}
              data-testid="brush-strength-slider"
            />
            <span style={valueStyle}>{brushStrength.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SculptOverlay;
