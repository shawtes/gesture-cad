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
