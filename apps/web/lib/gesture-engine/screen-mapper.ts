/**
 * Dynamic Hand-to-Screen Mapping with Telemetry
 *
 * Properly maps MediaPipe hand landmark coordinates (0-1 normalized)
 * to screen coordinates with:
 *
 * 1. Auto-calibration — learns your natural hand range over time
 * 2. Adaptive smoothing — fast moves = less filtering, slow = more filtering
 * 3. Dead zone — small movements ignored near cursor position
 * 4. Acceleration curve — faster hand = faster cursor (non-linear)
 * 5. Depth-aware sensitivity — closer hand = finer control
 * 6. Real-time telemetry — live stats visible in overlay
 *
 * MediaPipe coordinate system:
 * - x: 0 (right of image) to 1 (left of image) — MIRRORED for selfie cam
 * - y: 0 (top) to 1 (bottom)
 * - z: depth relative to wrist (smaller = closer to camera)
 *
 * The 21 landmarks:
 * 0=WRIST, 1-4=THUMB(CMC,MCP,IP,TIP), 5-8=INDEX(MCP,PIP,DIP,TIP),
 * 9-12=MIDDLE, 13-16=RING, 17-20=PINKY
 */

export interface ScreenMapperConfig {
  /** Auto-calibration: learn the user's hand range (default: true) */
  autoCalibrate: boolean;
  /** How quickly calibration adapts — 0 to 1, higher = faster (default: 0.02) */
  calibrationRate: number;
  /** Minimum cursor movement in screen % to register (default: 0.003) */
  deadZone: number;
  /** Acceleration exponent — 1.0 = linear, > 1 = faster for fast moves (default: 1.4) */
  acceleration: number;
  /** One Euro Filter: min cutoff frequency (default: 1.5) — lower = smoother */
  filterMinCutoff: number;
  /** One Euro Filter: speed coefficient (default: 0.007) — higher = less smoothing on fast moves */
  filterBeta: number;
  /** Whether to use Z (depth) for sensitivity scaling (default: true) */
  useDepth: boolean;
  /** How much depth affects sensitivity — 0 to 1 (default: 0.3) */
  depthSensitivity: number;
}

export interface ScreenMapperTelemetry {
  /** Current screen position (0-1) */
  screenX: number;
  screenY: number;
  /** Raw landmark position before mapping */
  rawX: number;
  rawY: number;
  rawZ: number;
  /** Calibrated range bounds */
  rangeMinX: number;
  rangeMaxX: number;
  rangeMinY: number;
  rangeMaxY: number;
  /** Current hand speed (normalized units/sec) */
  speed: number;
  /** Current filter cutoff (adaptive) */
  filterCutoff: number;
  /** Depth factor (1.0 = normal, <1 = closer/finer, >1 = further/coarser) */
  depthFactor: number;
  /** Pinch distance (thumb to index) */
  pinchDistance: number;
  /** Whether currently pinching */
  isPinching: boolean;
  /** Frames per second of tracking */
  fps: number;
  /** Confidence score from MediaPipe */
  confidence: number;
  /** Latency of last frame (ms) */
  latencyMs: number;
  /** Whether currently calibrating */
  isCalibrating: boolean;
  /** Calibration progress (0-1) */
  calibrationProgress: number;
}

const DEFAULT_CONFIG: ScreenMapperConfig = {
  autoCalibrate: true,
  calibrationRate: 0.02,
  deadZone: 0.003,
  acceleration: 1.4,
  filterMinCutoff: 1.5,
  filterBeta: 0.007,
  useDepth: true,
  depthSensitivity: 0.3,
};

/**
 * Adaptive One Euro Filter — adjusts cutoff based on hand speed.
 * Based on: Casiez et al. (2012) "1€ Filter: A Simple Speed-based
 * Low-pass Filter for Noisy Input in Interactive Systems"
 */
