/** FEA Simulation: stress analysis, thermal, modal analysis types. */

export type SimulationType = "static_stress" | "thermal" | "modal" | "topology_opt";

export interface Material {
  name: string;
  youngsModulus: number; // Pa
  poissonsRatio: number;
  density: number; // kg/m³
  thermalConductivity: number; // W/(m·K)
  yieldStrength: number; // Pa
}

export interface BoundaryCondition {
  id: string;
  type: "fixed" | "force" | "pressure" | "displacement" | "temperature";
  faceId: string;
  value: number;
  direction?: { x: number; y: number; z: number };
}

export interface SimulationSetup {
  id: string;
  type: SimulationType;
  material: Material;
  boundaryConditions: BoundaryCondition[];
  meshSize: number; // element size
}

export interface SimulationResult {
  id: string;
  setupId: string;
  status: "pending" | "running" | "completed" | "failed";
  maxStress?: number; // Von Mises, Pa
  maxDisplacement?: number; // mm
  safetyFactor?: number;
  naturalFrequencies?: number[]; // Hz (for modal)
  maxTemperature?: number; // K (for thermal)
}

/** Common engineering materials. */
export const MATERIALS: Record<string, Material> = {
  steel_1018: {
    name: "Steel 1018",
    youngsModulus: 205e9,
    poissonsRatio: 0.29,
    density: 7870,
    thermalConductivity: 51.9,
    yieldStrength: 370e6,
  },
  aluminum_6061: {
    name: "Aluminum 6061-T6",
    youngsModulus: 68.9e9,
    poissonsRatio: 0.33,
    density: 2700,
    thermalConductivity: 167,
    yieldStrength: 276e6,
  },
  titanium_ti6al4v: {
    name: "Titanium Ti-6Al-4V",
    youngsModulus: 113.8e9,
    poissonsRatio: 0.342,
    density: 4430,
    thermalConductivity: 6.7,
    yieldStrength: 880e6,
  },
  abs_plastic: {
    name: "ABS Plastic",
    youngsModulus: 2.3e9,
    poissonsRatio: 0.35,
    density: 1050,
    thermalConductivity: 0.17,
    yieldStrength: 40e6,
  },
};

/** Calculate safety factor: yield strength / max stress. */
export function calculateSafetyFactor(
  material: Material,
  maxVonMisesStress: number
): number {
  if (maxVonMisesStress <= 0) return Infinity;
  return material.yieldStrength / maxVonMisesStress;
}
