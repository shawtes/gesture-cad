"use client";

/**
 * Tutorial Overlay — comprehensive step-by-step guide.
 * Covers every button and interaction in AR/VR.
 */

import { useState } from "react";

interface TutorialOverlayProps {
  visible: boolean;
  onClose: () => void;
}

const STEPS = [
  {
    title: "Welcome",
    icon: "◈",
    content: "GestureCAD XR — your holographic CAD workbench.\nDesign 3D models in AR/VR using hands or controllers.",
    tip: "Works on Meta Quest with hand tracking or controllers",
  },
  {
    title: "Entering AR/VR",
    icon: "🥽",
    content: "AR button: Passthrough mode — see your room with holographic objects floating in it.\n\nVR button: Full immersive mode — dark environment with just the workbench.\n\nBoth modes have the same tools and features.",
    tip: "AR is recommended for the best hologram experience",
  },
  {
    title: "Opening the Menu",
    icon: "☰",
    content: "Three ways to open the menu in AR/VR:\n\n1. FLOATING BUTTON: A green 'MENU' button floats in your lower-right view. Point at it and pinch (hand) or trigger (controller) to toggle.\n\n2. CONTROLLER: Squeeze the grip button on your right controller.\n\n3. HAND: Turn your left palm toward your face.\n\nThe menu appears as a 2D panel overlay.",
    tip: "The floating MENU button is the most reliable method",
  },
  {
    title: "Adding Shapes",
    icon: "▣",
    content: "Open the Menu → ADD SHAPES section:\n\n▣ Box — adds a cube\n⊙ Cyl — adds a cylinder\n● Sph — adds a sphere\n△ Cone — adds a cone\n◎ Tor — adds a torus (donut)\n\nUse the Size slider to set dimensions before adding.\n\nYou can also tap tool pucks on the workbench edges.",
    tip: "Each shape appears at a unique position (golden spiral layout)",
  },
  {
    title: "Sketch + Extrude",
    icon: "□",
    content: "Menu → SKETCH + EXTRUDE section:\n\nSet the Height slider, then tap:\n□ Rect — extruded rectangle\n○ Circle — extruded circle\n⬡ Poly — extruded hexagon\n\nThese create 3D solids from 2D shapes.",
    tip: "Great for walls, columns, tables, and structural elements",
  },
  {
    title: "Generate Houses",
    icon: "🏠",
    content: "Menu → GENERATE HOUSE section:\n\n1-Bed: 7m×7m apartment with bedroom, kitchen, bathroom, furniture\n2-Bed: 10m×8m house with 2 bedrooms, kitchen, living room\n3-Bed: 12m×10m house with 3 bedrooms, en-suite, garage\n\nAll dimensions from real architectural standards.",
    tip: "Houses generate walls, rooms, furniture, and roof automatically",
  },
  {
    title: "Selecting Objects",
    icon: "👆",
    content: "Point at any object and pinch (or trigger) to select it.\n\nSelected objects show an orange wireframe highlight.\n\nOnce selected, the menu shows:\n- Object name\n- Scale slider\n- Clone / Mirror buttons\n- +Extrude button\n- Delete button\n- Linear & Circular pattern",
    tip: "Tap the same object again or tap empty space to deselect",
  },
  {
    title: "Moving Objects",
    icon: "✊",
    content: "With hands:\n- PINCH (thumb+index): Grab and move the whole scene\n- TWO-HAND PINCH: Scale everything up/down\n- FIST: Rotate the scene\n- OPEN PALM: Reset view\n\nWith controllers:\n- TRIGGER: Grab/move\n- GRIP: Open menu",
    tip: "All movement is in full 3D — move in any direction",
  },
  {
    title: "Materials",
    icon: "◑",
    content: "Menu → MATERIAL section — 6 rendering modes:\n\n◇ Hologram — sci-fi scan lines + edge glow\n◼ Solid — standard PBR material\n◻ Wire — transparent wireframe\n◊ Glass — refractive transparent\n◆ Metal — shiny chrome/steel\n● Matte — flat diffuse\n\nAll modes work with the color presets.",
    tip: "Solid and Metal look best in AR with real lighting",
  },
  {
    title: "Colors",
    icon: "🎨",
    content: "Menu → COLOR section:\n\n5 color presets: Cyan, Blue, Green, Orange, Purple\n\nTap a color dot to change the color of all objects.\nWorks with every material mode.",
    tip: "Cyan hologram is the classic Iron Man look",
  },
  {
    title: "Patterns & Modifiers",
    icon: "⋯",
    content: "Select an object first, then in the menu:\n\nClone: Duplicate the object nearby\nMirror: Mirror across X axis\n+Extrude: Make it taller\nL.Pattern: Linear array (set count + spacing)\nC.Pattern: Circular array around center\n\nMenu → Modify submenu has more:\nFillet, Chamfer, Shell, Hole, Union, Subtract",
    tip: "Always select an object before applying modifiers",
  },
  {
    title: "Table Controls",
    icon: "📐",
    content: "Menu → TABLE section:\n\nHeight: Raise/lower the workbench (0.4m to 1.2m)\nScale: Make the table bigger or smaller (0.5x to 2.0x)\n\nThe grid, tools, and model all adjust together.",
    tip: "Lower the table if you're seated, raise it if standing",
  },
  {
    title: "Object Management",
    icon: "📋",
    content: "Menu → OBJECTS section shows all objects in your scene.\n\nTap an object name to select it.\nSelected objects are highlighted in orange.\n\nUse Delete to remove selected objects.\nUse Clear All to start fresh.\nUndo/Redo works for all operations.",
    tip: "The object count shows in the top bar",
  },
  {
    title: "Sculpt Tools",
    icon: "🔮",
    content: "Menu → Sculpt submenu:\n\n✊ Grab — push/pull vertices with your hand\n≋ Smooth — smooth out bumpy areas\n◉ Inflate — puff out geometry along normals\n◆ Edit Mode — vertex/edge/face selection\n\nThese modify the actual mesh geometry.",
    tip: "Sculpt works best on objects with many vertices (sphere, torus)",
  },
  {
    title: "Exiting AR/VR",
    icon: "✕",
    content: "Three ways to exit:\n\n1. Menu → scroll to bottom → tap 'Exit XR'\n2. Press the Meta button on your controller\n3. Press the Oculus button to open system menu\n\nYour scene is preserved when you re-enter.",
    tip: "Your objects stay on the workbench until you clear them",
  },
  {
    title: "You're Ready!",
    icon: "🚀",
    content: "Quick start:\n1. Tap AR to enter augmented reality\n2. Tap the floating MENU button\n3. Add a Box or generate a House\n4. Pinch to grab and move\n5. Change materials and colors\n6. Select objects to modify them\n\nThe workbench is your creative space — experiment!",
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
        <div style={hdr}>
          <span style={{ fontSize: 28 }}>{s.icon}</span>
          <h2 style={ttl}>{s.title}</h2>
          <button style={xBtn} onClick={onClose}>✕</button>
        </div>

        <div style={body}>
          {s.content.split("\n").map((line, i) => (
            <p key={i} style={line === "" ? { height: 6 } : { margin: "2px 0" }}>{line}</p>
          ))}
        </div>

        <div style={tipBox}>💡 {s.tip}</div>

        <div style={nav}>
          <span style={stepNum}>{step + 1} / {STEPS.length}</span>
          <div style={{ display: "flex", gap: 8 }}>
            {step > 0 && <button style={backBtnS} onClick={() => setStep(step - 1)}>← Back</button>}
            {isLast
              ? <button style={startBtnS} onClick={onClose}>Start Building</button>
              : <button style={nextBtnS} onClick={() => setStep(step + 1)}>Next →</button>
            }
          </div>
        </div>

        <div style={dots}>
          {STEPS.map((_, i) => (
            <div key={i} onClick={() => setStep(i)} style={{
              width: 7, height: 7, borderRadius: 4, cursor: "pointer",
              background: i === step ? "#00ccaa" : i < step ? "#aaa" : "#ddd",
            }} />
          ))}
        </div>
      </div>
    </div>
  );
}

