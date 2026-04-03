/** PBR Rendering: materials library, environment maps. */

export interface PBRMaterial {
  name: string;
  color: string; // hex
  roughness: number; // 0-1
  metalness: number; // 0-1
  opacity: number; // 0-1
  emissive?: string;
  emissiveIntensity?: number;
}

export const MATERIAL_LIBRARY: Record<string, PBRMaterial> = {
  steel_brushed: {
    name: "Brushed Steel",
    color: "#8899aa",
    roughness: 0.4,
    metalness: 0.9,
    opacity: 1.0,
  },
  aluminum_polished: {
    name: "Polished Aluminum",
    color: "#c0c0c0",
    roughness: 0.1,
    metalness: 0.95,
    opacity: 1.0,
  },
  plastic_abs_white: {
    name: "White ABS Plastic",
    color: "#f5f5f5",
    roughness: 0.6,
    metalness: 0.0,
    opacity: 1.0,
  },
  plastic_abs_black: {
    name: "Black ABS Plastic",
    color: "#222222",
    roughness: 0.55,
    metalness: 0.0,
    opacity: 1.0,
  },
  rubber_black: {
    name: "Black Rubber",
    color: "#1a1a1a",
    roughness: 0.9,
    metalness: 0.0,
    opacity: 1.0,
  },
  glass_clear: {
    name: "Clear Glass",
    color: "#ffffff",
    roughness: 0.05,
    metalness: 0.0,
    opacity: 0.3,
  },
  wood_oak: {
    name: "Oak Wood",
    color: "#c4a35a",
    roughness: 0.7,
    metalness: 0.0,
    opacity: 1.0,
  },
  copper_polished: {
    name: "Polished Copper",
    color: "#b87333",
    roughness: 0.2,
    metalness: 0.95,
    opacity: 1.0,
  },
  titanium_anodized: {
    name: "Anodized Titanium",
    color: "#6b7d8e",
    roughness: 0.3,
    metalness: 0.85,
    opacity: 1.0,
  },
  carbon_fiber: {
    name: "Carbon Fiber",
    color: "#1a1a2e",
    roughness: 0.35,
    metalness: 0.3,
    opacity: 1.0,
  },
};

export type EnvironmentPreset =
  | "studio"
  | "warehouse"
  | "sunset"
  | "forest"
  | "city"
  | "night";

export type RenderMode = "shaded" | "wireframe" | "flat" | "xray" | "pbr";

/**
 * Convert a PBRMaterial to Three.js MeshPhysicalMaterial parameters.
 */
export function materialToThreeParams(mat: PBRMaterial): {
  color: string;
  roughness: number;
  metalness: number;
  transparent: boolean;
  opacity: number;
  emissive?: string;
  emissiveIntensity?: number;
  side: number; // THREE.DoubleSide = 2
} {
  return {
    color: mat.color,
    roughness: mat.roughness,
    metalness: mat.metalness,
    transparent: mat.opacity < 1,
    opacity: mat.opacity,
    emissive: mat.emissive,
    emissiveIntensity: mat.emissiveIntensity,
    side: 2,
  };
}

/** Get material names for UI dropdowns */
export function getMaterialNames(): { id: string; name: string }[] {
  return Object.entries(MATERIAL_LIBRARY).map(([id, mat]) => ({ id, name: mat.name }));
}

/**
 * Post-processing settings for viewport.
 */
export interface PostProcessSettings {
  ssao: boolean;       // Screen Space Ambient Occlusion
  toneMapping: "none" | "aces" | "reinhard" | "cineon";
  exposure: number;    // 0.5-2.0
  bloom: boolean;
  bloomIntensity: number; // 0-1
}

export const DEFAULT_POST_PROCESS: PostProcessSettings = {
  ssao: true,
  toneMapping: "aces",
  exposure: 1.0,
  bloom: false,
  bloomIntensity: 0.3,
};
