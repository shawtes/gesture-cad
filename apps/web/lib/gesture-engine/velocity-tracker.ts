/**
 * Velocity tracker for hand movement.
 * Maintains a sliding window of positions to compute velocity and acceleration.
 * Used for swipe detection and smooth drag interpolation.
 */

export interface VelocityData {
  /** Current velocity in screen units per second */
  velocity: { x: number; y: number };
  /** Current acceleration in screen units per second squared */
  acceleration: { x: number; y: number };
  /** Speed (magnitude of velocity) */
  speed: number;
  /** Direction angle in radians (0 = right, PI/2 = up) */
  direction: number;
}

interface PositionSample {
  x: number;
  y: number;
  timestamp: number;
}

const MAX_SAMPLES = 10;
const MAX_SAMPLE_AGE_MS = 200;
const SWIPE_SPEED_THRESHOLD = 1.5;    // Screen units per second
const SWIPE_MIN_DISTANCE = 0.08;      // Minimum distance for swipe

export type SwipeDirection = "left" | "right" | "up" | "down" | null;

export class VelocityTracker {
  private samples: PositionSample[] = [];
  private lastVelocity: { x: number; y: number } = { x: 0, y: 0 };

  /** Add a new position sample */
  addSample(x: number, y: number, timestamp: number): void {
    this.samples.push({ x, y, timestamp });

    // Trim old samples
    while (this.samples.length > MAX_SAMPLES) {
      this.samples.shift();
    }

    // Remove stale samples
    const cutoff = timestamp - MAX_SAMPLE_AGE_MS;
    while (this.samples.length > 0 && this.samples[0].timestamp < cutoff) {
      this.samples.shift();
    }
  }

  /** Compute current velocity and acceleration */
  compute(): VelocityData {
    if (this.samples.length < 2) {
      return {
        velocity: { x: 0, y: 0 },
        acceleration: { x: 0, y: 0 },
        speed: 0,
        direction: 0,
      };
    }

    // Use weighted average of recent deltas for smooth velocity
    let vx = 0;
    let vy = 0;
    let totalWeight = 0;

    for (let i = 1; i < this.samples.length; i++) {
      const prev = this.samples[i - 1];
      const curr = this.samples[i];
      const dt = (curr.timestamp - prev.timestamp) / 1000;
      if (dt <= 0) continue;

      const weight = i; // More recent samples get higher weight
      vx += ((curr.x - prev.x) / dt) * weight;
      vy += ((curr.y - prev.y) / dt) * weight;
      totalWeight += weight;
    }

    if (totalWeight > 0) {
      vx /= totalWeight;
      vy /= totalWeight;
    }

    // Compute acceleration from velocity change
    const ax = (vx - this.lastVelocity.x);
    const ay = (vy - this.lastVelocity.y);
    this.lastVelocity = { x: vx, y: vy };

    const speed = Math.hypot(vx, vy);
    const direction = Math.atan2(-vy, vx); // -vy because screen Y is inverted

    return {
      velocity: { x: vx, y: vy },
      acceleration: { x: ax, y: ay },
      speed,
      direction,
    };
  }

  /** Detect if a swipe gesture occurred (fast directional movement) */
  detectSwipe(): SwipeDirection {
    if (this.samples.length < 3) return null;

    const first = this.samples[0];
    const last = this.samples[this.samples.length - 1];
    const dx = last.x - first.x;
    const dy = last.y - first.y;
    const distance = Math.hypot(dx, dy);

    if (distance < SWIPE_MIN_DISTANCE) return null;

    const { speed } = this.compute();
    if (speed < SWIPE_SPEED_THRESHOLD) return null;

    // Determine dominant direction
    if (Math.abs(dx) > Math.abs(dy)) {
      return dx > 0 ? "right" : "left";
    } else {
      return dy > 0 ? "down" : "up";
    }
  }

  /** Reset all samples */
  reset(): void {
    this.samples = [];
    this.lastVelocity = { x: 0, y: 0 };
  }

  /** Get the number of tracked samples */
  get sampleCount(): number {
    return this.samples.length;
  }
}
