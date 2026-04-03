/**
 * Post-processing effect definitions and pipeline management.
 */

export type PostEffect =
  | 'bloom'
  | 'dof'
  | 'ssao'
  | 'tonemap'
  | 'vignette'
  | 'chromatic_aberration'
  | 'lut';

export interface BloomConfig {
  intensity: number;
  threshold: number;
  radius: number;
  levels: number;
}

export interface DOFConfig {
  focusDistance: number;
  focalLength: number;
  bokehScale: number;
  aperture: number;
}

export interface SSAOConfig {
  radius: number;
  intensity: number;
  bias: number;
  samples: number;
}

export interface TonemapConfig {
  mode: 'aces' | 'reinhard' | 'cineon' | 'linear';
  exposure: number;
  whitePoint: number;
}

export interface VignetteConfig {
  intensity: number;
  offset: number;
}

export interface ChromaticAberrationConfig {
  offset: number;
  radialModulation: number;
}

export interface LUTConfig {
  texture: string;
  intensity: number;
}

export type EffectConfigMap = {
  bloom: BloomConfig;
  dof: DOFConfig;
  ssao: SSAOConfig;
  tonemap: TonemapConfig;
  vignette: VignetteConfig;
  chromatic_aberration: ChromaticAberrationConfig;
  lut: LUTConfig;
};

export interface PostProcessingEffect {
  type: PostEffect;
  enabled: boolean;
  config: EffectConfigMap[PostEffect];
}

export interface PostProcessingPipeline {
  effects: PostProcessingEffect[];
  order: PostEffect[];
}

const BLOOM_DEFAULTS: BloomConfig = {
  intensity: 0.5,
  threshold: 0.8,
  radius: 0.4,
  levels: 5,
};

const DOF_DEFAULTS: DOFConfig = {
  focusDistance: 5.0,
  focalLength: 50.0,
  bokehScale: 2.0,
  aperture: 0.025,
};

const SSAO_DEFAULTS: SSAOConfig = {
  radius: 0.5,
  intensity: 1.0,
  bias: 0.025,
  samples: 32,
};

const TONEMAP_DEFAULTS: TonemapConfig = {
  mode: 'aces',
  exposure: 1.0,
  whitePoint: 1.0,
};

const VIGNETTE_DEFAULTS: VignetteConfig = {
  intensity: 0.3,
  offset: 0.5,
};

const CHROMATIC_ABERRATION_DEFAULTS: ChromaticAberrationConfig = {
  offset: 0.002,
  radialModulation: 0.5,
};

const LUT_DEFAULTS: LUTConfig = {
  texture: '',
  intensity: 1.0,
};

export function getEffectDefaults(effect: PostEffect): EffectConfigMap[PostEffect] {
  switch (effect) {
    case 'bloom':
      return { ...BLOOM_DEFAULTS };
    case 'dof':
      return { ...DOF_DEFAULTS };
    case 'ssao':
      return { ...SSAO_DEFAULTS };
    case 'tonemap':
      return { ...TONEMAP_DEFAULTS };
    case 'vignette':
      return { ...VIGNETTE_DEFAULTS };
    case 'chromatic_aberration':
      return { ...CHROMATIC_ABERRATION_DEFAULTS };
    case 'lut':
      return { ...LUT_DEFAULTS };
  }
}

const DEFAULT_ORDER: PostEffect[] = [
  'ssao',
  'bloom',
  'dof',
  'chromatic_aberration',
  'tonemap',
  'lut',
  'vignette',
];

export function createDefaultPipeline(): PostProcessingPipeline {
  const effects: PostProcessingEffect[] = DEFAULT_ORDER.map((type) => ({
    type,
    enabled: type === 'tonemap', // only tonemap on by default
    config: getEffectDefaults(type),
  }));

  return {
    effects,
    order: [...DEFAULT_ORDER],
  };
}

export const RENDER_PRESETS: Record<string, PostProcessingPipeline> = {
  cinematic: {
    effects: [
      { type: 'ssao', enabled: true, config: { ...SSAO_DEFAULTS, intensity: 1.2 } },
      { type: 'bloom', enabled: true, config: { ...BLOOM_DEFAULTS, intensity: 0.3, threshold: 0.9 } },
      { type: 'dof', enabled: true, config: { ...DOF_DEFAULTS, bokehScale: 3.0 } },
      { type: 'chromatic_aberration', enabled: true, config: { ...CHROMATIC_ABERRATION_DEFAULTS, offset: 0.001 } },
      { type: 'tonemap', enabled: true, config: { ...TONEMAP_DEFAULTS, mode: 'aces', exposure: 1.1 } },
      { type: 'lut', enabled: false, config: { ...LUT_DEFAULTS } },
      { type: 'vignette', enabled: true, config: { ...VIGNETTE_DEFAULTS, intensity: 0.5 } },
    ],
    order: DEFAULT_ORDER,
  },

  product_shot: {
    effects: [
      { type: 'ssao', enabled: true, config: { ...SSAO_DEFAULTS, radius: 0.3, intensity: 0.8 } },
      { type: 'bloom', enabled: false, config: { ...BLOOM_DEFAULTS } },
      { type: 'dof', enabled: true, config: { ...DOF_DEFAULTS, focusDistance: 3.0, aperture: 0.01 } },
      { type: 'chromatic_aberration', enabled: false, config: { ...CHROMATIC_ABERRATION_DEFAULTS } },
      { type: 'tonemap', enabled: true, config: { ...TONEMAP_DEFAULTS, mode: 'aces', exposure: 1.0 } },
      { type: 'lut', enabled: false, config: { ...LUT_DEFAULTS } },
      { type: 'vignette', enabled: false, config: { ...VIGNETTE_DEFAULTS } },
    ],
    order: DEFAULT_ORDER,
  },

  sketch_style: {
    effects: [
      { type: 'ssao', enabled: false, config: { ...SSAO_DEFAULTS } },
      { type: 'bloom', enabled: false, config: { ...BLOOM_DEFAULTS } },
      { type: 'dof', enabled: false, config: { ...DOF_DEFAULTS } },
      { type: 'chromatic_aberration', enabled: false, config: { ...CHROMATIC_ABERRATION_DEFAULTS } },
      { type: 'tonemap', enabled: true, config: { ...TONEMAP_DEFAULTS, mode: 'linear', exposure: 1.2 } },
      { type: 'lut', enabled: false, config: { ...LUT_DEFAULTS } },
      { type: 'vignette', enabled: true, config: { ...VIGNETTE_DEFAULTS, intensity: 0.2 } },
    ],
    order: DEFAULT_ORDER,
  },

  game_engine: {
    effects: [
      { type: 'ssao', enabled: true, config: { ...SSAO_DEFAULTS, samples: 16, radius: 0.4 } },
      { type: 'bloom', enabled: true, config: { ...BLOOM_DEFAULTS, intensity: 0.6, threshold: 0.7 } },
      { type: 'dof', enabled: false, config: { ...DOF_DEFAULTS } },
      { type: 'chromatic_aberration', enabled: false, config: { ...CHROMATIC_ABERRATION_DEFAULTS } },
      { type: 'tonemap', enabled: true, config: { ...TONEMAP_DEFAULTS, mode: 'reinhard', exposure: 1.0 } },
      { type: 'lut', enabled: false, config: { ...LUT_DEFAULTS } },
      { type: 'vignette', enabled: false, config: { ...VIGNETTE_DEFAULTS } },
    ],
    order: DEFAULT_ORDER,
  },
};
