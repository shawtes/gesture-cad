/**
 * One Euro Filter — the industry standard for smoothing hand tracking input.
 *
 * Adapts cutoff frequency to movement speed:
 * - Low jitter when hand is still (low cutoff = heavy smoothing)
 * - Low latency when hand moves fast (high cutoff = light smoothing)
 *
 * Reference: https://gery.casiez.net/1euro/
 * Used by: Ultraleap, Meta Quest, Monado OpenXR, collidingScopes
 */

class LowPassFilter {
  private y: number | null = null;
  private s: number | null = null;

  filter(value: number, alpha: number): number {
    if (this.s === null) {
      this.s = value;
    } else {
      this.s = alpha * value + (1 - alpha) * this.s;
    }
    this.y = value;
    return this.s;
  }

  lastValue(): number | null {
    return this.y;
  }

  reset(): void {
    this.y = null;
    this.s = null;
  }
}

export class OneEuroFilter {
  private freq: number;
  private minCutOff: number;
  private beta: number;
  private dCutOff: number;
  private xFilter = new LowPassFilter();
  private dxFilter = new LowPassFilter();
  private lastTime: number | null = null;

  /**
   * @param freq - Expected signal frequency (camera FPS, typically 30)
   * @param minCutOff - Minimum cutoff frequency. Lower = smoother when still, but more lag. (1.0 recommended for hand tracking)
   * @param beta - Speed coefficient. Higher = less lag when moving fast, but more jitter. (0.007 recommended)
   * @param dCutOff - Derivative cutoff frequency. Rarely needs changing. (1.0)
   */
  constructor(freq = 30, minCutOff = 1.0, beta = 0.007, dCutOff = 1.0) {
    this.freq = freq;
    this.minCutOff = minCutOff;
    this.beta = beta;
    this.dCutOff = dCutOff;
  }

  private alpha(cutOff: number): number {
    const te = 1.0 / this.freq;
    const tau = 1.0 / (2 * Math.PI * cutOff);
    return 1.0 / (1.0 + tau / te);
  }

  filter(x: number, timestamp?: number): number {
    if (this.lastTime !== null && timestamp !== undefined) {
      const dt = timestamp - this.lastTime;
      if (dt > 0) {
        this.freq = 1.0 / dt;
      }
    }
    this.lastTime = timestamp ?? null;

    const prev = this.xFilter.lastValue();
    const dx = prev === null ? 0 : (x - prev) * this.freq;
    const edx = this.dxFilter.filter(dx, this.alpha(this.dCutOff));
    const cutOff = this.minCutOff + this.beta * Math.abs(edx);
    return this.xFilter.filter(x, this.alpha(cutOff));
  }

  reset(): void {
    this.xFilter.reset();
    this.dxFilter.reset();
    this.lastTime = null;
  }
}

/**
 * Paired filter for 2D hand position (x, y).
 */
export class OneEuroFilter2D {
  private filterX: OneEuroFilter;
  private filterY: OneEuroFilter;

  constructor(freq = 30, minCutOff = 1.0, beta = 0.007) {
    this.filterX = new OneEuroFilter(freq, minCutOff, beta);
    this.filterY = new OneEuroFilter(freq, minCutOff, beta);
  }

  filter(x: number, y: number, timestamp?: number): { x: number; y: number } {
    return {
      x: this.filterX.filter(x, timestamp),
      y: this.filterY.filter(y, timestamp),
    };
  }

  reset(): void {
    this.filterX.reset();
    this.filterY.reset();
  }
}
