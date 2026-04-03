"use client";

import { useState, useEffect } from "react";
import type { ScreenMapperTelemetry } from "@/lib/gesture-engine/screen-mapper";

/**
 * Hand Tracking Telemetry Overlay
 *
 * Shows real-time diagnostics for hand-to-screen mapping:
 * - Cursor position (raw vs mapped)
 * - Calibration range + progress
 * - Filter cutoff + speed
 * - Pinch state
 * - FPS + latency
 * - Depth factor
 */

interface TelemetryOverlayProps {
  telemetry: ScreenMapperTelemetry | null;
  visible: boolean;
}

export function TelemetryOverlay({ telemetry, visible }: TelemetryOverlayProps) {
  if (!visible || !telemetry) return null;

  const t = telemetry;
  const calibPct = Math.round(t.calibrationProgress * 100);

  return (
    <div style={styles.container} data-testid="telemetry-overlay">
      <div style={styles.header}>
        <span style={styles.dot(t.fps > 20 ? "#22c55e" : t.fps > 10 ? "#f59e0b" : "#ef4444")} />
        <span style={styles.title}>Hand Tracking Telemetry</span>
        <span style={styles.fps}>{t.fps.toFixed(0)} FPS</span>
      </div>

      <div style={styles.grid}>
        {/* Screen Position */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Cursor Position</div>
          <Row label="Screen X" value={t.screenX.toFixed(3)} bar={t.screenX} color="#3b82f6" />
          <Row label="Screen Y" value={t.screenY.toFixed(3)} bar={t.screenY} color="#3b82f6" />
          <Row label="Raw X" value={t.rawX.toFixed(3)} bar={t.rawX} color="#888" />
          <Row label="Raw Y" value={t.rawY.toFixed(3)} bar={t.rawY} color="#888" />
          <Row label="Depth Z" value={t.rawZ.toFixed(3)} bar={Math.abs(t.rawZ) * 3 + 0.5} color="#8b5cf6" />
        </div>

        {/* Calibration */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>
            Calibration {t.isCalibrating ? `(${calibPct}%)` : "✓"}
          </div>
          <Row label="Range X" value={`${t.rangeMinX.toFixed(2)} — ${t.rangeMaxX.toFixed(2)}`} />
          <Row label="Range Y" value={`${t.rangeMinY.toFixed(2)} — ${t.rangeMaxY.toFixed(2)}`} />
          <Row label="Progress" value={`${calibPct}%`} bar={t.calibrationProgress} color={t.isCalibrating ? "#f59e0b" : "#22c55e"} />
        </div>

        {/* Dynamics */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Dynamics</div>
          <Row label="Speed" value={t.speed.toFixed(3)} bar={Math.min(t.speed * 10, 1)} color="#06b6d4" />
          <Row label="Filter ƒ" value={t.filterCutoff.toFixed(2)} bar={Math.min(t.filterCutoff / 10, 1)} color="#f59e0b" />
          <Row label="Depth ×" value={t.depthFactor.toFixed(2)} bar={t.depthFactor / 2} color="#8b5cf6" />
          <Row label="Latency" value={`${t.latencyMs.toFixed(1)}ms`} bar={Math.min(t.latencyMs / 10, 1)} color={t.latencyMs < 5 ? "#22c55e" : "#ef4444"} />
        </div>

        {/* Pinch */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Pinch State</div>
          <Row label="Distance" value={t.pinchDistance.toFixed(3)} bar={1 - Math.min(t.pinchDistance * 10, 1)} color="#ec4899" />
          <Row label="Pinching" value={t.isPinching ? "YES ●" : "no"} color={t.isPinching ? "#22c55e" : "#666"} />
          <Row label="Confidence" value={`${(t.confidence * 100).toFixed(0)}%`} bar={t.confidence} color="#3b82f6" />
        </div>
      </div>

      {/* Mini cursor preview */}
      <div style={styles.previewContainer}>
        <div style={styles.previewLabel}>Mapping Preview</div>
        <div style={styles.preview}>
          {/* Raw position (grey dot) */}
          <div style={{
            position: "absolute",
            left: `${t.rawX * 100}%`,
            top: `${t.rawY * 100}%`,
            width: 6, height: 6,
            borderRadius: "50%",
            background: "#555",
            transform: "translate(-50%, -50%)",
          }} />
          {/* Mapped position (blue dot) */}
          <div style={{
            position: "absolute",
            left: `${t.screenX * 100}%`,
            top: `${t.screenY * 100}%`,
            width: 10, height: 10,
            borderRadius: "50%",
            background: t.isPinching ? "#22c55e" : "#3b82f6",
            transform: "translate(-50%, -50%)",
            boxShadow: `0 0 8px ${t.isPinching ? "#22c55e" : "#3b82f6"}`,
          }} />
          {/* Calibration range box */}
          <div style={{
            position: "absolute",
            left: `${t.rangeMinX * 100}%`,
            top: `${t.rangeMinY * 100}%`,
            width: `${(t.rangeMaxX - t.rangeMinX) * 100}%`,
            height: `${(t.rangeMaxY - t.rangeMinY) * 100}%`,
            borderWidth: 1,
            borderStyle: "dashed",
            borderColor: "#3b82f644",
            borderRadius: 2,
          }} />
        </div>
      </div>
    </div>
  );
}

/** Single telemetry row with optional bar graph */
function Row({ label, value, bar, color }: {
  label: string;
  value: string;
  bar?: number;
  color?: string;
}) {
  return (
    <div style={styles.row}>
      <span style={styles.label}>{label}</span>
      <span style={{ ...styles.value, color: color || "#ccc" }}>{value}</span>
      {bar !== undefined && (
        <div style={styles.barBg}>
          <div style={{
            ...styles.barFill,
            width: `${Math.max(0, Math.min(100, bar * 100))}%`,
            background: color || "#3b82f6",
          }} />
        </div>
      )}
    </div>
  );
}

const styles: Record<string, any> = {
  container: {
    position: "fixed" as const,
    bottom: 50,
    left: 10,
    width: 300,
    background: "#0a0a0aee",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "#2a2a2a",
    borderRadius: 10,
    padding: 10,
    zIndex: 200,
    fontFamily: "monospace",
    fontSize: 10,
    color: "#ccc",
    backdropFilter: "blur(8px)",
    pointerEvents: "none" as const,
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
    paddingBottom: 6,
    borderBottom: "1px solid #222",
  },
  dot: (color: string) => ({
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: color,
    flexShrink: 0,
  }),
  title: {
    fontWeight: 700,
    fontSize: 11,
    color: "#e5e5e5",
    flex: 1,
  },
  fps: {
    color: "#3b82f6",
    fontWeight: 700,
    fontSize: 12,
  },
  grid: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 6,
  },
  section: {
    padding: "4px 0",
  },
  sectionTitle: {
    fontSize: 9,
    fontWeight: 700,
    color: "#666",
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em",
    marginBottom: 3,
  },
  row: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    height: 16,
  },
  label: {
    width: 55,
    color: "#888",
    fontSize: 9,
    flexShrink: 0,
  },
  value: {
    width: 65,
    textAlign: "right" as const,
    fontSize: 10,
    fontWeight: 600,
    flexShrink: 0,
  },
  barBg: {
    flex: 1,
    height: 4,
    background: "#1a1a1a",
    borderRadius: 2,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 2,
    transition: "width 0.1s",
  },
  previewContainer: {
    marginTop: 8,
    borderTop: "1px solid #222",
    paddingTop: 6,
  },
  previewLabel: {
    fontSize: 9,
    color: "#666",
    fontWeight: 700,
    textTransform: "uppercase" as const,
    marginBottom: 4,
  },
  preview: {
    position: "relative" as const,
    width: "100%",
    height: 80,
    background: "#111",
    borderRadius: 4,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "#222",
    overflow: "hidden",
  },
};
