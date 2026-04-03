/**
 * Path tracer integration module.
 * Wraps a path-tracing concept (inspired by three-gpu-pathtracer) but works standalone.
 */

export interface PathTracerConfig {
  enabled: boolean;
  bounces: number;
  samples: number;
  resolution: number;
  environmentIntensity: number;
  filterGlossyFactor: number;
}

export const DEFAULT_PATH_TRACER_CONFIG: PathTracerConfig = {
  enabled: false,
  bounces: 3,
  samples: 256,
  resolution: 1,
  environmentIntensity: 1.0,
  filterGlossyFactor: 0.5,
};

export interface PathTracerState {
  config: PathTracerConfig;
  sampleCount: number;
  isConverging: boolean;
  progress: number;
}

export function createPathTracerState(
  config?: Partial<PathTracerConfig>
): PathTracerState {
  return {
    config: { ...DEFAULT_PATH_TRACER_CONFIG, ...config },
    sampleCount: 0,
    isConverging: false,
    progress: 0,
  };
}

/**
 * Advance sample count by the elapsed delta time.
 * Each tick represents one sample batch; progress is clamped to [0, 1].
 */
export function updatePathTracer(
  state: PathTracerState,
  delta: number
): PathTracerState {
  if (!state.config.enabled) {
    return state;
  }

  const samplesPerTick = Math.max(1, Math.round(delta * 60)); // ~1 sample per frame at 60 fps
  const newSampleCount = Math.min(
    state.sampleCount + samplesPerTick,
    state.config.samples
  );
  const progress = newSampleCount / state.config.samples;
  const isConverging = newSampleCount < state.config.samples;

  return {
    ...state,
    sampleCount: newSampleCount,
    isConverging,
    progress,
  };
}

/**
 * Detect camera movement to restart convergence.
 * Compares serialised camera matrices (position + quaternion).
 */
export function shouldResetPathTracer(
  prevCamera: { position: [number, number, number]; quaternion: [number, number, number, number] },
  newCamera: { position: [number, number, number]; quaternion: [number, number, number, number] }
): boolean {
  const EPSILON = 1e-6;

  for (let i = 0; i < 3; i++) {
    if (Math.abs(prevCamera.position[i] - newCamera.position[i]) > EPSILON) {
      return true;
    }
  }

  for (let i = 0; i < 4; i++) {
    if (Math.abs(prevCamera.quaternion[i] - newCamera.quaternion[i]) > EPSILON) {
      return true;
    }
  }

  return false;
}

/**
 * Return uniforms suitable for a path tracing shader pass.
 */
export function getPathTracerUniforms(
  config: PathTracerConfig
): Record<string, unknown> {
  return {
    u_maxBounces: config.bounces,
    u_targetSamples: config.samples,
    u_resolution: config.resolution,
    u_envIntensity: config.environmentIntensity,
    u_filterGlossyFactor: config.filterGlossyFactor,
    u_enabled: config.enabled ? 1.0 : 0.0,
  };
}
