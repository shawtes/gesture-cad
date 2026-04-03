"use client";

import { useState, useEffect } from "react";

const TUTORIAL_DISMISSED_KEY = "gesture-cad-tutorial-v2";

interface Step {
  title: string;
  content: string[];
  visual: string; // Large visual/emoji
  category: "setup" | "gesture" | "draw" | "model" | "navigate" | "tips";
}

const steps: Step[] = [
  {
    title: "Welcome to GestureCAD",
    visual: "◈",
    category: "setup",
    content: [
      "Design 3D objects using your hands as a touchscreen.",
      "Your webcam tracks your hand in real-time — pinch, point, and grab to create.",
      "Everything also works with mouse + keyboard as a fallback.",
    ],
  },
  {
    title: "Step 1: Enable Your Camera",
    visual: "📷",
    category: "setup",
    content: [
      "Click 'Enable Hand Tracking' (bottom-left blue button).",
      "Allow camera access when your browser asks.",
      "Wait for 'TRACKING ACTIVE' to appear — the model takes a few seconds to load.",
      "You'll see a small camera feed with your hand skeleton drawn on it.",
    ],
  },
  {
    title: "Your Hand = A Touchscreen",
    visual: "🖐️",
    category: "gesture",
    content: [
      "A glowing blue cursor follows your INDEX FINGER tip across the entire screen.",
      "Move your hand to move the cursor — just like moving your finger on a phone.",
      "The cursor can hover over buttons, the 3D viewport, panels — everything.",
    ],
  },
  {
    title: "PINCH = Touch / Click",
    visual: "🤏",
    category: "gesture",
    content: [
      "Touch your THUMB to your INDEX FINGER to 'tap' — this is your click.",
      "Pinch while pointing at a toolbar button → activates that tool.",
      "Pinch in the viewport → places a point or starts drawing.",
      "Pinch on an object → selects it.",
      "The cursor shows 'TOUCH' and a crosshair when you're pinching.",
    ],
  },
  {
    title: "PINCH + DRAG = Draw or Move",
    visual: "✏️",
    category: "draw",
    content: [
      "Pinch and HOLD while moving your hand → draws a freehand line.",
      "Pinch on an existing shape and drag → moves it.",
      "Pinch on empty space and drag → draws on the active sketch plane.",
      "Release the pinch to finish the stroke.",
    ],
  },
  {
    title: "Tool Gestures — Shape Your Hand",
    visual: "✌️",
    category: "gesture",
    content: [
      "POINT (index finger) → Point/Dot tool",
      "PEACE SIGN (index + middle) → Line tool",
      "THREE FINGERS (index + middle + ring) → Circle tool",
      "L-SHAPE (thumb + index at 90°) → Rectangle tool",
      "FIST (all fingers closed) → Select mode",
      "OPEN PALM (all fingers spread) → Pan/Navigate mode",
      "THUMBS UP → Confirm / Apply operation",
    ],
  },
  {
    title: "Creating 3D Objects",
    visual: "📦",
    category: "model",
    content: [
      "METHOD 1 — Primitives: Click the green 'Primitives' button → pick Box, Cylinder, Sphere, Cone, or Torus.",
      "METHOD 2 — Sketch + Extrude: Draw a 2D shape (rectangle or circle), then press X or click Extrude to make it 3D.",
      "METHOD 3 — Pinch + Pull: Pinch on a 2D shape and pull your hand UP to interactively extrude it.",
    ],
  },
  {
    title: "Navigating 3D Space",
    visual: "🌐",
    category: "navigate",
    content: [
      "RIGHT-CLICK DRAG or OPEN PALM gesture → Orbit the camera around.",
      "SCROLL WHEEL or TWO-HAND PINCH → Zoom in/out.",
      "MIDDLE-CLICK DRAG or TWO-HAND PAN → Pan the view.",
      "Press 1/2/3 to switch sketch planes: 1=Floor (green), 2=Front wall (red), 3=Side wall (blue).",
      "The bright grid shows which plane you're drawing on.",
    ],
  },
  {
    title: "Two-Hand Gestures",
    visual: "🙌",
    category: "gesture",
    content: [
      "BOTH HANDS PINCH + SPREAD APART → Zoom in.",
      "BOTH HANDS PINCH + BRING TOGETHER → Zoom out.",
      "BOTH HANDS PINCH + ROTATE → Orbit the 3D view.",
      "BOTH HANDS PINCH + MOVE TOGETHER → Pan the view.",
      "Your RIGHT hand draws, your LEFT hand controls the camera.",
    ],
  },
  {
    title: "Keyboard Shortcuts",
    visual: "⌨️",
    category: "tips",
    content: [
      "V = Select    L = Line    C = Circle    R = Rectangle",
      "E = Ellipse   A = Arc     X = Extrude   T = Trim",
      "M = Mirror    P = Point",
      "1 = Top plane   2 = Front plane   3 = Side plane",
      "Ctrl+Z = Undo   Ctrl+Y = Redo   Escape = Deselect",
      "Delete = Remove selected entity",
    ],
  },
  {
    title: "Selection & Editing",
    visual: "🎯",
    category: "tips",
    content: [
      "Hover over shapes → they highlight AMBER.",
      "Pinch/click a shape → it turns ORANGE (selected).",
      "Pinch + drag a selected shape → moves it on its plane.",
      "Press Delete or Backspace to remove selected shapes.",
      "Double-tap (two quick pinches) → deselect everything.",
      "SWIPE LEFT → Undo   SWIPE RIGHT → Redo",
    ],
  },
  {
    title: "You're Ready!",
    visual: "🚀",
    category: "tips",
    content: [
      "Start by clicking 'Enable Hand Tracking' and holding up your hand.",
      "Try drawing a rectangle (peace sign → pinch two corners).",
      "Then extrude it into a 3D box (press X).",
      "Or click 'Primitives' to drop in a 3D cylinder directly.",
      "Click the ? button anytime to see this tutorial again.",
    ],
  },
];

