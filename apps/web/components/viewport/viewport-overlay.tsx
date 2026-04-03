"use client";

import { useState, useEffect } from "react";
import { useCADState } from "@/lib/store";

/**
 * Viewport Overlay — Onshape-style floating controls on the 3D canvas.
 * Includes: measure tool, analysis tools, mass properties, view cube, camera options.
 */

export function ViewportOverlay() {
  const { entities, features } = useCADState();
  const [showMeasure, setShowMeasure] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [showMassProps, setShowMassProps] = useState(false);
  const [showViewOptions, setShowViewOptions] = useState(false);
  const [dimension, setDimension] = useState<{ type: string; value: number; angle: number } | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const d = (e as CustomEvent).detail;
      setDimension(d);
      // Auto-clear after 5 seconds
      setTimeout(() => setDimension(null), 5000);
    };
    window.addEventListener("gesture-cad-dimension", handler);
    return () => window.removeEventListener("gesture-cad-dimension", handler);
  }, []);

  // Calculate basic mass properties from features
  const massProps = calculateMassProperties(features);

  return (
    <>
      {/* Bottom-right: Measure + Analysis + Mass Properties buttons */}
      <div style={styles.bottomRight}>
        <button
          style={{ ...styles.overlayBtn, ...(showMeasure ? styles.overlayBtnActive : {}) }}
          onClick={() => { setShowMeasure(!showMeasure); setShowAnalysis(false); setShowMassProps(false); }}
          title="Measure tool (M)"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path d="M3 17L17 3M3 17l3-1-2-2-1 3zm14-14l-3 1 2 2 1-3zM7 13l1.5-1.5M10 10l1.5-1.5M13 7l1.5-1.5"/>
          </svg>
        </button>
        <button
          style={{ ...styles.overlayBtn, ...(showAnalysis ? styles.overlayBtnActive : {}) }}
          onClick={() => { setShowAnalysis(!showAnalysis); setShowMeasure(false); setShowMassProps(false); }}
          title="Analysis tools"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path d="M2 18h16M4 14l3-4 3 2 3-5 3 3"/>
          </svg>
        </button>
        <button
          style={{ ...styles.overlayBtn, ...(showMassProps ? styles.overlayBtnActive : {}) }}
          onClick={() => { setShowMassProps(!showMassProps); setShowAnalysis(false); setShowMeasure(false); }}
          title="Mass properties"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <circle cx="10" cy="10" r="6" fill="none" stroke="currentColor" strokeWidth="1.5"/>
            <circle cx="10" cy="10" r="1.5"/>
            <line x1="10" y1="4" x2="10" y2="7" stroke="currentColor" strokeWidth="1"/>
            <line x1="10" y1="13" x2="10" y2="16" stroke="currentColor" strokeWidth="1"/>
            <line x1="4" y1="10" x2="7" y2="10" stroke="currentColor" strokeWidth="1"/>
            <line x1="13" y1="10" x2="16" y2="10" stroke="currentColor" strokeWidth="1"/>
          </svg>
        </button>
      </div>

      {/* Top-right: Dynamic camera controller + render options */}
      <div style={styles.topRight}>
        <CameraController />
        <button
          style={styles.viewOptionsBtn}
          onClick={() => setShowViewOptions(!showViewOptions)}
          title="Camera and render options"
          data-testid="view-options-btn"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 1l2 3h-4l2-3zM8 15l-2-3h4l-2 3zM1 8l3-2v4l-3-2zM15 8l-3 2V6l3 2z"/>
          </svg>
          <span style={styles.caret}>▾</span>
        </button>
        {showViewOptions && <ViewOptionsDropdown onClose={() => setShowViewOptions(false)} />}
      </div>

      {/* Measure panel */}
      {showMeasure && <MeasurePanel />}

      {/* Analysis panel */}
      {showAnalysis && <AnalysisPanel />}

      {/* Mass properties panel */}
      {showMassProps && <MassPropertiesPanel props={massProps} />}

      {/* Element banner - shows selection info */}
      <div style={styles.banner}>
        {entities.length > 0 && (
          <span style={styles.bannerText}>
            {entities.length} entities | {features.length} features
          </span>
        )}
      </div>

      {/* Dimension measurement display */}
      {dimension && (
        <div style={{
          position: "absolute",
          top: 50,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 20,
          background: "#1e3a5fee",
          border: "1px solid #3b82f6",
          borderRadius: 8,
          padding: "8px 16px",
          backdropFilter: "blur(4px)",
          display: "flex",
          gap: 16,
          alignItems: "center",
        }}>
          <span style={{ color: "#93c5fd", fontSize: 12, fontWeight: 600 }}>↔ {dimension.value.toFixed(3)} mm</span>
          <span style={{ color: "#888", fontSize: 11 }}>∠ {dimension.angle.toFixed(1)}°</span>
        </div>
      )}
    </>
  );
}

