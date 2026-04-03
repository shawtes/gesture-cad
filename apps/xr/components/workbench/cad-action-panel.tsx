"use client";

/**
 * CAD Action Panel — executes real CAD operations locally.
 * No server dependency. Creates Three.js geometry directly.
 */

import { useState, useCallback, useEffect } from "react";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import {
  createBox, createCylinder, createSphere, createCone, createTorus,
  createExtrudedRect, createExtrudedCircle, createExtrudedPolygon,
  generateHouse, type CADObject,
} from "@/lib/local-cad-engine";
import { HOLOGRAM_PRESETS, type HologramPreset } from "@/lib/hologram-material";

interface CADActionPanelProps {
  activeTool: string;
  preset: HologramPreset;
  onAddObject: (obj: CADObject) => void;
  onAddObjects: (objs: CADObject[]) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClearAll: () => void;
  objectCount: number;
}

// Tool params
interface Param {
  name: string;
  label: string;
  min: number;
  max: number;
  step: number;
  default: number;
}

const FEATURE_PARAMS: Record<string, Param[]> = {
  extrude: [{ name: "height", label: "Height", min: 0.1, max: 5, step: 0.1, default: 1 }],
  fillet: [{ name: "radius", label: "Radius", min: 0.01, max: 0.5, step: 0.01, default: 0.1 }],
  chamfer: [{ name: "dist", label: "Distance", min: 0.01, max: 0.5, step: 0.01, default: 0.1 }],
  shell: [{ name: "thickness", label: "Thickness", min: 0.01, max: 0.3, step: 0.01, default: 0.1 }],
  hole: [
    { name: "diameter", label: "Diameter", min: 0.05, max: 2, step: 0.05, default: 0.5 },
    { name: "depth", label: "Depth", min: 0.1, max: 5, step: 0.1, default: 1 },
  ],
  linear_pattern: [
    { name: "count", label: "Count", min: 2, max: 10, step: 1, default: 3 },
    { name: "spacing", label: "Spacing", min: 0.2, max: 3, step: 0.1, default: 1 },
  ],
};

const PLANES = [
  { id: "xz", label: "Top" },
  { id: "xy", label: "Front" },
  { id: "yz", label: "Side" },
];