const categoryColors: Record<string, string> = {
  setup: "#22c55e",
  gesture: "#3b82f6",
  draw: "#f59e0b",
  model: "#8b5cf6",
  navigate: "#06b6d4",
  tips: "#ec4899",
};

export function TutorialOverlay() {
  const [visible, setVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const dismissed = localStorage.getItem(TUTORIAL_DISMISSED_KEY);
    if (!dismissed) {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  return (
    <TutorialModal
      onClose={() => {
        setVisible(false);
        localStorage.setItem(TUTORIAL_DISMISSED_KEY, "true");
      }}
    />
  );
}

export function TutorialButton() {
  const [show, setShow] = useState(false);

  return (
    <>
      <button
        style={btnStyles.helpBtn}
        onClick={() => setShow(true)}
        title="Gesture Controls Guide"
      >
        ?
      </button>
      {show && <TutorialModal onClose={() => setShow(false)} />}
    </>
  );
}

function TutorialModal({ onClose }: { onClose: () => void }) {
  const [currentStep, setCurrentStep] = useState(0);

  const step = steps[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === steps.length - 1;
  const catColor = categoryColors[step.category] || "#3b82f6";

  return (
    <div style={styles.backdrop} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Category badge */}
        <div style={{ ...styles.categoryBadge, background: catColor + "22", color: catColor, borderColor: catColor + "44" }}>
          {step.category.toUpperCase()}
        </div>

        {/* Progress bar */}
        <div style={styles.progressBar}>
          <div style={{ ...styles.progressFill, width: `${((currentStep + 1) / steps.length) * 100}%`, background: catColor }} />
        </div>

        {/* Progress dots */}
        <div style={styles.progress}>
          {steps.map((s, i) => (
            <div
              key={i}
              style={{
                ...styles.dot,
                background: i === currentStep ? catColor : i < currentStep ? catColor + "88" : "#333",
                width: i === currentStep ? 12 : 8,
              }}
              onClick={() => setCurrentStep(i)}
            />
          ))}
        </div>

        {/* Visual */}
        <div style={styles.visual}>{step.visual}</div>

        {/* Title */}
        <h2 style={styles.title}>{step.title}</h2>

        {/* Content bullets */}
        <div style={styles.contentList}>
          {step.content.map((line, i) => (
            <div key={i} style={styles.contentItem}>
              <span style={{ ...styles.bullet, background: catColor }}></span>
              <span style={styles.contentText}>{line}</span>
            </div>
          ))}
        </div>

        {/* Navigation */}
        <div style={styles.nav}>
          <button style={styles.skipBtn} onClick={onClose}>
            {isFirst ? "Skip Tutorial" : "Close"}
          </button>
          <div style={styles.navRight}>
            {!isFirst && (
              <button style={styles.navBtn} onClick={() => setCurrentStep((s) => s - 1)}>
                Back
              </button>
            )}
            {isLast ? (
              <button style={{ ...styles.startBtn, background: catColor }} onClick={onClose}>
                Start Building
              </button>
            ) : (
              <button style={{ ...styles.startBtn, background: catColor }} onClick={() => setCurrentStep((s) => s + 1)}>
                Next ({currentStep + 1}/{steps.length})
              </button>
            )}
          </div>
        </div>

        {/* Quick nav: jump to section */}
        <div style={styles.quickNav}>
          {["setup", "gesture", "draw", "model", "navigate", "tips"].map((cat) => {
            const idx = steps.findIndex((s) => s.category === cat);
            const color = categoryColors[cat];
            return (
              <button
                key={cat}
                style={{
                  ...styles.quickNavBtn,
                  color: step.category === cat ? color : "#555",
                  borderBottomColor: step.category === cat ? color : "transparent",
                }}
                onClick={() => setCurrentStep(idx)}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(0, 0, 0, 0.8)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    backdropFilter: "blur(8px)",
  },
  modal: {
    background: "#111111",
    border: "1px solid #2a2a2a",
    borderRadius: 16,
    padding: "28px 36px 20px",
    maxWidth: 520,
    width: "92%",
    maxHeight: "85vh",
    overflowY: "auto" as const,
    position: "relative",
    boxShadow: "0 24px 64px rgba(0,0,0,0.7)",
  },
  categoryBadge: {
    position: "absolute" as const,
    top: 16,
    right: 20,
    padding: "2px 10px",
    borderRadius: 12,
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: "0.08em",
    borderWidth: 1,
    borderStyle: "solid" as const,
    borderColor: "transparent",
  },
  progressBar: {
    width: "100%",
    height: 3,
    background: "#222",
    borderRadius: 2,
    marginBottom: 16,
    overflow: "hidden" as const,
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
    transition: "width 0.3s ease",
  },
  progress: {
    display: "flex",
    justifyContent: "center",
    gap: 4,
    marginBottom: 20,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    cursor: "pointer",
    transition: "all 0.2s",
  },
  visual: {
    fontSize: 56,
    textAlign: "center" as const,
    marginBottom: 12,
    lineHeight: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    color: "#f0f0f0",
    margin: "0 0 16px 0",
    textAlign: "center" as const,
    letterSpacing: "-0.02em",
  },
  contentList: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 8,
    marginBottom: 24,
    textAlign: "left" as const,
  },
  contentItem: {
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    flexShrink: 0,
    marginTop: 7,
  },
  contentText: {
    fontSize: 13,
    lineHeight: 1.5,
    color: "#bbb",
  },
  nav: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  navRight: {
    display: "flex",
    gap: 8,
  },
  skipBtn: {
    padding: "8px 16px",
    background: "transparent",
    border: "none",
    color: "#555",
    cursor: "pointer",
    fontSize: 13,
    fontFamily: "inherit",
    borderRadius: 6,
  },
  navBtn: {
    padding: "8px 16px",
    background: "#222",
    border: "1px solid #333",
    color: "#aaa",
    cursor: "pointer",
    fontSize: 13,
    fontFamily: "inherit",
    borderRadius: 6,
  },
  startBtn: {
    padding: "8px 22px",
    border: "none",
    color: "#fff",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
    fontFamily: "inherit",
    borderRadius: 6,
  },
  quickNav: {
    display: "flex",
    justifyContent: "center",
    gap: 2,
    borderTop: "1px solid #222",
    paddingTop: 10,
  },
  quickNavBtn: {
    padding: "4px 8px",
    background: "transparent",
    border: "none",
    borderBottomWidth: 2,
    borderBottomStyle: "solid" as const,
    borderBottomColor: "transparent",
    cursor: "pointer",
    fontFamily: "inherit",
    fontSize: 9,
    fontWeight: 600,
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
  },
};

const btnStyles: Record<string, React.CSSProperties> = {
  helpBtn: {
    width: 28,
    height: 28,
    borderRadius: "50%",
    background: "#2a2a2a",
    border: "1px solid #333",
    color: "#a0a0a0",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 700,
    fontFamily: "inherit",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
};