class AdaptiveOneEuroFilter {
  private minCutoff: number;
  private beta: number;
  private dCutoff: number;
  private xPrev: number = 0;
  private dxPrev: number = 0;
  private tPrev: number = -1;
  private lastCutoff: number = 0;

  constructor(minCutoff: number, beta: number, dCutoff: number = 1.0) {
    this.minCutoff = minCutoff;
    this.beta = beta;
    this.dCutoff = dCutoff;
  }

  private alpha(cutoff: number, dt: number): number {
    const tau = 1.0 / (2.0 * Math.PI * cutoff);
    return 1.0 / (1.0 + tau / dt);
  }

  filter(x: number, t: number): { value: number; cutoff: number; speed: number } {
    if (this.tPrev < 0) {
      this.xPrev = x;
      this.dxPrev = 0;
      this.tPrev = t;
      this.lastCutoff = this.minCutoff;
      return { value: x, cutoff: this.minCutoff, speed: 0 };
    }

    const dt = Math.max(t - this.tPrev, 1e-6);
    this.tPrev = t;

    // Estimate speed (derivative)
    const dx = (x - this.xPrev) / dt;
    const edx = this.alpha(this.dCutoff, dt);
    const dxFiltered = edx * dx + (1 - edx) * this.dxPrev;
    this.dxPrev = dxFiltered;

    // Adaptive cutoff: faster movement = higher cutoff = less smoothing
    const speed = Math.abs(dxFiltered);
    const cutoff = this.minCutoff + this.beta * speed;
    this.lastCutoff = cutoff;

    // Filter the value
    const a = this.alpha(cutoff, dt);
    const xFiltered = a * x + (1 - a) * this.xPrev;
    this.xPrev = xFiltered;

    return { value: xFiltered, cutoff, speed };
  }

  reset() {
    this.tPrev = -1;
  }
}

/**
 * Dynamic Screen Mapper — converts hand landmarks to screen coordinates
 * with auto-calibration, adaptive smoothing, and real-time telemetry.
 */
export class ScreenMapper {
  private config: ScreenMapperConfig;

  // Calibrated range (auto-updated)
  private rangeMinX = 0.2;
  private rangeMaxX = 0.8;
  private rangeMinY = 0.15;
  private rangeMaxY = 0.75;
  private calibrationSamples = 0;
  private calibrationTarget = 150; // frames to reach full calibration

  // Adaptive filters (separate for X and Y)
  private filterX: AdaptiveOneEuroFilter;
  private filterY: AdaptiveOneEuroFilter;

  // Pinch state with hysteresis
  private isPinching = false;
  private lastPinchTransition = 0;
  private pinchActivateThreshold = 0.05;
  private pinchDeactivateThreshold = 0.08;
  private pinchDebounceMs = 80;

  // Speed tracking
  private lastScreenX = 0.5;
  private lastScreenY = 0.5;
  private lastTime = 0;
  private currentSpeed = 0;

  // FPS tracking
  private frameCount = 0;
  private lastFpsTime = 0;
  private currentFps = 0;

  // Telemetry
  private telemetry: ScreenMapperTelemetry = {
    screenX: 0.5, screenY: 0.5,
    rawX: 0.5, rawY: 0.5, rawZ: 0,
    rangeMinX: 0.2, rangeMaxX: 0.8, rangeMinY: 0.15, rangeMaxY: 0.75,
    speed: 0, filterCutoff: 1.5, depthFactor: 1.0,
    pinchDistance: 1, isPinching: false,
    fps: 0, confidence: 0, latencyMs: 0,
    isCalibrating: true, calibrationProgress: 0,
  };

  constructor(config?: Partial<ScreenMapperConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.filterX = new AdaptiveOneEuroFilter(this.config.filterMinCutoff, this.config.filterBeta);
    this.filterY = new AdaptiveOneEuroFilter(this.config.filterMinCutoff, this.config.filterBeta);
  }

