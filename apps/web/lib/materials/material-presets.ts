/**
 * Character Material Presets
 *
 * PBR material definitions with extended properties for character rendering:
 * subsurface scattering, sheen, clearcoat, transmission, and emission.
 */

// ─── Types ─────────────────────────────────────────────────

export interface CharacterMaterial {
  name: string;
  color: string;
  roughness: number;
  metalness: number;
  opacity: number;
  subsurface?: number;
  subsurfaceColor?: string;
  sheenColor?: string;
  sheenRoughness?: number;
  clearcoat?: number;
  clearcoatRoughness?: number;
  transmission?: number;
  ior?: number;
  emissive?: string;
  emissiveIntensity?: number;
}

// ─── Preset Catalog ───────────────────────────────────────

export const MATERIAL_PRESETS: Record<string, CharacterMaterial> = {
  skin_light: {
    name: "Skin (Light)",
    color: "#f5d0b0",
    roughness: 0.55,
    metalness: 0.0,
    opacity: 1.0,
    subsurface: 0.4,
    subsurfaceColor: "#cc4422",
    sheenColor: "#ffffff",
    sheenRoughness: 0.8,
  },

  skin_dark: {
    name: "Skin (Dark)",
    color: "#8d5524",
    roughness: 0.5,
    metalness: 0.0,
    opacity: 1.0,
    subsurface: 0.35,
    subsurfaceColor: "#991100",
    sheenColor: "#ffffff",
    sheenRoughness: 0.75,
  },

  eye_cornea: {
    name: "Eye Cornea",
    color: "#ffffff",
    roughness: 0.0,
    metalness: 0.0,
    opacity: 1.0,
    transmission: 0.95,
    ior: 1.376,
    clearcoat: 1.0,
    clearcoatRoughness: 0.0,
  },

  eye_iris: {
    name: "Eye Iris",
    color: "#4a7c59",
    roughness: 0.3,
    metalness: 0.0,
    opacity: 1.0,
    clearcoat: 0.5,
    clearcoatRoughness: 0.1,
  },

  hair_blonde: {
    name: "Hair (Blonde)",
    color: "#d4a853",
    roughness: 0.45,
    metalness: 0.0,
    opacity: 1.0,
    sheenColor: "#fff8e0",
    sheenRoughness: 0.3,
  },

  hair_dark: {
    name: "Hair (Dark)",
    color: "#1a1a1a",
    roughness: 0.4,
    metalness: 0.0,
    opacity: 1.0,
    sheenColor: "#333344",
    sheenRoughness: 0.25,
  },

  fabric_cotton: {
    name: "Fabric (Cotton)",
    color: "#c8b8a0",
    roughness: 0.9,
    metalness: 0.0,
    opacity: 1.0,
    sheenColor: "#e0d8cc",
    sheenRoughness: 0.8,
  },

  fabric_silk: {
    name: "Fabric (Silk)",
    color: "#8844aa",
    roughness: 0.35,
    metalness: 0.0,
    opacity: 1.0,
    sheenColor: "#cc88ff",
    sheenRoughness: 0.2,
  },

  leather: {
    name: "Leather",
    color: "#5c3a1e",
    roughness: 0.7,
    metalness: 0.0,
    opacity: 1.0,
    clearcoat: 0.15,
    clearcoatRoughness: 0.6,
  },

  armor_plate: {
    name: "Armor Plate",
    color: "#777788",
    roughness: 0.25,
    metalness: 0.95,
    opacity: 1.0,
    clearcoat: 0.3,
    clearcoatRoughness: 0.2,
  },

  gem_ruby: {
    name: "Gem (Ruby)",
    color: "#cc0033",
    roughness: 0.05,
    metalness: 0.0,
    opacity: 1.0,
    transmission: 0.6,
    ior: 1.77,
    emissive: "#440011",
    emissiveIntensity: 0.1,
  },

  gem_diamond: {
    name: "Gem (Diamond)",
    color: "#ffffff",
    roughness: 0.0,
    metalness: 0.0,
    opacity: 1.0,
    transmission: 0.9,
    ior: 2.42,
  },
};

// ─── Utilities ────────────────────────────────────────────

/**
 * Get a preset by key, returning a deep copy to avoid mutation.
 */
export function getPreset(key: string): CharacterMaterial | null {
  const preset = MATERIAL_PRESETS[key];
  if (!preset) return null;
  return { ...preset };
}

/**
 * List all available preset keys.
 */
export function listPresetKeys(): string[] {
  return Object.keys(MATERIAL_PRESETS);
}

/**
 * Create a default blank material.
 */
export function createDefaultMaterial(name = "Untitled"): CharacterMaterial {
  return {
    name,
    color: "#cccccc",
    roughness: 0.5,
    metalness: 0.0,
    opacity: 1.0,
  };
}
