"use client";

import { useState, useEffect } from "react";

/** A single parameter field definition */
export interface ParamField {
  key: string;
  label: string;
  type: "number" | "select" | "checkbox";
  default: number | string | boolean;
  min?: number;
  max?: number;
  step?: number;
  options?: { value: string; label: string }[];
  unit?: string;
}

/** Configuration for a tool's parameter dialog */
export interface ToolParamConfig {
  title: string;
  icon: string;
  fields: ParamField[];
}

interface ParameterDialogProps {
  config: ToolParamConfig;
  onApply: (values: Record<string, number | string | boolean>) => void;
  onCancel: () => void;
}

/** Floating parameter dialog that appears when a Part Design tool is activated */
export function ParameterDialog({ config, onApply, onCancel }: ParameterDialogProps) {
  const [values, setValues] = useState<Record<string, number | string | boolean>>({});

  // Initialize defaults
  useEffect(() => {
    const defaults: Record<string, number | string | boolean> = {};
    for (const f of config.fields) {
      defaults[f.key] = f.default;
    }
    setValues(defaults);
  }, [config]);

  const update = (key: string, val: number | string | boolean) => {
    setValues((prev) => ({ ...prev, [key]: val }));
  };

  return (
    <div style={styles.overlay} onClick={onCancel}>
      <div style={styles.dialog} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <span style={styles.headerIcon}>{config.icon}</span>
          <span style={styles.headerTitle}>{config.title}</span>
        </div>

        {/* Fields */}
        <div style={styles.body}>
          {config.fields.map((field) => (
            <div key={field.key} style={styles.fieldRow}>
              <label style={styles.label}>{field.label}</label>

              {field.type === "number" && (
                <div style={styles.numberInput}>
                  <input
                    type="range"
                    min={field.min ?? 0}
                    max={field.max ?? 100}
                    step={field.step ?? 0.1}
                    value={Number(values[field.key] ?? field.default)}
                    onChange={(e) => update(field.key, Number(e.target.value))}
                    style={styles.slider}
                    data-testid={`param-slider-${field.key}`}
                  />
                  <input
                    type="number"
                    min={field.min}
                    max={field.max}
                    step={field.step ?? 0.1}
                    value={Number(values[field.key] ?? field.default)}
                    onChange={(e) => update(field.key, Number(e.target.value))}
                    style={styles.numBox}
                    data-testid={`param-input-${field.key}`}
                  />
                  {field.unit && <span style={styles.unit}>{field.unit}</span>}
                </div>
              )}

              {field.type === "select" && (
                <select
                  value={String(values[field.key] ?? field.default)}
                  onChange={(e) => update(field.key, e.target.value)}
                  style={styles.select}
                  data-testid={`param-select-${field.key}`}
                >
                  {field.options?.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              )}

              {field.type === "checkbox" && (
                <input
                  type="checkbox"
                  checked={Boolean(values[field.key] ?? field.default)}
                  onChange={(e) => update(field.key, e.target.checked)}
                  style={styles.checkbox}
                  data-testid={`param-check-${field.key}`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Actions */}
        <div style={styles.actions}>
          <button style={styles.cancelBtn} onClick={onCancel} data-testid="param-cancel">Cancel</button>
          <button style={styles.applyBtn} onClick={() => onApply(values)} data-testid="param-apply">
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// Tool Parameter Configs — one per tool
// ═══════════════════════════════════════════

export const TOOL_PARAMS: Record<string, ToolParamConfig> = {
  extrude: {
    title: "Extrude",
    icon: "⬡",
    fields: [
      { key: "creationType", label: "Type", type: "select", default: "solid", options: [
        { value: "solid", label: "Solid" },
        { value: "surface", label: "Surface" },
        { value: "thin", label: "Thin" },
      ]},
      { key: "booleanMode", label: "Result", type: "select", default: "add", options: [
        { value: "new", label: "New" },
        { value: "add", label: "Add" },
        { value: "remove", label: "Remove" },
        { value: "intersect", label: "Intersect" },
      ]},
      { key: "endType", label: "End Type", type: "select", default: "blind", options: [
        { value: "blind", label: "Blind (Depth)" },
        { value: "through_all", label: "Through All" },
        { value: "up_to_next", label: "Up to Next" },
        { value: "symmetric", label: "Symmetric" },
      ]},
      { key: "distance", label: "Depth", type: "number", default: 2, min: 0.1, max: 50, step: 0.1, unit: "mm" },
      { key: "direction", label: "Direction", type: "select", default: "up", options: [
        { value: "up", label: "Up" }, { value: "down", label: "Down" }, { value: "both", label: "Both (Second End)" },
      ]},
      { key: "draftAngle", label: "Draft Angle", type: "number", default: 0, min: 0, max: 30, step: 0.5, unit: "°" },
      { key: "thinThickness", label: "Thin Wall Thickness", type: "number", default: 0.5, min: 0.05, max: 5, step: 0.05, unit: "mm" },
    ],
  },
  fillet: {
    title: "Fillet",
    icon: "◠",
    fields: [
      { key: "filletType", label: "Type", type: "select", default: "edge", options: [
        { value: "edge", label: "Edge Fillet" },
        { value: "full_round", label: "Full Round" },
        { value: "variable", label: "Variable Radius" },
      ]},
      { key: "radius", label: "Radius", type: "number", default: 0.3, min: 0.01, max: 10, step: 0.05, unit: "mm" },
      { key: "crossSection", label: "Cross Section", type: "select", default: "distance", options: [
        { value: "distance", label: "Circular" },
        { value: "conic", label: "Conic" },
        { value: "curvature", label: "Match Curvature" },
      ]},
      { key: "rho", label: "Conic Rho", type: "number", default: 0.5, min: 0.05, max: 0.99, step: 0.05 },
      { key: "asymmetric", label: "Asymmetric", type: "checkbox", default: false },
      { key: "radius2", label: "Second Radius", type: "number", default: 0.3, min: 0.01, max: 10, step: 0.05, unit: "mm" },
    ],
  },
  chamfer: {
    title: "Chamfer",
    icon: "⌐",
    fields: [
      { key: "chamferType", label: "Type", type: "select", default: "equal", options: [
        { value: "equal", label: "Equal Distance" },
        { value: "two_dist", label: "Two Distances" },
        { value: "dist_angle", label: "Distance + Angle" },
      ]},
      { key: "distance", label: "Distance 1", type: "number", default: 0.2, min: 0.01, max: 10, step: 0.05, unit: "mm" },
      { key: "distance2", label: "Distance 2", type: "number", default: 0.2, min: 0.01, max: 10, step: 0.05, unit: "mm" },
      { key: "angle", label: "Angle", type: "number", default: 45, min: 1, max: 89, step: 1, unit: "°" },
      { key: "measurement", label: "Measurement", type: "select", default: "offset", options: [
        { value: "offset", label: "Offset (edge-dependent)" },
        { value: "tangent", label: "Tangent (edge-independent)" },
      ]},
    ],
  },
  shell: {
    title: "Shell",
    icon: "◻",
    fields: [
      { key: "thickness", label: "Wall Thickness", type: "number", default: 0.2, min: 0.01, max: 5, step: 0.05, unit: "mm" },
      { key: "hollow", label: "Hollow (no face removal)", type: "checkbox", default: false },
      { key: "shellDirection", label: "Direction", type: "select", default: "inside", options: [
        { value: "inside", label: "Shell Inside" },
        { value: "outside", label: "Shell Outside" },
      ]},
    ],
  },
  draft: {
    title: "Draft",
    icon: "◣",
    fields: [
      { key: "draftType", label: "Draft Type", type: "select", default: "neutral_plane", options: [
        { value: "neutral_plane", label: "Neutral Plane" },
        { value: "parting_line", label: "Parting Line" },
      ]},
      { key: "angle", label: "Draft Angle", type: "number", default: 5, min: 0.5, max: 45, step: 0.5, unit: "°" },
      { key: "pullDir", label: "Pull Direction", type: "select", default: "y", options: [
        { value: "x", label: "X Axis" }, { value: "y", label: "Y Axis" }, { value: "z", label: "Z Axis" },
      ]},
      { key: "tangentPropagation", label: "Tangent Propagation", type: "checkbox", default: true },
      { key: "reapplyFillets", label: "Reapply Fillets", type: "checkbox", default: false },
    ],
  },
  hole: {
    title: "Hole",
    icon: "⊙",
    fields: [
      { key: "holeType", label: "Hole Type", type: "select", default: "simple", options: [
        { value: "simple", label: "Simple" },
        { value: "counterbore", label: "Counterbore" },
        { value: "countersink", label: "Countersink" },
        { value: "tapped", label: "Tapped" },
      ]},
      { key: "holeSubtype", label: "Subtype", type: "select", default: "drilled", options: [
        { value: "drilled", label: "Drilled" },
        { value: "clearance", label: "Clearance" },
      ]},
      { key: "diameter", label: "Diameter", type: "number", default: 5, min: 0.5, max: 100, step: 0.5, unit: "mm" },
      { key: "depth", label: "Depth", type: "number", default: 10, min: 0.5, max: 200, step: 0.5, unit: "mm" },
      { key: "endType", label: "Termination", type: "select", default: "blind", options: [
        { value: "blind", label: "Blind" },
        { value: "through_all", label: "Through All" },
        { value: "up_to_next", label: "Up to Next" },
      ]},
      { key: "tipAngle", label: "Tip Angle", type: "select", default: "118", options: [
        { value: "118", label: "118°" }, { value: "135", label: "135°" },
        { value: "flat", label: "Flat" }, { value: "custom", label: "Custom" },
      ]},
      { key: "cboreDiameter", label: "Counterbore ⌀", type: "number", default: 8, min: 1, max: 50, step: 0.5, unit: "mm" },
      { key: "cboreDepth", label: "Counterbore Depth", type: "number", default: 3, min: 0.5, max: 20, step: 0.5, unit: "mm" },
      { key: "csinkAngle", label: "Countersink Angle", type: "number", default: 82, min: 60, max: 120, step: 1, unit: "°" },
    ],
  },
  rib: {
    title: "Rib",
    icon: "▯",
    fields: [
      { key: "thickness", label: "Thickness", type: "number", default: 0.2, min: 0.05, max: 5, step: 0.05, unit: "mm" },
      { key: "direction", label: "Direction", type: "select", default: "parallel", options: [
        { value: "parallel", label: "Parallel" }, { value: "perpendicular", label: "Perpendicular" },
      ]},
    ],
  },
  split: {
    title: "Split",
    icon: "⫽",
    fields: [
      { key: "offset", label: "Plane Offset", type: "number", default: 0, min: -20, max: 20, step: 0.1, unit: "mm" },
      { key: "keepSide", label: "Keep Side", type: "select", default: "above", options: [
        { value: "above", label: "Above" }, { value: "below", label: "Below" }, { value: "both", label: "Both" },
      ]},
      { key: "planeAxis", label: "Cut Plane", type: "select", default: "y", options: [
        { value: "x", label: "YZ Plane" }, { value: "y", label: "XZ Plane" }, { value: "z", label: "XY Plane" },
      ]},
    ],
  },
  thicken: {
    title: "Thicken",
    icon: "▤",
    fields: [
      { key: "thickness", label: "Thickness", type: "number", default: 0.3, min: 0.01, max: 10, step: 0.05, unit: "mm" },
      { key: "direction", label: "Direction", type: "select", default: "outward", options: [
        { value: "outward", label: "Outward" }, { value: "inward", label: "Inward" }, { value: "both", label: "Both" },
      ]},
    ],
  },
  helix: {
    title: "Helix",
    icon: "⌀",
    fields: [
      { key: "radius", label: "Radius", type: "number", default: 1, min: 0.1, max: 20, step: 0.1, unit: "mm" },
      { key: "pitch", label: "Pitch", type: "number", default: 0.5, min: 0.1, max: 10, step: 0.1, unit: "mm" },
      { key: "height", label: "Height", type: "number", default: 3, min: 0.5, max: 50, step: 0.5, unit: "mm" },
      { key: "taperAngle", label: "Taper Angle", type: "number", default: 0, min: 0, max: 30, step: 1, unit: "°" },
      { key: "clockwise", label: "Clockwise", type: "checkbox", default: false },
    ],
  },
  revolve_tool: {
    title: "Revolve",
    icon: "◗",
    fields: [
      { key: "angle", label: "Revolve Angle", type: "number", default: 360, min: 1, max: 360, step: 5, unit: "°" },
      { key: "axis", label: "Revolve Axis", type: "select", default: "y", options: [
        { value: "x", label: "X Axis" }, { value: "y", label: "Y Axis" }, { value: "z", label: "Z Axis" },
      ]},
      { key: "revolveType", label: "Type", type: "select", default: "full", options: [
        { value: "full", label: "Full (360°)" }, { value: "one_direction", label: "One Direction" },
      ]},
    ],
  },
  sweep: {
    title: "Sweep",
    icon: "↝",
    fields: [
      { key: "twist", label: "Twist Angle", type: "number", default: 0, min: 0, max: 360, step: 5, unit: "°" },
    ],
  },
  loft: {
    title: "Loft",
    icon: "⋈",
    fields: [
      { key: "height", label: "Height", type: "number", default: 3, min: 0.5, max: 20, step: 0.5, unit: "mm" },
    ],
  },
  linear_pattern: {
    title: "Linear Pattern",
    icon: "⫿",
    fields: [
      { key: "patternType", label: "Pattern", type: "select", default: "part", options: [
        { value: "part", label: "Part" }, { value: "feature", label: "Feature" }, { value: "face", label: "Face" },
      ]},
      { key: "count", label: "Instance Count", type: "number", default: 3, min: 1, max: 100, step: 1 },
      { key: "spacing", label: "Distance", type: "number", default: 2, min: 0.1, max: 100, step: 0.1, unit: "mm" },
      { key: "dirAxis", label: "Direction 1", type: "select", default: "x", options: [
        { value: "x", label: "X Axis" }, { value: "y", label: "Y Axis" }, { value: "z", label: "Z Axis" },
      ]},
      { key: "centered", label: "Centered", type: "checkbox", default: false },
      { key: "secondDir", label: "Second Direction", type: "checkbox", default: false },
      { key: "count2", label: "Count (Dir 2)", type: "number", default: 2, min: 1, max: 50, step: 1 },
      { key: "spacing2", label: "Distance (Dir 2)", type: "number", default: 2, min: 0.1, max: 100, step: 0.1, unit: "mm" },
      { key: "dir2Axis", label: "Direction 2", type: "select", default: "z", options: [
        { value: "x", label: "X Axis" }, { value: "y", label: "Y Axis" }, { value: "z", label: "Z Axis" },
      ]},
      { key: "boolMode", label: "Boolean", type: "select", default: "new", options: [
        { value: "new", label: "New" }, { value: "add", label: "Add" }, { value: "remove", label: "Remove" },
      ]},
    ],
  },
  circular_pattern: {
    title: "Circular Pattern",
    icon: "◎",
    fields: [
      { key: "patternType", label: "Pattern", type: "select", default: "part", options: [
        { value: "part", label: "Part" }, { value: "feature", label: "Feature" }, { value: "face", label: "Face" },
      ]},
      { key: "count", label: "Instance Count", type: "number", default: 4, min: 1, max: 100, step: 1 },
      { key: "angle", label: "Angle", type: "number", default: 360, min: 1, max: 360, step: 5, unit: "°" },
      { key: "equalSpacing", label: "Equal Spacing", type: "checkbox", default: true },
      { key: "centered", label: "Centered", type: "checkbox", default: false },
      { key: "axisSelect", label: "Axis", type: "select", default: "y", options: [
        { value: "x", label: "X Axis" }, { value: "y", label: "Y Axis" }, { value: "z", label: "Z Axis" },
      ]},
      { key: "boolMode", label: "Boolean", type: "select", default: "new", options: [
        { value: "new", label: "New" }, { value: "add", label: "Add" }, { value: "remove", label: "Remove" },
      ]},
    ],
  },
  curve_pattern: {
    title: "Curve Pattern",
    icon: "⌇",
    fields: [
      { key: "count", label: "Count", type: "number", default: 3, min: 2, max: 50, step: 1 },
      { key: "keepOrientation", label: "Keep Orientation", type: "checkbox", default: true },
    ],
  },
  slot: {
    title: "Slot",
    icon: "⊞",
    fields: [
      { key: "width", label: "Width", type: "number", default: 0.3, min: 0.05, max: 5, step: 0.05, unit: "mm" },
    ],
  },
  polygon: {
    title: "Polygon",
    icon: "⬡",
    fields: [
      { key: "sides", label: "Sides", type: "number", default: 6, min: 3, max: 24, step: 1 },
      { key: "rotation", label: "Rotation", type: "number", default: 0, min: 0, max: 360, step: 5, unit: "°" },
    ],
  },
  custom_plane: {
    title: "Create Plane",
    icon: "◫",
    fields: [
      { key: "normal", label: "Normal Axis", type: "select", default: "y", options: [
        { value: "x", label: "YZ Plane (X normal)" },
        { value: "y", label: "XZ Plane (Y normal)" },
        { value: "z", label: "XY Plane (Z normal)" },
      ]},
      { key: "offset", label: "Offset Distance", type: "number", default: 2, min: -50, max: 50, step: 0.5, unit: "mm" },
      { key: "angle", label: "Rotation Angle", type: "number", default: 0, min: -90, max: 90, step: 5, unit: "°" },
    ],
  },
  mate_connector: {
    title: "Mate Connector",
    icon: "⊕",
    fields: [
      { key: "flipPrimary", label: "Flip Primary Axis", type: "checkbox", default: false },
      { key: "rotateAngle", label: "Rotation", type: "number", default: 0, min: 0, max: 360, step: 15, unit: "°" },
    ],
  },
  construction_axis: {
    title: "Construction Axis",
    icon: "│",
    fields: [
      { key: "axis", label: "Axis Direction", type: "select", default: "y", options: [
        { value: "x", label: "X Axis" }, { value: "y", label: "Y Axis" }, { value: "z", label: "Z Axis" },
      ]},
      { key: "length", label: "Length", type: "number", default: 5, min: 1, max: 50, step: 1, unit: "mm" },
    ],
  },
  construction_point: {
    title: "Construction Point",
    icon: "◎",
    fields: [
      { key: "x", label: "X", type: "number", default: 0, min: -50, max: 50, step: 0.5, unit: "mm" },
      { key: "y", label: "Y", type: "number", default: 0, min: -50, max: 50, step: 0.5, unit: "mm" },
      { key: "z", label: "Z", type: "number", default: 0, min: -50, max: 50, step: 0.5, unit: "mm" },
    ],
  },
  frame_tool: {
    title: "Frame",
    icon: "⊞",
    fields: [
      { key: "profileWidth", label: "Profile Width", type: "number", default: 0.5, min: 0.1, max: 5, step: 0.1, unit: "mm" },
      { key: "profileHeight", label: "Profile Height", type: "number", default: 0.5, min: 0.1, max: 5, step: 0.1, unit: "mm" },
      { key: "jointType", label: "Joint Type", type: "select", default: "miter", options: [
        { value: "miter", label: "Miter" }, { value: "butt", label: "Butt" }, { value: "notch", label: "Notch" },
      ]},
    ],
  },
  emboss: {
    title: "Emboss Text",
    icon: "𝐓",
    fields: [
      { key: "text", label: "Text", type: "select", default: "CAD", options: [
        { value: "CAD", label: "CAD" }, { value: "LOGO", label: "LOGO" },
        { value: "PART1", label: "PART 1" }, { value: "GestureCAD", label: "GestureCAD" },
      ]},
      { key: "fontSize", label: "Font Size", type: "number", default: 0.5, min: 0.1, max: 5, step: 0.1, unit: "mm" },
      { key: "depth", label: "Depth", type: "number", default: 0.1, min: 0.01, max: 2, step: 0.01, unit: "mm" },
      { key: "mode", label: "Mode", type: "select", default: "add", options: [
        { value: "add", label: "Raised (Add)" }, { value: "remove", label: "Engraved (Remove)" },
      ]},
    ],
  },
  external_thread: {
    title: "External Thread",
    icon: "⌬",
    fields: [
      { key: "pitch", label: "Pitch", type: "number", default: 1.25, min: 0.25, max: 6, step: 0.25, unit: "mm" },
      { key: "length", label: "Length", type: "number", default: 10, min: 1, max: 100, step: 1, unit: "mm" },
      { key: "standard", label: "Standard", type: "select", default: "metric", options: [
        { value: "metric", label: "Metric (ISO)" }, { value: "unc", label: "UNC" }, { value: "unf", label: "UNF" },
      ]},
    ],
  },
  modify_fillet: {
    title: "Modify Fillet",
    icon: "◠̃",
    fields: [
      { key: "action", label: "Action", type: "select", default: "change", options: [
        { value: "change", label: "Change Radius" }, { value: "remove", label: "Remove Fillet" },
      ]},
      { key: "newRadius", label: "New Radius", type: "number", default: 0.5, min: 0.01, max: 10, step: 0.05, unit: "mm" },
    ],
  },
  move_face: {
    title: "Move Face",
    icon: "⇱",
    fields: [
      { key: "distance", label: "Offset Distance", type: "number", default: 0.5, min: -10, max: 10, step: 0.1, unit: "mm" },
      { key: "direction", label: "Direction", type: "select", default: "normal", options: [
        { value: "normal", label: "Along Normal" }, { value: "x", label: "X Axis" }, { value: "y", label: "Y Axis" }, { value: "z", label: "Z Axis" },
      ]},
    ],
  },
  delete_face: {
    title: "Delete Face",
    icon: "⊘",
    fields: [
      { key: "heal", label: "Heal Adjacent Faces", type: "checkbox", default: true },
    ],
  },
  replace_face: {
    title: "Replace Face",
    icon: "⇄",
    fields: [
      { key: "offset", label: "Offset", type: "number", default: 0, min: -5, max: 5, step: 0.1, unit: "mm" },
    ],
  },
  offset_face: {
    title: "Offset Face",
    icon: "⇕",
    fields: [
      { key: "distance", label: "Offset Distance", type: "number", default: 0.5, min: -10, max: 10, step: 0.1, unit: "mm" },
    ],
  },
  delete_part: {
    title: "Delete Part",
    icon: "✕",
    fields: [],
  },
  transform_part: {
    title: "Move/Copy Part",
    icon: "⤡",
    fields: [
      { key: "tx", label: "Translate X", type: "number", default: 0, min: -50, max: 50, step: 0.5, unit: "mm" },
      { key: "ty", label: "Translate Y", type: "number", default: 0, min: -50, max: 50, step: 0.5, unit: "mm" },
      { key: "tz", label: "Translate Z", type: "number", default: 0, min: -50, max: 50, step: 0.5, unit: "mm" },
      { key: "copy", label: "Keep Original", type: "checkbox", default: false },
    ],
  },
};

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 100,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(0,0,0,0.4)",
    backdropFilter: "blur(2px)",
  },
  dialog: {
    width: 320,
    background: "#1a1a1a",
    border: "1px solid #333",
    borderRadius: 12,
    boxShadow: "0 16px 48px rgba(0,0,0,0.6)",
    overflow: "hidden",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "14px 18px",
    borderBottom: "1px solid #2a2a2a",
    background: "#141414",
  },
  headerIcon: { fontSize: 20 },
  headerTitle: { fontSize: 15, fontWeight: 700, color: "#e5e5e5" },
  body: {
    padding: "12px 18px",
    display: "flex",
    flexDirection: "column" as const,
    gap: 10,
  },
  fieldRow: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 4,
  },
  label: {
    fontSize: 11,
    color: "#888",
    fontWeight: 600,
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em",
  },
  numberInput: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  slider: {
    flex: 1,
    accentColor: "#3b82f6",
    cursor: "pointer",
  },
  numBox: {
    width: 64,
    padding: "4px 6px",
    background: "#222",
    border: "1px solid #333",
    borderRadius: 4,
    color: "#3b82f6",
    fontFamily: "monospace",
    fontSize: 12,
    textAlign: "right" as const,
  },
  unit: {
    fontSize: 11,
    color: "#666",
    width: 24,
  },
  select: {
    padding: "6px 8px",
    background: "#222",
    border: "1px solid #333",
    borderRadius: 4,
    color: "#ccc",
    fontFamily: "inherit",
    fontSize: 12,
    cursor: "pointer",
  },
  checkbox: {
    width: 18,
    height: 18,
    accentColor: "#3b82f6",
    cursor: "pointer",
  },
  actions: {
    display: "flex",
    gap: 8,
    padding: "12px 18px",
    borderTop: "1px solid #2a2a2a",
    justifyContent: "flex-end",
  },
  cancelBtn: {
    padding: "8px 20px",
    background: "#222",
    border: "1px solid #333",
    borderRadius: 6,
    color: "#999",
    cursor: "pointer",
    fontFamily: "inherit",
    fontSize: 13,
  },
  applyBtn: {
    padding: "8px 24px",
    background: "#3b82f6",
    border: "none",
    borderRadius: 6,
    color: "#fff",
    cursor: "pointer",
    fontFamily: "inherit",
    fontSize: 13,
    fontWeight: 700,
  },
};
