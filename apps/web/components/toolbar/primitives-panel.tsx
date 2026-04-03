"use client";

import { useState } from "react";
import { useCADDispatch } from "@/lib/store";
import { createExtrudeFeature } from "@/lib/features";
import { generatePrimitive, type PrimitiveType, type PrimitiveParams } from "@/lib/primitives";

interface PrimitiveDef {
  id: PrimitiveType;
  label: string;
  icon: string;
  defaults: Partial<PrimitiveParams>;
  description: string;
}

const PRIMITIVES: PrimitiveDef[] = [
  { id: "box", label: "Box", icon: "▢", defaults: { width: 2, height: 2, depth: 2 }, description: "Rectangular solid" },
  { id: "cylinder", label: "Cylinder", icon: "◎", defaults: { radius: 1, height: 2, segments: 32 }, description: "Round column" },
  { id: "sphere", label: "Sphere", icon: "●", defaults: { radius: 1, segments: 24 }, description: "Ball shape" },
  { id: "cone", label: "Cone", icon: "▲", defaults: { radius: 1, height: 2, segments: 32 }, description: "Pointed solid" },
  { id: "torus", label: "Torus", icon: "◉", defaults: { radius: 1.5, tubeRadius: 0.4, segments: 24 }, description: "Donut ring" },
];

export function PrimitivesPanel() {
  const dispatch = useCADDispatch();
  const [open, setOpen] = useState(false);
  const [selectedPrim, setSelectedPrim] = useState<PrimitiveDef | null>(null);
  const [params, setParams] = useState<Record<string, number>>({});

  const openWithPrimitive = (prim: PrimitiveDef) => {
    setSelectedPrim(prim);
    const defaults: Record<string, number> = {};
    if (prim.defaults.width) defaults.width = prim.defaults.width;
    if (prim.defaults.height) defaults.height = prim.defaults.height;
    if (prim.defaults.depth) defaults.depth = prim.defaults.depth;
    if (prim.defaults.radius) defaults.radius = prim.defaults.radius;
    if (prim.defaults.tubeRadius) defaults.tubeRadius = prim.defaults.tubeRadius;
    if (prim.defaults.segments) defaults.segments = prim.defaults.segments;
    setParams(defaults);
  };

  const addPrimitive = () => {
    if (!selectedPrim) return;
    const mesh = generatePrimitive({
      type: selectedPrim.id,
      ...params,
    });
    const feature = createExtrudeFeature([], { distance: 0, direction: "up" }, mesh);
    feature.name = selectedPrim.label;
    dispatch({ type: "ADD_FEATURE", feature });
    setOpen(false);
    setSelectedPrim(null);
  };

  const quickAdd = (prim: PrimitiveDef) => {
    const mesh = generatePrimitive({
      type: prim.id,
      ...prim.defaults,
    });
    const feature = createExtrudeFeature([], { distance: 0, direction: "up" }, mesh);
    feature.name = prim.label;
    dispatch({ type: "ADD_FEATURE", feature });
  };

  return (
    <div style={styles.wrapper}>
      <button
        data-testid="primitives-btn"
        style={styles.trigger}
        onClick={() => { setOpen(!open); setSelectedPrim(null); }}
        title="Insert 3D Primitive"
      >
        <span style={styles.triggerIcon}>◆</span>
        Primitives
      </button>
      {open && (
        <div style={styles.dropdown} data-testid="primitives-menu">
          <div style={styles.header}>Insert 3D Primitive</div>

          {/* Quick-add grid */}
          <div style={styles.grid}>
            {PRIMITIVES.map((p) => (
              <button
                key={p.id}
                data-testid={`prim-${p.id}`}
                style={{
                  ...styles.gridItem,
                  ...(selectedPrim?.id === p.id ? styles.gridItemActive : {}),
                }}
                onClick={() => openWithPrimitive(p)}
                onDoubleClick={() => quickAdd(p)}
                title={`${p.label} — ${p.description} (double-click for quick add)`}
              >
                <span style={styles.gridIcon}>{p.icon}</span>
                <span style={styles.gridLabel}>{p.label}</span>
              </button>
            ))}
          </div>

          {/* Size controls */}
          {selectedPrim && (
            <div style={styles.paramsSection}>
              <div style={styles.paramHeader}>{selectedPrim.label} Parameters</div>
              {Object.entries(params).map(([key, value]) => (
                <div key={key} style={styles.paramRow}>
                  <label style={styles.paramLabel}>{key}</label>
                  <input
                    type="number"
                    value={value}
                    step={key === "segments" ? 4 : 0.1}
                    min={key === "segments" ? 8 : 0.1}
                    style={styles.paramInput}
                    onChange={(e) => setParams({ ...params, [key]: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              ))}
              <button style={styles.addBtn} onClick={addPrimitive}>
                Add {selectedPrim.label}
              </button>
            </div>
          )}

          {!selectedPrim && (
            <div style={styles.hint}>
              Click to customize, double-click to quick-add
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: { position: "relative" },
  trigger: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "4px 12px",
    background: "#1a2a1e",
    border: "1px solid #22c55e44",
    borderRadius: 5,
    color: "#22c55e",
    cursor: "pointer",
    fontFamily: "inherit",
    fontSize: 11,
    fontWeight: 600,
  },
  triggerIcon: { fontSize: 14 },
  dropdown: {
    position: "absolute",
    top: "100%",
    right: 0,
    marginTop: 6,
    background: "#1a1a1a",
    border: "1px solid #333",
    borderRadius: 8,
    padding: 12,
    minWidth: 260,
    zIndex: 100,
    boxShadow: "0 12px 32px rgba(0,0,0,0.6)",
  },
  header: {
    fontSize: 12,
    fontWeight: 700,
    color: "#e5e5e5",
    marginBottom: 10,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(5, 1fr)",
    gap: 4,
  },
  gridItem: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    gap: 2,
    padding: "8px 4px",
    background: "#222",
    borderWidth: 1,
    borderStyle: "solid" as const,
    borderColor: "#333",
    borderRadius: 6,
    color: "#aaa",
    cursor: "pointer",
    fontFamily: "inherit",
    fontSize: 9,
    transition: "all 0.12s",
  },
  gridItemActive: {
    background: "#1e3a5f",
    borderColor: "#3b82f6",
    color: "#e5e5e5",
  },
  gridIcon: { fontSize: 20 },
  gridLabel: { fontSize: 9 },
  paramsSection: {
    marginTop: 10,
    paddingTop: 10,
    borderTop: "1px solid #333",
  },
  paramHeader: {
    fontSize: 11,
    fontWeight: 600,
    color: "#999",
    marginBottom: 6,
  },
  paramRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  paramLabel: {
    fontSize: 11,
    color: "#888",
    textTransform: "capitalize" as const,
  },
  paramInput: {
    width: 70,
    padding: "3px 6px",
    background: "#111",
    border: "1px solid #444",
    borderRadius: 3,
    color: "#3b82f6",
    fontFamily: "inherit",
    fontSize: 12,
    fontWeight: 600,
    textAlign: "right" as const,
  },
  addBtn: {
    width: "100%",
    marginTop: 8,
    padding: "8px 0",
    background: "#3b82f6",
    border: "none",
    borderRadius: 5,
    color: "#fff",
    cursor: "pointer",
    fontFamily: "inherit",
    fontSize: 12,
    fontWeight: 600,
  },
  hint: {
    marginTop: 8,
    fontSize: 10,
    color: "#555",
    textAlign: "center" as const,
  },
};
