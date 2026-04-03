"use client";

/**
 * Tutorial Overlay — step-by-step guide for first-time users.
 * Rendered via DOM Overlay so it works in AR/VR.
 */

import { useState } from "react";

interface TutorialOverlayProps {
  visible: boolean;
  onClose: () => void;
}

const STEPS = [
  {
    title: "Welcome to GestureCAD XR",
    icon: "◈",
    content: "Your holographic CAD workbench. Design 3D models in AR/VR using your hands or controllers.",
    tip: "Tap Next to learn the controls",
  },
  {
    title: "The Workbench",
    icon: "📐",
    content: "A floating table with a 3D grid sits in front of you. Your models appear on this table. Walk around it to view from any angle.",
    tip: "Use the Menu to adjust table height and size",
  },
  {
    title: "Adding Objects",
    icon: "▣",
    content: "Tap the tool pucks around the table edges to add shapes:\n\n" +
      "Front row: Sketch tools (Line, Rect, Circle, Arc, Polygon, Draw)\n" +
      "Right side: Build tools (Box, Cylinder, Sphere, Extrude, Fillet, Hole)\n" +
      "Back row: Boolean & Pattern tools\n" +
      "Left side: Edit, Sculpt, Generate, Select",
    tip: "Tapping Box, Cylinder, Sphere, Rect, Circle, or Polygon instantly adds a shape",
  },
  {
    title: "Hand Gestures",
    icon: "🤚",
    content: "Pinch (thumb + index): Grab and move the model\n" +
      "Two-hand pinch: Scale the model up or down\n" +
      "Fist: Rotate the model\n" +
      "Open palm: Reset position and scale\n" +
      "Point: Select (coming soon)",
    tip: "Controller trigger works the same as pinch",
  },
  {
    title: "The Menu",
    icon: "☰",
    content: "Tap the '☰ Menu' button at the bottom-left to open the full menu. From here you can:\n\n" +
      "- Add primitives with size controls\n" +
      "- Create sketch shapes with extrude\n" +
      "- Generate full houses (1-bed, 2-bed, 3-bed)\n" +
      "- Access all tools (Sketch, Modify, Sculpt, etc.)\n" +
      "- Adjust table height and scale\n" +
      "- Undo/Redo, Clear All, Exit XR",
    tip: "In AR, face your left palm toward you to auto-open the menu",
  },
  {
    title: "Generating Houses",
    icon: "🏠",
    content: "Tap 'Gen' on the table or open Menu → GENERATE section to instantly build a complete house with walls, rooms, furniture, and roof.\n\n" +
      "Choose from 1-Bed apartment, 2-Bed house, or 3-Bed house. All dimensions from real architectural standards.",
    tip: "Each generation adds to the scene — use Clear All to start fresh",
  },
  {
    title: "Color & Display",
    icon: "◑",
    content: "Use the color dots in the top bar to change the hologram color (Cyan, Blue, Green, Orange, Purple).\n\n" +
      "Tap ◻ to toggle wireframe view.\n\n" +
      "The table and model colors update instantly.",
    tip: "Wireframe mode shows the 3D mesh structure",
  },
  {
    title: "You're Ready!",
    icon: "🚀",
    content: "Start by tapping a tool puck on the table or opening the Menu.\n\n" +
      "Tap AR to enter augmented reality with passthrough.\n" +
      "Tap VR for full immersive mode.\n\n" +
      "The workbench appears in your space — walk around it, reach in, and create.",
    tip: "Have fun building in 3D!",
  },
];

export function TutorialOverlay({ visible, onClose }: TutorialOverlayProps) {
  const [step, setStep] = useState(0);

  if (!visible) return null;

  const s = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div data-xr-ui style={backdrop} onClick={e => e.stopPropagation()}>
      <div style={card}>
        {/* Header */}
        <div style={header}>
          <span style={{ fontSize: 28 }}>{s.icon}</span>
          <h2 style={title}>{s.title}</h2>
          <button style={closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Content */}
        <div style={content}>
          {s.content.split("\n").map((line, i) => (
            <p key={i} style={line === "" ? { height: 8 } : { margin: "2px 0" }}>
              {line}
            </p>
          ))}
        </div>

        {/* Tip */}
        <div style={tipBox}>
          💡 {s.tip}
        </div>

        {/* Navigation */}
        <div style={nav}>
          <span style={stepIndicator}>
            {step + 1} / {STEPS.length}
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            {step > 0 && (
              <button style={navBtn} onClick={() => setStep(step - 1)}>← Back</button>
            )}
            {isLast ? (
              <button style={startBtn} onClick={onClose}>Start Building</button>
            ) : (
              <button style={nextBtn} onClick={() => setStep(step + 1)}>Next →</button>
            )}
          </div>
        </div>

        {/* Progress dots */}
        <div style={dots}>
          {STEPS.map((_, i) => (
            <div key={i} style={{
              width: 8, height: 8, borderRadius: 4,
              background: i === step ? "#00ccaa" : i < step ? "#aaa" : "#ddd",
              cursor: "pointer",
            }} onClick={() => setStep(i)} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Styles ───

const backdrop: React.CSSProperties = {
  position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
  background: "rgba(245,240,232,0.9)", zIndex: 200, pointerEvents: "auto",
  fontFamily: "'SF Mono', Menlo, monospace",
};

const card: React.CSSProperties = {
  width: 380, maxWidth: "90vw", maxHeight: "85vh", overflowY: "auto",
  background: "#fff", borderRadius: 20, padding: "24px 28px",
  boxShadow: "0 8px 40px rgba(0,0,0,0.12)", color: "#333",
};

const header: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 12, marginBottom: 16,
};

const title: React.CSSProperties = {
  fontSize: 18, fontWeight: 700, color: "#222", flex: 1, margin: 0,
};

const closeBtn: React.CSSProperties = {
  width: 32, height: 32, background: "#f0ece4", border: "none",
  borderRadius: 8, cursor: "pointer", fontSize: 16, color: "#999",
  fontFamily: "inherit",
};

const content: React.CSSProperties = {
  fontSize: 13, color: "#555", lineHeight: 1.7, marginBottom: 16,
  whiteSpace: "pre-wrap",
};

const tipBox: React.CSSProperties = {
  fontSize: 12, color: "#00886a", background: "rgba(0,204,170,0.08)",
  border: "1px solid rgba(0,204,170,0.2)", borderRadius: 10,
  padding: "10px 14px", marginBottom: 16,
};

const nav: React.CSSProperties = {
  display: "flex", justifyContent: "space-between", alignItems: "center",
  marginBottom: 12,
};

const stepIndicator: React.CSSProperties = {
  fontSize: 11, color: "#aaa",
};

const navBtn: React.CSSProperties = {
  padding: "8px 16px", background: "#f0ece4", color: "#666",
  border: "none", borderRadius: 8, cursor: "pointer",
  fontFamily: "inherit", fontSize: 13,
};

const nextBtn: React.CSSProperties = {
  padding: "8px 20px", background: "#00ccaa", color: "#fff",
  border: "none", borderRadius: 8, cursor: "pointer",
  fontFamily: "inherit", fontSize: 13, fontWeight: 600,
};

const startBtn: React.CSSProperties = {
  padding: "10px 24px", background: "#00ccaa", color: "#fff",
  border: "none", borderRadius: 10, cursor: "pointer",
  fontFamily: "inherit", fontSize: 14, fontWeight: 700,
};

const dots: React.CSSProperties = {
  display: "flex", justifyContent: "center", gap: 6,
};