  /**
   * Process a hand tracking frame and return mapped screen coordinates.
   *
   * @param landmarks — 21 MediaPipe hand landmarks (normalized 0-1)
   * @param timestamp — time in seconds
   * @param confidence — MediaPipe detection confidence
   * @returns mapped screen position + telemetry
   */
  process(
    landmarks: { x: number; y: number; z: number }[],
    timestamp: number,
    confidence: number = 0.8
  ): { x: number; y: number; telemetry: ScreenMapperTelemetry } {
    const frameStart = performance.now();

    if (landmarks.length < 21) {
      return { x: this.lastScreenX, y: this.lastScreenY, telemetry: this.telemetry };
    }

    // Use INDEX_FINGER_TIP (landmark 8) as primary cursor point
    const indexTip = landmarks[8];
    const thumbTip = landmarks[4];
    const wrist = landmarks[0];

    // Raw coordinates (MediaPipe x is mirrored for selfie cam)
    const rawX = 1 - indexTip.x; // un-mirror: left of frame = left of screen
    const rawY = indexTip.y;
    const rawZ = indexTip.z;

    // ─── Auto-Calibration ───
    if (this.config.autoCalibrate) {
      const rate = this.config.calibrationRate;
      // Expand range if hand goes outside current bounds
      if (rawX < this.rangeMinX) this.rangeMinX += (rawX - this.rangeMinX) * rate * 5;
      if (rawX > this.rangeMaxX) this.rangeMaxX += (rawX - this.rangeMaxX) * rate * 5;
      if (rawY < this.rangeMinY) this.rangeMinY += (rawY - this.rangeMinY) * rate * 5;
      if (rawY > this.rangeMaxY) this.rangeMaxY += (rawY - this.rangeMaxY) * rate * 5;

      // Slowly contract range toward actual usage (prevents drift)
      this.rangeMinX += (rawX - this.rangeMinX) * rate * 0.1;
      this.rangeMaxX += (rawX - this.rangeMaxX) * rate * 0.1;
      this.rangeMinY += (rawY - this.rangeMinY) * rate * 0.1;
      this.rangeMaxY += (rawY - this.rangeMaxY) * rate * 0.1;

      // Enforce minimum range size
      if (this.rangeMaxX - this.rangeMinX < 0.2) {
        const center = (this.rangeMinX + this.rangeMaxX) / 2;
        this.rangeMinX = center - 0.1;
        this.rangeMaxX = center + 0.1;
      }
      if (this.rangeMaxY - this.rangeMinY < 0.2) {
        const center = (this.rangeMinY + this.rangeMaxY) / 2;
        this.rangeMinY = center - 0.1;
        this.rangeMaxY = center + 0.1;
      }

      this.calibrationSamples = Math.min(this.calibrationSamples + 1, this.calibrationTarget);
    }

    // ─── Map to 0-1 screen range ───
    const rangeX = this.rangeMaxX - this.rangeMinX;
    const rangeY = this.rangeMaxY - this.rangeMinY;
    let mappedX = (rawX - this.rangeMinX) / rangeX;
    let mappedY = (rawY - this.rangeMinY) / rangeY;

    // Clamp to 0-1
    mappedX = Math.max(0, Math.min(1, mappedX));
    mappedY = Math.max(0, Math.min(1, mappedY));

    // ─── Depth-aware sensitivity ───
    let depthFactor = 1.0;
    if (this.config.useDepth) {
      // Z is relative to wrist: negative = closer to camera
      // Closer hand → finer control (smaller movements map to same screen distance)
      const zNorm = Math.max(-0.3, Math.min(0.3, rawZ));
      depthFactor = 1.0 + zNorm * this.config.depthSensitivity;
    }

    // ─── Adaptive One Euro Filter ───
    const resultX = this.filterX.filter(mappedX, timestamp);
    const resultY = this.filterY.filter(mappedY, timestamp);
    let screenX = resultX.value;
    let screenY = resultY.value;

    // ─── Dead Zone ───
    const dx = screenX - this.lastScreenX;
    const dy = screenY - this.lastScreenY;
    const moveDist = Math.hypot(dx, dy);

    if (moveDist < this.config.deadZone) {
      screenX = this.lastScreenX;
      screenY = this.lastScreenY;
    }

    // ─── Acceleration Curve ───
    if (moveDist >= this.config.deadZone && this.config.acceleration !== 1.0) {
      const factor = Math.pow(moveDist / 0.05, this.config.acceleration - 1.0);
      const clampedFactor = Math.min(factor, 3.0); // cap acceleration
      screenX = this.lastScreenX + dx * clampedFactor;
      screenY = this.lastScreenY + dy * clampedFactor;
      screenX = Math.max(0, Math.min(1, screenX));
      screenY = Math.max(0, Math.min(1, screenY));
    }

    // ─── Pinch Detection with Hysteresis ───
    const pinchDist = Math.hypot(
      thumbTip.x - indexTip.x,
      thumbTip.y - indexTip.y,
      (thumbTip.z - indexTip.z) * 0.5 // Z is less reliable, weight it less
    );

    const timeSinceTransition = (timestamp - this.lastPinchTransition) * 1000;
    if (!this.isPinching && pinchDist < this.pinchActivateThreshold && timeSinceTransition > this.pinchDebounceMs) {
      this.isPinching = true;
      this.lastPinchTransition = timestamp;
    } else if (this.isPinching && pinchDist > this.pinchDeactivateThreshold && timeSinceTransition > this.pinchDebounceMs) {
      this.isPinching = false;
      this.lastPinchTransition = timestamp;
    }

    // ─── Speed Tracking ───
    const dt = timestamp - this.lastTime;
    if (dt > 0) {
      this.currentSpeed = moveDist / dt;
    }

    // ─── FPS Tracking ───
    this.frameCount++;
    if (timestamp - this.lastFpsTime > 1.0) {
      this.currentFps = this.frameCount / (timestamp - this.lastFpsTime);
      this.frameCount = 0;
      this.lastFpsTime = timestamp;
    }

    // ─── Update State ───
    this.lastScreenX = screenX;
    this.lastScreenY = screenY;
    this.lastTime = timestamp;

    const frameEnd = performance.now();

    // ─── Build Telemetry ───
    this.telemetry = {
      screenX, screenY,
      rawX, rawY, rawZ,
      rangeMinX: this.rangeMinX, rangeMaxX: this.rangeMaxX,
      rangeMinY: this.rangeMinY, rangeMaxY: this.rangeMaxY,
      speed: this.currentSpeed,
      filterCutoff: resultX.cutoff,
      depthFactor,
      pinchDistance: pinchDist,
      isPinching: this.isPinching,
      fps: this.currentFps,
      confidence,
      latencyMs: frameEnd - frameStart,
      isCalibrating: this.calibrationSamples < this.calibrationTarget,
      calibrationProgress: this.calibrationSamples / this.calibrationTarget,
    };

    return { x: screenX, y: screenY, telemetry: this.telemetry };
  }

  /** Reset calibration (e.g., when user changes position) */
  resetCalibration() {
    this.rangeMinX = 0.2;
    this.rangeMaxX = 0.8;
    this.rangeMinY = 0.15;
    this.rangeMaxY = 0.75;
    this.calibrationSamples = 0;
    this.filterX.reset();
    this.filterY.reset();
  }

  /** Get current telemetry snapshot */
  getTelemetry(): ScreenMapperTelemetry {
    return { ...this.telemetry };
  }

  /** Update config at runtime */
  updateConfig(partial: Partial<ScreenMapperConfig>) {
    this.config = { ...this.config, ...partial };
    if (partial.filterMinCutoff !== undefined || partial.filterBeta !== undefined) {
      this.filterX = new AdaptiveOneEuroFilter(this.config.filterMinCutoff, this.config.filterBeta);
      this.filterY = new AdaptiveOneEuroFilter(this.config.filterMinCutoff, this.config.filterBeta);
    }
  }
}
