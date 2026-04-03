/**
 * Multi-Hand Resolver — detects two-hand gestures for viewport control.
 *
 * Two-hand pinch: both hands pinching, distance change → zoom
 * Two-hand rotate: both hands pinching, angle change → orbit
 * Two-hand scale: both hands pinching, distance change → scale selection
 */

import type { TrackedHand } from "./types";

export interface TwoHandState {
  /** Distance between the two index fingertips */
  distance: number;
  /** Angle between the two index fingertips (radians) */
  angle: number;
  /** Midpoint between the two fingertips (normalized 0-1) */
  midpoint: { x: number; y: number };
  /** Both hands are pinching */
  bothPinching: boolean;
}

export interface TwoHandDelta {
  /** Change in distance (positive = spreading apart = zoom in) */
  distanceDelta: number;
  /** Change in angle (radians, positive = clockwise rotation) */
  angleDelta: number;
  /** Change in midpoint (for pan) */
  midpointDelta: { x: number; y: number };
  /** Zoom factor (>1 = zoom in, <1 = zoom out) */
  zoomFactor: number;
  /** Rotation in degrees */
  rotationDegrees: number;
}

export type TwoHandGesture = "zoom" | "rotate" | "pan" | "none";

/** Minimum distance change to trigger zoom (normalized screen units) */
const ZOOM_THRESHOLD = 0.01;
/** Minimum angle change to trigger rotate (radians) */
const ROTATE_THRESHOLD = 0.03;
/** Minimum midpoint change to trigger pan */
const PAN_THRESHOLD = 0.01;

export class MultiHandResolver {
  private prevState: TwoHandState | null = null;

  /**
   * Update with both tracked hands. Returns delta if both are pinching.
   */
  update(dominant: TrackedHand | null, nonDominant: TrackedHand | null): TwoHandDelta | null {
    if (!dominant || !nonDominant) {
      this.prevState = null;
      return null;
    }

    const bothPinching = dominant.isPinching && nonDominant.isPinching;

    const p1 = dominant.screenPosition;
    const p2 = nonDominant.screenPosition;

    const currentState: TwoHandState = {
      distance: Math.hypot(p1.x - p2.x, p1.y - p2.y),
      angle: Math.atan2(p1.y - p2.y, p1.x - p2.x),
      midpoint: { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 },
      bothPinching,
    };

    if (!bothPinching) {
      this.prevState = currentState;
      return null;
    }

    if (!this.prevState || !this.prevState.bothPinching) {
      this.prevState = currentState;
      return null;
    }

    const delta: TwoHandDelta = {
      distanceDelta: currentState.distance - this.prevState.distance,
      angleDelta: normalizeAngle(currentState.angle - this.prevState.angle),
      midpointDelta: {
        x: currentState.midpoint.x - this.prevState.midpoint.x,
        y: currentState.midpoint.y - this.prevState.midpoint.y,
      },
      zoomFactor: this.prevState.distance > 0.001
        ? currentState.distance / this.prevState.distance
        : 1,
      rotationDegrees: normalizeAngle(currentState.angle - this.prevState.angle) * (180 / Math.PI),
    };

    this.prevState = currentState;
    return delta;
  }

  /**
   * Classify the dominant two-hand gesture from a delta.
   */
  classify(delta: TwoHandDelta): TwoHandGesture {
    const absDist = Math.abs(delta.distanceDelta);
    const absAngle = Math.abs(delta.angleDelta);
    const absPan = Math.hypot(delta.midpointDelta.x, delta.midpointDelta.y);

    // Priority: zoom > rotate > pan
    if (absDist > ZOOM_THRESHOLD && absDist > absAngle * 2) {
      return "zoom";
    }
    if (absAngle > ROTATE_THRESHOLD) {
      return "rotate";
    }
    if (absPan > PAN_THRESHOLD) {
      return "pan";
    }
    return "none";
  }

  /** Get the current two-hand state (for display) */
  getCurrentState(): TwoHandState | null {
    return this.prevState;
  }

  reset(): void {
    this.prevState = null;
  }
}

/** Normalize angle to [-PI, PI] */
function normalizeAngle(angle: number): number {
  while (angle > Math.PI) angle -= Math.PI * 2;
  while (angle < -Math.PI) angle += Math.PI * 2;
  return angle;
}
