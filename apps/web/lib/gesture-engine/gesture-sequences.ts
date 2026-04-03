/**
 * Gesture Sequences — detects temporal gesture patterns.
 *
 * - Swipe: fast directional movement with open palm
 * - Pinch+Pull: pinch then move vertically → interactive extrude
 * - Tap: quick pinch-release without drag
 * - Double-tap: two quick taps in succession
 */

import type { TouchState, StaticGesture } from "./types";

export type GestureSequenceType =
  | "tap"
  | "double_tap"
  | "pinch_pull_up"
  | "pinch_pull_down"
  | "swipe_left"
  | "swipe_right"
  | "swipe_up"
  | "swipe_down"
  | "long_press"
  | "none";

export interface GestureSequenceEvent {
  type: GestureSequenceType;
  /** Magnitude of the gesture (e.g., pull distance, swipe speed) */
  magnitude: number;
  timestamp: number;
}

interface SequenceState {
  /** Time of last press */
  lastPressTime: number;
  /** Time of last release */
  lastReleaseTime: number;
  /** Position at press start */
  pressPosition: { x: number; y: number } | null;
  /** Number of quick taps in succession */
  tapCount: number;
  /** Timer for tap detection */
  tapTimer: ReturnType<typeof setTimeout> | null;
  /** Whether we're in a long press */
  isLongPress: boolean;
  /** Long press timer */
  longPressTimer: ReturnType<typeof setTimeout> | null;
}

const TAP_MAX_DURATION_MS = 200;        // Max time for press→release to count as tap
const DOUBLE_TAP_WINDOW_MS = 350;       // Max time between taps for double-tap
const LONG_PRESS_DURATION_MS = 600;     // Time to hold for long press
const TAP_MAX_MOVEMENT = 0.03;          // Max movement during tap (normalized)
const PULL_THRESHOLD = 0.04;            // Min vertical movement for pinch-pull

export type SequenceListener = (event: GestureSequenceEvent) => void;

export class GestureSequenceDetector {
  private state: SequenceState = {
    lastPressTime: 0,
    lastReleaseTime: 0,
    pressPosition: null,
    tapCount: 0,
    tapTimer: null,
    isLongPress: false,
    longPressTimer: null,
  };

  private listeners: SequenceListener[] = [];

  onSequence(listener: SequenceListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /**
   * Feed touch state transitions to detect sequences.
   */
  onStateChange(
    touchState: TouchState,
    position: { x: number; y: number } | null,
    timestamp: number
  ): void {
    switch (touchState) {
      case "press":
        this.handlePress(position, timestamp);
        break;

      case "drag":
        this.handleDrag(position, timestamp);
        break;

      case "release":
        this.handleRelease(position, timestamp);
        break;

      case "idle":
      case "hover":
        this.cancelLongPress();
        break;
    }
  }

  /**
   * Detect pinch+pull from vertical drag delta.
   * Returns the pull direction and distance.
   */
  detectPinchPull(
    dragDelta: { x: number; y: number } | null
  ): { direction: "up" | "down"; distance: number } | null {
    if (!dragDelta) return null;

    const verticalDist = Math.abs(dragDelta.y);
    if (verticalDist < PULL_THRESHOLD) return null;

    // Only trigger if vertical movement dominates horizontal
    if (verticalDist < Math.abs(dragDelta.x) * 1.5) return null;

    return {
      direction: dragDelta.y < 0 ? "up" : "down", // Screen Y is inverted
      distance: verticalDist,
    };
  }

  reset(): void {
    this.cancelLongPress();
    if (this.state.tapTimer) clearTimeout(this.state.tapTimer);
    this.state = {
      lastPressTime: 0,
      lastReleaseTime: 0,
      pressPosition: null,
      tapCount: 0,
      tapTimer: null,
      isLongPress: false,
      longPressTimer: null,
    };
  }

  destroy(): void {
    this.reset();
    this.listeners = [];
  }

  // ---------- Private ----------

  private handlePress(position: { x: number; y: number } | null, timestamp: number): void {
    this.state.lastPressTime = timestamp;
    this.state.pressPosition = position ? { ...position } : null;
    this.state.isLongPress = false;

    // Start long press timer
    this.cancelLongPress();
    this.state.longPressTimer = setTimeout(() => {
      this.state.isLongPress = true;
      this.emit({
        type: "long_press",
        magnitude: 1,
        timestamp: performance.now(),
      });
    }, LONG_PRESS_DURATION_MS);
  }

  private handleDrag(position: { x: number; y: number } | null, timestamp: number): void {
    // Cancel long press if we're dragging
    this.cancelLongPress();

    // Check for pinch-pull (vertical drag)
    if (position && this.state.pressPosition) {
      const dy = position.y - this.state.pressPosition.y;
      const dx = position.x - this.state.pressPosition.x;

      if (Math.abs(dy) > PULL_THRESHOLD && Math.abs(dy) > Math.abs(dx) * 1.5) {
        const type: GestureSequenceType = dy < 0 ? "pinch_pull_up" : "pinch_pull_down";
        this.emit({ type, magnitude: Math.abs(dy), timestamp });
      }
    }
  }

  private handleRelease(position: { x: number; y: number } | null, timestamp: number): void {
    this.cancelLongPress();

    const pressDuration = timestamp - this.state.lastPressTime;

    // Check if this was a tap (short press, minimal movement)
    if (pressDuration < TAP_MAX_DURATION_MS) {
      const movement = position && this.state.pressPosition
        ? Math.hypot(
            position.x - this.state.pressPosition.x,
            position.y - this.state.pressPosition.y
          )
        : 0;

      if (movement < TAP_MAX_MOVEMENT) {
        this.state.tapCount++;

        // Check for double tap
        if (this.state.tapCount >= 2) {
          if (this.state.tapTimer) clearTimeout(this.state.tapTimer);
          this.state.tapCount = 0;
          this.emit({ type: "double_tap", magnitude: 1, timestamp });
          return;
        }

        // Wait for potential second tap
        if (this.state.tapTimer) clearTimeout(this.state.tapTimer);
        this.state.tapTimer = setTimeout(() => {
          if (this.state.tapCount === 1) {
            this.emit({ type: "tap", magnitude: 1, timestamp: performance.now() });
          }
          this.state.tapCount = 0;
        }, DOUBLE_TAP_WINDOW_MS);
      }
    }

    this.state.lastReleaseTime = timestamp;
    this.state.pressPosition = null;
  }

  private cancelLongPress(): void {
    if (this.state.longPressTimer) {
      clearTimeout(this.state.longPressTimer);
      this.state.longPressTimer = null;
    }
  }

  private emit(event: GestureSequenceEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }
}