const backdrop: React.CSSProperties = {
  position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
  background: "rgba(245,240,232,0.92)", zIndex: 200, pointerEvents: "auto",
  fontFamily: "'SF Mono', Menlo, monospace",
};
const card: React.CSSProperties = {
  width: 400, maxWidth: "92vw", maxHeight: "85vh", overflowY: "auto",
  background: "#fff", borderRadius: 20, padding: "20px 24px",
  boxShadow: "0 8px 40px rgba(0,0,0,0.12)", color: "#333",
};
const hdr: React.CSSProperties = { display: "flex", alignItems: "center", gap: 10, marginBottom: 14 };
const ttl: React.CSSProperties = { fontSize: 17, fontWeight: 700, color: "#222", flex: 1, margin: 0 };
const xBtn: React.CSSProperties = {
  width: 32, height: 32, background: "#f0ece4", border: "none",
  borderRadius: 8, cursor: "pointer", fontSize: 16, color: "#999", fontFamily: "inherit",
};
const body: React.CSSProperties = { fontSize: 12, color: "#555", lineHeight: 1.7, marginBottom: 14, whiteSpace: "pre-wrap" };
const tipBox: React.CSSProperties = {
  fontSize: 11, color: "#00886a", background: "rgba(0,204,170,0.08)",
  border: "1px solid rgba(0,204,170,0.2)", borderRadius: 10, padding: "8px 12px", marginBottom: 14,
};
const nav: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 };
const stepNum: React.CSSProperties = { fontSize: 11, color: "#aaa" };
const backBtnS: React.CSSProperties = {
  padding: "8px 16px", background: "#f0ece4", color: "#666",
  border: "none", borderRadius: 8, cursor: "pointer", fontFamily: "inherit", fontSize: 12,
};
const nextBtnS: React.CSSProperties = {
  padding: "8px 20px", background: "#00ccaa", color: "#fff",
  border: "none", borderRadius: 8, cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 600,
};
const startBtnS: React.CSSProperties = {
  padding: "10px 24px", background: "#00ccaa", color: "#fff",
  border: "none", borderRadius: 10, cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 700,
};
const dots: React.CSSProperties = { display: "flex", justifyContent: "center", gap: 5 };