// ─── Camera control via custom events (R3F Canvas listens) ───

function emitCameraOrbit(azimuthDeg: number, elevationDeg: number, distance: number) {
  window.dispatchEvent(new CustomEvent("gesture-cad-camera-orbit", {
    detail: { azimuthDeg, elevationDeg, distance },
  }));
}

function emitViewPreset(position: [number, number, number]) {
  window.dispatchEvent(new CustomEvent("gesture-cad-view-preset", { detail: { position } }));
}

function emitRenderMode(mode: string) {
  window.dispatchEvent(new CustomEvent("gesture-cad-render-mode", { detail: { mode } }));
}

function emitProjection(projection: "perspective" | "orthographic") {
  window.dispatchEvent(new CustomEvent("gesture-cad-projection", { detail: { projection } }));
}

/** Standard view presets with azimuth/elevation angles */
const VIEW_PRESETS: { label: string; azimuth: number; elevation: number; key: string }[] = [
  { label: "TOP",    azimuth: 0,   elevation: 90,  key: "top" },
  { label: "BOTTOM", azimuth: 0,   elevation: -90, key: "bottom" },
  { label: "FRONT",  azimuth: 0,   elevation: 0,   key: "front" },
  { label: "BACK",   azimuth: 180, elevation: 0,   key: "back" },
  { label: "RIGHT",  azimuth: 90,  elevation: 0,   key: "right" },
  { label: "LEFT",   azimuth: -90, elevation: 0,   key: "left" },
  { label: "ISO",    azimuth: 45,  elevation: 35,  key: "iso" },
];

