"use client";

import { useState, useEffect } from "react";

const TUTORIAL_DISMISSED_KEY = "gesture-cad-tutorial-dismissed";

interface Step {
  title: string;
  description: string;
  icon: string;
  gesture?: string;
}

const steps: Step[] = [
  {
    title: "Welcome to GestureCAD",
    description:
      "A CAD application you control with hand gestures. Use your webcam or mouse to create 2D sketches on the ground plane.",
    icon: "◈",
  },
  {
    title: "Enable Hand Tracking",
    description:
      'Click "Enable Hand Tracking" (bottom-left) to activate your webcam. MediaPipe tracks 21 hand landmarks at 30-60 FPS.',
    icon: "🖐️",
  },
  {
    title: "Point — Draw / Cursor",
    description:
      "Extend your index finger to activate the Point tool. Your fingertip controls a pink 3D cursor on the ground plane.",
    icon: "☝️",
    gesture: "point → draw tool",
  },
  {
    title: "Pinch — Confirm / Click",
    description:
      "Touch your thumb to your index finger to 'click' at the cursor position. This places points, starts lines, or confirms operations.",
    icon: "🤏",
    gesture: "pinch → click action",
  },
  {
    title: "Peace Sign — Line Tool",
    description:
      "Hold up index + middle finger to activate Line. Pinch once to set the start point, move your hand, pinch again to complete the line.",
    icon: "✌️",
    gesture: "peace → line tool",
  },
  {
    title: "Three Fingers — Circle Tool",
    description:
      "Extend index + middle + ring fingers for Circle. Pinch the center point, then pinch at the radius distance.",
    icon: "🖖",
    gesture: "3 fingers → circle tool",
  },
  {
    title: "L-Shape — Rectangle Tool",
    description:
      "Form an L with your thumb + index finger for Rectangle. Pinch two opposite corners to draw the rectangle.",
    icon: "📐",
    gesture: "L-shape → rect tool",
  },
  {
    title: "Fist — Select",
    description: "Make a fist to switch to Select mode. This disables drawing and re-enables viewport orbit/pan.",
    icon: "✊",
    gesture: "fist → select",
  },
  {
    title: "Open Palm — Pan",
    description: "Show your open palm to switch to Pan mode for viewport navigation.",
    icon: "✋",
    gesture: "open palm → pan",
  },
  {
    title: "Undo / Redo",
    description:
      "Use Ctrl+Z to undo and Ctrl+Y to redo. Swipe gestures for undo/redo coming in Sprint 4. Press Escape to return to Select.",
    icon: "↩️",
  },
  {
    title: "Mouse Works Too!",
    description:
      "Everything works with mouse clicks as well. Select a tool from the toolbar, then click on the 3D viewport to draw. Both input methods work simultaneously.",
    icon: "🖱️",
  },
];

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

  const step = steps[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === steps.length - 1;

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(TUTORIAL_DISMISSED_KEY, "true");
  };

  return (
    <div style={styles.backdrop} onClick={dismiss}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Progress dots */}
        <div style={styles.progress}>
          {steps.map((_, i) => (
            <div
              key={i}
              style={{
                ...styles.dot,
                background: i === currentStep ? "#3b82f6" : i < currentStep ? "#60a5fa" : "#333",
              }}
              onClick={() => setCurrentStep(i)}
            />
          ))}
        </div>

        {/* Step content */}
        <div style={styles.icon}>{step.icon}</div>
        <h2 style={styles.title}>{step.title}</h2>
        <p style={styles.description}>{step.description}</p>

        {step.gesture && (
          <div style={styles.gestureBadge}>
            {step.gesture}
          </div>
        )}

        {/* Navigation */}
        <div style={styles.nav}>
          <button
            style={styles.skipBtn}
            onClick={dismiss}
          >
            Skip Tutorial
          </button>
          <div style={styles.navRight}>
            {!isFirst && (
              <button
                style={styles.navBtn}
                onClick={() => setCurrentStep((s) => s - 1)}
              >
                Back
              </button>
            )}
            {isLast ? (
              <button style={styles.startBtn} onClick={dismiss}>
                Start Building
              </button>
            ) : (
              <button
                style={styles.startBtn}
                onClick={() => setCurrentStep((s) => s + 1)}
              >
                Next ({currentStep + 1}/{steps.length})
              </button>
            )}
          </div>
        </div>

        {/* Step counter */}
        <div style={styles.counter}>
          {currentStep + 1} of {steps.length}
        </div>
      </div>
    </div>
  );
}