export function CADActionPanel({
  activeTool, preset, onAddObject, onAddObjects, onUndo, onRedo, onClearAll, objectCount,
}: CADActionPanelProps) {
  const [params, setParams] = useState<Record<string, number>>({});
  const [plane, setPlane] = useState("xz");
  const [size, setSize] = useState(1);
  const color = HOLOGRAM_PRESETS[preset].color;

  useEffect(() => {
    const fp = FEATURE_PARAMS[activeTool];
    if (fp) {
      const d: Record<string, number> = {};
      fp.forEach(p => d[p.name] = p.default);
      setParams(d);
    }
  }, [activeTool]);

  // Don't show for view mode
  if (activeTool === "select" || activeTool === "view") return null;

  // ═══ PRIMITIVES ═══
  if (["box", "cylinder", "sphere", "cone", "torus"].includes(activeTool)) {
    const addPrimitive = () => {
      const s = size;
      switch (activeTool) {
        case "box": onAddObject(createBox(s, s, s)); break;
        case "cylinder": onAddObject(createCylinder(s / 2, s)); break;
        case "sphere": onAddObject(createSphere(s / 2)); break;
        case "cone": onAddObject(createCone(s / 2, s)); break;
        case "torus": onAddObject(createTorus(s / 2, s / 6)); break;
      }
    };

    return (
      <group position={[0.55, 1.1, 0.25]}>
        <Html transform distanceFactor={0.7} style={{ pointerEvents: "auto" }}>
          <div style={panel(color)}>
            <div style={title(color)}>Add {activeTool}</div>
            <div style={label}>Size: {size.toFixed(1)}m</div>
            <input type="range" min={0.1} max={3} step={0.1} value={size}
              onChange={e => setSize(parseFloat(e.target.value))} style={slider(color)} />
            <button style={btn(color)} onClick={addPrimitive}>Add {activeTool}</button>
          </div>
        </Html>
      </group>
    );
  }

  // ═══ SKETCH TOOLS ═══
  if (["line", "rect", "circle", "polygon", "arc"].includes(activeTool)) {
    const addSketch = (withExtrude: boolean) => {
      const h = withExtrude ? (params.height || 1) : 0.02;
      switch (activeTool) {
        case "rect": onAddObject(createExtrudedRect(-size/2, -size/2, size/2, size/2, h)); break;
        case "circle": onAddObject(createExtrudedCircle(0, 0, size/2, h)); break;
        case "polygon": onAddObject(createExtrudedPolygon(0, 0, size/2, 6, h)); break;
        default: onAddObject(createExtrudedRect(-size/2, -0.02, size/2, 0.02, h)); break;
      }
    };

    return (
      <group position={[0.55, 1.1, 0.25]}>
        <Html transform distanceFactor={0.7} style={{ pointerEvents: "auto" }}>
          <div style={panel(color)}>
            <div style={title(color)}>Sketch: {activeTool}</div>

            <div style={{ display: "flex", gap: 3, marginBottom: 8 }}>
              {PLANES.map(p => (
                <button key={p.id}
                  style={{ ...planeBtn, ...(plane === p.id ? planeBtnAct(color) : {}) }}
                  onClick={() => setPlane(p.id)}>
                  {p.label}
                </button>
              ))}
            </div>

            <div style={label}>Size: {size.toFixed(1)}m</div>
            <input type="range" min={0.1} max={5} step={0.1} value={size}
              onChange={e => setSize(parseFloat(e.target.value))} style={slider(color)} />

            <div style={label}>Extrude: {(params.height || 1).toFixed(1)}m</div>
            <input type="range" min={0.1} max={5} step={0.1} value={params.height || 1}
              onChange={e => setParams({...params, height: parseFloat(e.target.value)})} style={slider(color)} />

            <button style={btn(color)} onClick={() => addSketch(false)}>Add Flat</button>
            <button style={btn(color)} onClick={() => addSketch(true)}>Add + Extrude</button>
          </div>
        </Html>
      </group>
    );
  }

  // ═══ GENERATE ═══
  if (activeTool === "generate") {
    return (
      <group position={[0.55, 1.1, 0.25]}>
        <Html transform distanceFactor={0.7} style={{ pointerEvents: "auto" }}>
          <div style={panel(color)}>
            <div style={title(color)}>Generate House</div>
            <button style={btn(color)} onClick={() => onAddObjects(generateHouse("1bed"))}>
              1-Bed Apartment
            </button>
            <button style={btn(color)} onClick={() => onAddObjects(generateHouse("2bed"))}>
              2-Bed House
            </button>
            <button style={btn(color)} onClick={() => onAddObjects(generateHouse("3bed"))}>
              3-Bed House
            </button>
          </div>
        </Html>
      </group>
    );
  }

  // ═══ FEATURE TOOLS ═══
  const fp = FEATURE_PARAMS[activeTool];
  if (fp) {
    return (
      <group position={[0.55, 1.1, 0.25]}>
        <Html transform distanceFactor={0.7} style={{ pointerEvents: "auto" }}>
          <div style={panel(color)}>
            <div style={title(color)}>{activeTool.replace(/_/g, " ")}</div>
            {fp.map(p => (
              <div key={p.name} style={{ marginBottom: 6 }}>
                <div style={label}>{p.label}: {(params[p.name] ?? p.default).toFixed(p.step < 0.1 ? 2 : 1)}</div>
                <input type="range" min={p.min} max={p.max} step={p.step}
                  value={params[p.name] ?? p.default}
                  onChange={e => setParams({...params, [p.name]: parseFloat(e.target.value)})}
                  style={slider(color)} />
              </div>
            ))}
            <button style={btn(color)} onClick={() => {
              // Apply as a new primitive with modified dimensions for now
              const h = params.height || params.depth || 1;
              onAddObject(createBox(size, h, size));
            }}>Apply</button>
          </div>
        </Html>
      </group>
    );
  }

  // ═══ UTILITY ACTIONS ═══
  return (
    <group position={[0.55, 1.1, 0.25]}>
      <Html transform distanceFactor={0.7} style={{ pointerEvents: "auto" }}>
        <div style={panel(color)}>
          <div style={title(color)}>{activeTool.replace(/_/g, " ")}</div>
          <div style={{ fontSize: 10, color: "#556", marginBottom: 8 }}>
            {objectCount} objects on workbench
          </div>
          <button style={btn(color)} onClick={onUndo}>Undo</button>
          <button style={btn(color)} onClick={onRedo}>Redo</button>
          <button style={{...btn(color), color: "#ff6666", borderColor: "#ff444450"}} onClick={onClearAll}>
            Clear All
          </button>
        </div>
      </Html>
    </group>
  );
}

// ─── Styles ───
const panel = (c: string): React.CSSProperties => ({
  width: 170, background: "rgba(3,3,12,0.94)", border: `1px solid ${c}40`,
  borderRadius: 14, padding: 12, fontFamily: "'SF Mono', monospace",
  fontSize: 11, color: "#cce8ff", boxShadow: `0 0 20px ${c}15`,
});
const title = (c: string): React.CSSProperties => ({
  fontSize: 11, fontWeight: 700, color: c, textTransform: "uppercase",
  letterSpacing: "0.1em", marginBottom: 10, textAlign: "center",
});
const label: React.CSSProperties = { fontSize: 10, color: "#88aacc", marginBottom: 2 };
const slider = (c: string): React.CSSProperties => ({
  width: "100%", accentColor: c, height: 20, marginBottom: 6, touchAction: "manipulation",
});
const btn = (c: string): React.CSSProperties => ({
  width: "100%", padding: "10px 0", marginBottom: 4, background: `${c}20`, color: c,
  border: `1px solid ${c}50`, borderRadius: 8, cursor: "pointer",
  fontFamily: "inherit", fontSize: 12, fontWeight: 600, touchAction: "manipulation",
});
const planeBtn: React.CSSProperties = {
  flex: 1, padding: "6px 0", fontSize: 9, background: "transparent", color: "#556",
  border: "1px solid #333", borderRadius: 4, cursor: "pointer",
  fontFamily: "inherit", touchAction: "manipulation",
};
const planeBtnAct = (c: string): React.CSSProperties => ({
  background: `${c}15`, color: c, borderColor: `${c}50`,
});