// ─── DYNAMIC CAMERA CONTROLLER ───
function CameraController() {
  const [azimuth, setAzimuth] = useState(45);
  const [elevation, setElevation] = useState(35);
  const [distance, setDistance] = useState(14);
  const [showSliders, setShowSliders] = useState(false);

  const applyOrbit = (az: number, el: number, dist: number) => {
    setAzimuth(az);
    setElevation(el);
    setDistance(dist);
    emitCameraOrbit(az, el, dist);
  };

  return (
    <div style={styles.cameraController} data-testid="camera-controller">
      {/* Preset buttons grid */}
      <div style={styles.presetGrid}>
        {VIEW_PRESETS.map((v) => (
          <button
            key={v.key}
            data-testid={`viewcube-${v.key}`}
            style={{
              ...styles.presetBtn,
              ...(azimuth === v.azimuth && elevation === v.elevation ? styles.presetBtnActive : {}),
            }}
            onClick={() => applyOrbit(v.azimuth, v.elevation, distance)}
            title={`${v.label} (${v.azimuth}° az, ${v.elevation}° el)`}
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* Toggle for dynamic sliders */}
      <button
        style={styles.toggleSlidersBtn}
        onClick={() => setShowSliders(!showSliders)}
        data-testid="toggle-camera-sliders"
      >
        {showSliders ? "▴ Hide Controls" : "▾ Camera Controls"}
      </button>

      {showSliders && (
        <div style={styles.sliderGroup}>
          {/* Azimuth: horizontal rotation 0-360° */}
          <div style={styles.sliderRow}>
            <label style={styles.sliderLabel}>Azimuth</label>
            <input
              type="range"
              min={-180}
              max={180}
              step={1}
              value={azimuth}
              onChange={(e) => applyOrbit(Number(e.target.value), elevation, distance)}
              style={styles.slider}
              data-testid="slider-azimuth"
            />
            <span style={styles.sliderValue}>{azimuth}°</span>
          </div>

          {/* Elevation: vertical rotation -90 to 90° */}
          <div style={styles.sliderRow}>
            <label style={styles.sliderLabel}>Elevation</label>
            <input
              type="range"
              min={-89}
              max={89}
              step={1}
              value={elevation}
              onChange={(e) => applyOrbit(azimuth, Number(e.target.value), distance)}
              style={styles.slider}
              data-testid="slider-elevation"
            />
            <span style={styles.sliderValue}>{elevation}°</span>
          </div>

          {/* Distance: zoom level */}
          <div style={styles.sliderRow}>
            <label style={styles.sliderLabel}>Distance</label>
            <input
              type="range"
              min={2}
              max={50}
              step={0.5}
              value={distance}
              onChange={(e) => applyOrbit(azimuth, elevation, Number(e.target.value))}
              style={styles.slider}
              data-testid="slider-distance"
            />
            <span style={styles.sliderValue}>{distance.toFixed(1)}</span>
          </div>

          {/* Quick angle buttons */}
          <div style={styles.quickAngles}>
            {[0, 30, 45, 60, 90, 120, 135, 180].map((deg) => (
              <button
                key={deg}
                style={styles.quickAngleBtn}
                onClick={() => applyOrbit(deg, elevation, distance)}
                title={`Rotate to ${deg}°`}
              >
                {deg}°
              </button>
            ))}
          </div>

          {/* Rotate by increment buttons */}
          <div style={styles.rotateRow}>
            <button style={styles.rotateBtn} onClick={() => applyOrbit(azimuth - 15, elevation, distance)} title="Rotate -15°">↺ 15°</button>
            <button style={styles.rotateBtn} onClick={() => applyOrbit(azimuth - 5, elevation, distance)} title="Rotate -5°">↺ 5°</button>
            <button style={styles.rotateBtn} onClick={() => applyOrbit(azimuth + 5, elevation, distance)} title="Rotate +5°">5° ↻</button>
            <button style={styles.rotateBtn} onClick={() => applyOrbit(azimuth + 15, elevation, distance)} title="Rotate +15°">15° ↻</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── VIEW OPTIONS DROPDOWN ───
function ViewOptionsDropdown({ onClose }: { onClose: () => void }) {
  const renderModes = ["Shaded", "Wireframe", "Shaded + Edges", "Hidden Edges"];
  const [mode, setMode] = useState("Shaded");
  const [projection, setProjection] = useState<"perspective" | "orthographic">("perspective");

  return (
    <div style={styles.dropdown} onClick={(e) => e.stopPropagation()}>
      <div style={styles.dropdownHeader}>RENDER MODE</div>
      {renderModes.map((m) => (
        <button
          key={m}
          data-testid={`render-mode-${m.toLowerCase().replace(/\s\+\s/g, "-").replace(/\s/g, "-")}`}
          style={{ ...styles.dropdownItem, ...(mode === m ? styles.dropdownItemActive : {}) }}
          onClick={() => { setMode(m); emitRenderMode(m); }}
        >
          {m}
        </button>
      ))}
      <div style={styles.dropdownDivider} />
      <div style={styles.dropdownHeader}>PROJECTION</div>
      <button
        data-testid="projection-perspective"
        style={{ ...styles.dropdownItem, ...(projection === "perspective" ? styles.dropdownItemActive : {}) }}
        onClick={() => { setProjection("perspective"); emitProjection("perspective"); }}
      >
        Perspective
      </button>
      <button
        data-testid="projection-orthographic"
        style={{ ...styles.dropdownItem, ...(projection === "orthographic" ? styles.dropdownItemActive : {}) }}
        onClick={() => { setProjection("orthographic"); emitProjection("orthographic"); }}
      >
        Orthographic
      </button>
    </div>
  );
}

// ─── MEASURE PANEL ───
function MeasurePanel() {
  return (
    <div style={styles.floatingPanel}>
      <div style={styles.panelTitle}>Measure</div>
      <div style={styles.panelBody}>
        <p style={styles.panelHint}>Click two points, edges, or faces to measure distance.</p>
        <div style={styles.measureRow}>
          <span style={styles.measureLabel}>Distance</span>
          <span style={styles.measureValue}>—</span>
        </div>
        <div style={styles.measureRow}>
          <span style={styles.measureLabel}>Angle</span>
          <span style={styles.measureValue}>—</span>
        </div>
        <div style={styles.measureRow}>
          <span style={styles.measureLabel}>Delta X</span>
          <span style={styles.measureValue}>—</span>
        </div>
        <div style={styles.measureRow}>
          <span style={styles.measureLabel}>Delta Y</span>
          <span style={styles.measureValue}>—</span>
        </div>
        <div style={styles.measureRow}>
          <span style={styles.measureLabel}>Delta Z</span>
          <span style={styles.measureValue}>—</span>
        </div>
      </div>
    </div>
  );
}

// ─── ANALYSIS PANEL ───
function AnalysisPanel() {
  return (
    <div style={styles.floatingPanel}>
      <div style={styles.panelTitle}>Analysis Tools</div>
      <div style={styles.panelBody}>
        <button style={styles.analysisBtn}>Curvature Analysis</button>
        <button style={styles.analysisBtn}>Draft Analysis</button>
        <button style={styles.analysisBtn}>Thickness Analysis</button>
        <button style={styles.analysisBtn}>Zebra Stripes</button>
        <button style={styles.analysisBtn}>Section View</button>
      </div>
    </div>
  );
}

// ─── MASS PROPERTIES PANEL ───
function MassPropertiesPanel({ props }: { props: ReturnType<typeof calculateMassProperties> }) {
  return (
    <div style={styles.floatingPanel}>
      <div style={styles.panelTitle}>Mass Properties</div>
      <div style={styles.panelBody}>
        <div style={styles.measureRow}>
          <span style={styles.measureLabel}>Volume</span>
          <span style={styles.measureValue}>{props.volume.toFixed(4)} mm³</span>
        </div>
        <div style={styles.measureRow}>
          <span style={styles.measureLabel}>Surface Area</span>
          <span style={styles.measureValue}>{props.surfaceArea.toFixed(4)} mm²</span>
        </div>
        <div style={styles.measureRow}>
          <span style={styles.measureLabel}>Mass (steel)</span>
          <span style={styles.measureValue}>{props.mass.toFixed(4)} g</span>
        </div>
        <div style={styles.measureRow}>
          <span style={styles.measureLabel}>Centroid X</span>
          <span style={styles.measureValue}>{props.centroid.x.toFixed(3)}</span>
        </div>
        <div style={styles.measureRow}>
          <span style={styles.measureLabel}>Centroid Y</span>
          <span style={styles.measureValue}>{props.centroid.y.toFixed(3)}</span>
        </div>
        <div style={styles.measureRow}>
          <span style={styles.measureLabel}>Centroid Z</span>
          <span style={styles.measureValue}>{props.centroid.z.toFixed(3)}</span>
        </div>
        <div style={styles.measureRow}>
          <span style={styles.measureLabel}>Bounding Box</span>
          <span style={styles.measureValue}>{props.boundingBox}</span>
        </div>
      </div>
    </div>
  );
}

// ─── MASS PROPERTY CALCULATION ───
function calculateMassProperties(features: any[]) {
  let totalVerts = 0;
  let cx = 0, cy = 0, cz = 0;
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

  for (const f of features) {
    if (!f.mesh) continue;
    const v = f.mesh.vertices;
    for (let i = 0; i < v.length; i += 3) {
      cx += v[i]; cy += v[i + 1]; cz += v[i + 2];
      minX = Math.min(minX, v[i]); maxX = Math.max(maxX, v[i]);
      minY = Math.min(minY, v[i + 1]); maxY = Math.max(maxY, v[i + 1]);
      minZ = Math.min(minZ, v[i + 2]); maxZ = Math.max(maxZ, v[i + 2]);
      totalVerts++;
    }
  }

  if (totalVerts === 0) {
    return { volume: 0, surfaceArea: 0, mass: 0, centroid: { x: 0, y: 0, z: 0 }, boundingBox: "—" };
  }

  cx /= totalVerts; cy /= totalVerts; cz /= totalVerts;
  const dx = maxX - minX, dy = maxY - minY, dz = maxZ - minZ;
  const volume = dx * dy * dz;
  const surfaceArea = 2 * (dx * dy + dy * dz + dx * dz);
  const mass = volume * 7.85e-3; // steel density g/mm³

  return {
    volume,
    surfaceArea,
    mass,
    centroid: { x: cx, y: cy, z: cz },
    boundingBox: `${dx.toFixed(1)} x ${dy.toFixed(1)} x ${dz.toFixed(1)}`,
  };
}

// ─── STYLES ───
const styles: Record<string, React.CSSProperties> = {
  bottomRight: {
    position: "absolute",
    bottom: 60,
    right: 292,
    display: "flex",
    flexDirection: "column",
    gap: 4,
    zIndex: 15,
  },
  overlayBtn: {
    width: 36,
    height: 36,
    borderRadius: 6,
    background: "#1a1a1aee",
    border: "1px solid #333",
    color: "#999",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.15s",
    backdropFilter: "blur(4px)",
  },
  overlayBtnActive: {
    background: "#1e3a5fee",
    borderColor: "#3b82f6",
    color: "#93c5fd",
  },
  topRight: {
    position: "absolute",
    top: 8,
    right: 292,
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: 4,
    zIndex: 15,
  },
  cameraController: {
    background: "#1a1a1aee",
    border: "1px solid #333",
    borderRadius: 8,
    padding: 8,
    backdropFilter: "blur(4px)",
    minWidth: 180,
  },
  presetGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 2,
    marginBottom: 4,
  },
  presetBtn: {
    padding: "5px 2px",
    background: "#222",
    borderWidth: 1,
    borderStyle: "solid" as const,
    borderColor: "#2a2a2a",
    borderRadius: 3,
    color: "#888",
    cursor: "pointer",
    fontFamily: "inherit",
    fontSize: 9,
    fontWeight: 700,
    textAlign: "center" as const,
    letterSpacing: "0.03em",
    transition: "all 0.12s",
  },
  presetBtnActive: {
    background: "#1e3a5f",
    borderColor: "#3b82f6",
    color: "#93c5fd",
  },
  toggleSlidersBtn: {
    width: "100%",
    padding: "4px 0",
    background: "transparent",
    border: "none",
    borderTop: "1px solid #2a2a2a",
    color: "#666",
    cursor: "pointer",
    fontFamily: "inherit",
    fontSize: 9,
    marginTop: 2,
  },
  sliderGroup: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 6,
    marginTop: 6,
  },
  sliderRow: {
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  sliderLabel: {
    fontSize: 9,
    color: "#888",
    width: 52,
    flexShrink: 0,
    fontWeight: 600,
  },
  slider: {
    flex: 1,
    height: 4,
    accentColor: "#3b82f6",
    cursor: "pointer",
  },
  sliderValue: {
    fontSize: 10,
    color: "#3b82f6",
    fontFamily: "monospace",
    width: 36,
    textAlign: "right" as const,
    fontWeight: 600,
  },
  quickAngles: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: 2,
    marginTop: 4,
  },
  quickAngleBtn: {
    padding: "3px 6px",
    background: "#222",
    border: "1px solid #2a2a2a",
    borderRadius: 3,
    color: "#888",
    cursor: "pointer",
    fontFamily: "inherit",
    fontSize: 9,
  },
  rotateRow: {
    display: "flex",
    gap: 3,
    marginTop: 4,
  },
  rotateBtn: {
    flex: 1,
    padding: "4px 0",
    background: "#222",
    border: "1px solid #2a2a2a",
    borderRadius: 3,
    color: "#888",
    cursor: "pointer",
    fontFamily: "inherit",
    fontSize: 9,
    textAlign: "center" as const,
  },
  viewOptionsBtn: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    padding: "4px 8px",
    background: "#1a1a1aee",
    border: "1px solid #333",
    borderRadius: 4,
    color: "#888",
    cursor: "pointer",
    fontSize: 10,
    backdropFilter: "blur(4px)",
  },
  caret: { fontSize: 8, color: "#666" },
  dropdown: {
    position: "absolute",
    top: "100%",
    right: 0,
    marginTop: 4,
    background: "#1a1a1a",
    border: "1px solid #333",
    borderRadius: 8,
    padding: "6px 0",
    minWidth: 180,
    boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
    zIndex: 20,
  },
  dropdownHeader: {
    padding: "4px 12px",
    fontSize: 9,
    color: "#666",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  dropdownItem: {
    display: "block",
    width: "100%",
    padding: "6px 12px",
    background: "transparent",
    border: "none",
    color: "#ccc",
    cursor: "pointer",
    fontFamily: "inherit",
    fontSize: 12,
    textAlign: "left",
  },
  dropdownItemActive: { background: "#1e3a5f", color: "#93c5fd" },
  dropdownDivider: { height: 1, background: "#2a2a2a", margin: "4px 0" },
  floatingPanel: {
    position: "absolute",
    bottom: 60,
    right: 336,
    width: 240,
    background: "#111111ee",
    border: "1px solid #333",
    borderRadius: 8,
    backdropFilter: "blur(8px)",
    zIndex: 16,
    boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
  },
  panelTitle: {
    padding: "10px 14px",
    fontSize: 12,
    fontWeight: 700,
    color: "#e5e5e5",
    borderBottom: "1px solid #2a2a2a",
  },
  panelBody: { padding: "8px 14px" },
  panelHint: { color: "#666", fontSize: 11, marginBottom: 10, lineHeight: 1.4 },
  measureRow: {
    display: "flex",
    justifyContent: "space-between",
    padding: "4px 0",
    borderBottom: "1px solid #1a1a1a",
  },
  measureLabel: { color: "#888", fontSize: 11 },
  measureValue: { color: "#3b82f6", fontSize: 11, fontWeight: 600, fontFamily: "monospace" },
  analysisBtn: {
    display: "block",
    width: "100%",
    padding: "8px 0",
    marginBottom: 4,
    background: "#1a1a1a",
    border: "1px solid #2a2a2a",
    borderRadius: 4,
    color: "#ccc",
    cursor: "pointer",
    fontFamily: "inherit",
    fontSize: 11,
  },
  banner: {
    position: "absolute",
    top: 8,
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: 15,
  },
  bannerText: {
    padding: "3px 12px",
    background: "#1a1a1acc",
    borderRadius: 4,
    color: "#888",
    fontSize: 10,
    backdropFilter: "blur(4px)",
  },
};