/** Button to re-open tutorial from toolbar */
export function TutorialButton() {
  const [show, setShow] = useState(false);

  return (
    <>
      <button
        style={btnStyles.helpBtn}
        onClick={() => {
          localStorage.removeItem(TUTORIAL_DISMISSED_KEY);
          setShow(true);
        }}
        title="Show Tutorial"
      >
        ?
      </button>
      {show && (
        <TutorialOverlayControlled onClose={() => setShow(false)} />
      )}
    </>
  );
}

function TutorialOverlayControlled({ onClose }: { onClose: () => void }) {
  const [currentStep, setCurrentStep] = useState(0);

  const step = steps[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === steps.length - 1;

  return (
    <div style={styles.backdrop} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.progress}>
          {steps.map((_, i) => (
            <div
              key={i}
              style={{
                ...styles.dot,
                background: i === currentStep ? "#3b82f6" : i < currentStep ? "#60a5fa" : "#333",
              }}
              onClick={() => setCurrentStep(i)}
            />
          ))}
        </div>

        <div style={styles.icon}>{step.icon}</div>
        <h2 style={styles.title}>{step.title}</h2>
        <p style={styles.description}>{step.description}</p>

        {step.gesture && (
          <div style={styles.gestureBadge}>{step.gesture}</div>
        )}

        <div style={styles.nav}>
          <button style={styles.skipBtn} onClick={onClose}>
            Close
          </button>
          <div style={styles.navRight}>
            {!isFirst && (
              <button
                style={styles.navBtn}
                onClick={() => setCurrentStep((s) => s - 1)}
              >
                Back
              </button>
            )}
            {isLast ? (
              <button style={styles.startBtn} onClick={onClose}>
                Got It
              </button>
            ) : (
              <button
                style={styles.startBtn}
                onClick={() => setCurrentStep((s) => s + 1)}
              >
                Next ({currentStep + 1}/{steps.length})
              </button>
            )}
          </div>
        </div>

        <div style={styles.counter}>
          {currentStep + 1} of {steps.length}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(0, 0, 0, 0.75)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    backdropFilter: "blur(4px)",
  },
  modal: {
    background: "#1a1a1a",
    border: "1px solid #2a2a2a",
    borderRadius: 16,
    padding: "32px 40px",
    maxWidth: 480,
    width: "90%",
    textAlign: "center",
    position: "relative",
    boxShadow: "0 24px 48px rgba(0,0,0,0.5)",
  },
  progress: {
    display: "flex",
    justifyContent: "center",
    gap: 6,
    marginBottom: 24,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    cursor: "pointer",
    transition: "background 0.2s",
  },
  icon: {
    fontSize: 48,
    marginBottom: 16,
    lineHeight: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    color: "#e5e5e5",
    margin: "0 0 12px 0",
    letterSpacing: "-0.02em",
  },
  description: {
    fontSize: 14,
    lineHeight: 1.6,
    color: "#a0a0a0",
    margin: "0 0 20px 0",
  },
  gestureBadge: {
    display: "inline-block",
    padding: "4px 12px",
    background: "#1e3a5f",
    border: "1px solid #3b82f6",
    borderRadius: 20,
    color: "#93c5fd",
    fontSize: 12,
    fontWeight: 500,
    marginBottom: 24,
    fontFamily: "inherit",
  },
  nav: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  navRight: {
    display: "flex",
    gap: 8,
  },
  skipBtn: {
    padding: "8px 16px",
    background: "transparent",
    border: "none",
    color: "#666",
    cursor: "pointer",
    fontSize: 13,
    fontFamily: "inherit",
    borderRadius: 6,
  },
  navBtn: {
    padding: "8px 16px",
    background: "#2a2a2a",
    border: "1px solid #333",
    color: "#a0a0a0",
    cursor: "pointer",
    fontSize: 13,
    fontFamily: "inherit",
    borderRadius: 6,
  },
  startBtn: {
    padding: "8px 20px",
    background: "#3b82f6",
    border: "none",
    color: "#fff",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
    fontFamily: "inherit",
    borderRadius: 6,
  },
  counter: {
    position: "absolute",
    bottom: 12,
    left: "50%",
    transform: "translateX(-50%)",
    fontSize: 11,
    color: "#444",
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
