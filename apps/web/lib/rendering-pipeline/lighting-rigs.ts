/**
 * Studio lighting presets and HDRI environment definitions.
 */

export type LightType = 'directional' | 'point' | 'spot' | 'area' | 'hemisphere';

export interface Light {
  type: LightType;
  color: string;
  intensity: number;
  position: [number, number, number];
  target?: [number, number, number];
  castShadow: boolean;
  angle?: number;
  penumbra?: number;
  decay?: number;
  width?: number;
  height?: number;
}

export interface LightingRig {
  name: string;
  lights: Light[];
  ambientColor: string;
  ambientIntensity: number;
  environmentMap?: string;
}

export const LIGHTING_PRESETS: Record<string, LightingRig> = {
  three_point: {
    name: 'Three-Point',
    lights: [
      // Key light — primary directional, warm
      {
        type: 'directional',
        color: '#fff5e0',
        intensity: 1.2,
        position: [5, 8, 4],
        target: [0, 0, 0],
        castShadow: true,
      },
      // Fill light — softer, cooler, opposite side
      {
        type: 'directional',
        color: '#c8d8ff',
        intensity: 0.5,
        position: [-4, 5, 2],
        target: [0, 0, 0],
        castShadow: false,
      },
      // Rim / back light — behind and above
      {
        type: 'directional',
        color: '#ffffff',
        intensity: 0.8,
        position: [-2, 6, -5],
        target: [0, 0, 0],
        castShadow: false,
      },
    ],
    ambientColor: '#1a1a2e',
    ambientIntensity: 0.15,
  },

  studio: {
    name: 'Studio',
    lights: [
      // Main soft box — area light from front-left
      {
        type: 'area',
        color: '#ffffff',
        intensity: 2.0,
        position: [3, 5, 3],
        target: [0, 0, 0],
        castShadow: true,
        width: 4,
        height: 4,
      },
      // Secondary soft box — area from right
      {
        type: 'area',
        color: '#f0f0ff',
        intensity: 1.2,
        position: [-3, 4, 1],
        target: [0, 0, 0],
        castShadow: false,
        width: 3,
        height: 3,
      },
      // Background accent spot
      {
        type: 'spot',
        color: '#e0e8ff',
        intensity: 0.8,
        position: [0, 6, -4],
        target: [0, 0, -2],
        castShadow: false,
        angle: 0.6,
        penumbra: 0.8,
        decay: 2,
      },
    ],
    ambientColor: '#2a2a3a',
    ambientIntensity: 0.2,
  },

  outdoor_sunny: {
    name: 'Outdoor Sunny',
    lights: [
      // Sun
      {
        type: 'directional',
        color: '#fff8e1',
        intensity: 2.5,
        position: [10, 15, 5],
        target: [0, 0, 0],
        castShadow: true,
      },
    ],
    ambientColor: '#87ceeb',
    ambientIntensity: 0.4,
  },

  outdoor_overcast: {
    name: 'Outdoor Overcast',
    lights: [
      // Hemisphere light for soft sky/ground gradient
      {
        type: 'hemisphere',
        color: '#b0c4de', // sky color
        intensity: 1.0,
        position: [0, 10, 0],
        castShadow: false,
      },
      // Subtle directional for hint of direction
      {
        type: 'directional',
        color: '#d0d0d8',
        intensity: 0.3,
        position: [2, 8, 1],
        target: [0, 0, 0],
        castShadow: true,
      },
    ],
    ambientColor: '#9aa5b4',
    ambientIntensity: 0.5,
  },

  dramatic: {
    name: 'Dramatic',
    lights: [
      // Single hard key light
      {
        type: 'spot',
        color: '#ff9933',
        intensity: 3.0,
        position: [4, 8, 2],
        target: [0, 0, 0],
        castShadow: true,
        angle: 0.4,
        penumbra: 0.3,
        decay: 2,
      },
      // Color accent from opposite side
      {
        type: 'point',
        color: '#3344ff',
        intensity: 0.6,
        position: [-4, 2, -2],
        castShadow: false,
        decay: 2,
      },
    ],
    ambientColor: '#0a0a14',
    ambientIntensity: 0.05,
  },

  rim_light: {
    name: 'Rim Light',
    lights: [
      // Strong backlight left
      {
        type: 'directional',
        color: '#ffffff',
        intensity: 2.0,
        position: [-3, 4, -6],
        target: [0, 0, 0],
        castShadow: true,
      },
      // Strong backlight right
      {
        type: 'directional',
        color: '#e8e0ff',
        intensity: 1.8,
        position: [3, 4, -6],
        target: [0, 0, 0],
        castShadow: false,
      },
      // Very subtle fill from front
      {
        type: 'directional',
        color: '#222244',
        intensity: 0.2,
        position: [0, 2, 5],
        target: [0, 0, 0],
        castShadow: false,
      },
    ],
    ambientColor: '#0d0d1a',
    ambientIntensity: 0.08,
  },
};

export interface HDRIPreset {
  name: string;
  url_hint: string;
  intensity: number;
}

export const HDRI_PRESETS: HDRIPreset[] = [
  { name: 'Studio Small', url_hint: '/hdri/studio_small_09_1k.hdr', intensity: 1.0 },
  { name: 'City Night', url_hint: '/hdri/city_night_1k.hdr', intensity: 0.8 },
  { name: 'Forest Path', url_hint: '/hdri/forest_path_1k.hdr', intensity: 1.2 },
  { name: 'Sunset Field', url_hint: '/hdri/sunset_field_1k.hdr', intensity: 1.5 },
  { name: 'Overcast Sky', url_hint: '/hdri/overcast_sky_1k.hdr', intensity: 0.6 },
  { name: 'Workshop', url_hint: '/hdri/workshop_1k.hdr', intensity: 0.9 },
  { name: 'White Studio', url_hint: '/hdri/white_studio_1k.hdr', intensity: 1.0 },
];
