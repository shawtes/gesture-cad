/**
 * Touch State Machine for direct spatial manipulation.
 * States: idle → hover → press → drag → release → idle
 *
 * Pinch gesture acts as touch input with hysteresis to prevent jitter.
 */

import type { TouchState } from "./types";

/** Thresholds for pinch detection with hysteresis */
const PINCH_ON_THRESHOLD = 0.04;   // Distance to trigger pinch (tighter)
const PINCH_OFF_THRESHOLD = 0.07;  // Distance to release pinch (wider)
const DRAG_THRESHOLD = 0.02;       // Movement required to enter drag state
const RELEASE_COOLDOWN_MS = 50;    // Minimum time before re-entering press

export interface TouchStateData {
  state: TouchState;
  /** Position where press started (for drag delta calculation) */
  pressOrigin: { x: number; y: number } | null;
  /** Current position */
  currentPosition: { x: number; y: number } | null;
  /** Whether the hand is currently pinching (with hysteresis applied) */
  isPinching: boolean;
  /** Timestamp of last state transition */
  lastTransitionTime: number;
  /** Accumulated drag distance since press */
  dragDistance: number;
}

export type TouchStateTransition = {
  from: TouchState;
  to: TouchState;
  data: TouchStateData;
};

export type TouchStateListener = (transition: TouchStateTransition) => void;

export class TouchStateMachine {
  private data: TouchStateData = {
    state: "idle",
    pressOrigin: null,
    currentPosition: null,
    isPinching: false,
    lastTransitionTime: 0,
    dragDistance: 0,
  };

  private listeners: TouchStateListener[] = [];

  get state(): TouchState {
    return this.data.state;
  }

  get stateData(): Readonly<TouchStateData> {
    return this.data;
  }

  onTransition(listener: TouchStateListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /**
   * Update the state machine with new hand tracking data.
   * Call this every frame with the latest hand position and pinch distance.
   */
  update(
    position: { x: number; y: number } | null,
    pinchDistance: number,
    timestamp: number
  ): void {
    const prevState = this.data.state;

    // Apply pinch hysteresis
    if (this.data.isPinching) {
      if (pinchDistance > PINCH_OFF_THRESHOLD) {
        this.data.isPinching = false;
      }
    } else {
      if (pinchDistance < PINCH_ON_THRESHOLD) {
        this.data.isPinching = true;
      }
    }

    this.data.currentPosition = position;

    // State transitions
    switch (this.data.state) {
      case "idle":
        if (position) {
          this.transition("hover", timestamp);
        }
        break;

      case "hover":
        if (!position) {
          this.transition("idle", timestamp);
        } else if (this.data.isPinching) {
          this.data.pressOrigin = { ...position };
          this.data.dragDistance = 0;
          this.transition("press", timestamp);
        }
        break;

      case "press":
        if (!this.data.isPinching) {
          this.transition("release", timestamp);
        } else if (position && this.data.pressOrigin) {
          const dx = position.x - this.data.pressOrigin.x;
          const dy = position.y - this.data.pressOrigin.y;
          this.data.dragDistance = Math.hypot(dx, dy);
          if (this.data.dragDistance > DRAG_THRESHOLD) {
            this.transition("drag", timestamp);
          }
        }
        break;

      case "drag":
        if (!this.data.isPinching) {
          this.transition("release", timestamp);
        } else if (position && this.data.pressOrigin) {
          const dx = position.x - this.data.pressOrigin.x;
          const dy = position.y - this.data.pressOrigin.y;
          this.data.dragDistance = Math.hypot(dx, dy);
        }
        break;

      case "release":
        // Immediately transition back based on current state
        if (timestamp - this.data.lastTransitionTime > RELEASE_COOLDOWN_MS) {
          this.data.pressOrigin = null;
          this.data.dragDistance = 0;
          if (!position) {
            this.transition("idle", timestamp);
          } else {
            this.transition("hover", timestamp);
          }
        }
        break;
    }

    // Emit for continuous states (drag updates)
    if (this.data.state === "drag" && prevState === "drag") {
      this.emit({ from: "drag", to: "drag", data: { ...this.data } });
    }
  }

  /** Get the drag delta from press origin to current position */
  getDragDelta(): { x: number; y: number } | null {
    if (!this.data.pressOrigin || !this.data.currentPosition) return null;
    return {
      x: this.data.currentPosition.x - this.data.pressOrigin.x,
      y: this.data.currentPosition.y - this.data.pressOrigin.y,
    };
  }

  reset(): void {
    this.data = {
      state: "idle",
      pressOrigin: null,
      currentPosition: null,
      isPinching: false,
      lastTransitionTime: 0,
      dragDistance: 0,
    };
  }

  private transition(newState: TouchState, timestamp: number): void {
    const from = this.data.state;
    this.data.state = newState;
    this.data.lastTransitionTime = timestamp;
    this.emit({ from, to: newState, data: { ...this.data } });
  }

  private emit(transition: TouchStateTransition): void {
    for (const listener of this.listeners) {
      listener(transition);
    }
  }
}
