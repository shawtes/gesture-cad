/**
 * Holographic Material Shader
 *
 * Creates a sci-fi hologram effect for AR viewing:
 * - Transparent blue/cyan tint
 * - Animated scan lines scrolling vertically
 * - Edge glow (Fresnel-based rim lighting)
 * - Subtle flicker / noise
 * - Wireframe overlay on geometry edges
 *
 * Designed for AR passthrough on Quest — the model floats in space
 * like a real hologram projection.
 */

import * as THREE from "three";

const HOLOGRAM_VERTEX = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vWorldPosition;
  varying vec2 vUv;

  void main() {
    vNormal = normalize(normalMatrix * normal);
    vPosition = position;
    vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const HOLOGRAM_FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uScanLineSpeed;
  uniform float uScanLineDensity;
  uniform float uFlickerSpeed;
  uniform float uEdgeGlow;
  uniform float uNoiseAmount;

  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vWorldPosition;
  varying vec2 vUv;

  // Simple noise function
  float hash(float n) {
    return fract(sin(n) * 43758.5453123);
  }

  float noise(vec3 x) {
    vec3 p = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    float n = p.x + p.y * 57.0 + 113.0 * p.z;
    return mix(
      mix(mix(hash(n), hash(n + 1.0), f.x),
          mix(hash(n + 57.0), hash(n + 58.0), f.x), f.y),
      mix(mix(hash(n + 113.0), hash(n + 114.0), f.x),
          mix(hash(n + 170.0), hash(n + 171.0), f.x), f.y),
      f.z
    );
  }

  void main() {
    // Base color
    vec3 color = uColor;

    // Fresnel edge glow — brighter at grazing angles
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    float fresnel = 1.0 - abs(dot(viewDir, vNormal));
    fresnel = pow(fresnel, 2.0) * uEdgeGlow;
    color += fresnel * vec3(0.3, 0.6, 1.0);

    // Scan lines — horizontal bands scrolling down
    float scanLine = sin((vWorldPosition.y * uScanLineDensity) + (uTime * uScanLineSpeed));
    scanLine = smoothstep(0.3, 0.7, scanLine * 0.5 + 0.5);
    float scanAlpha = mix(0.6, 1.0, scanLine);

    // Fine scan lines (higher frequency)
    float fineScan = sin(vWorldPosition.y * uScanLineDensity * 8.0 + uTime * uScanLineSpeed * 0.5);
    fineScan = smoothstep(0.4, 0.6, fineScan * 0.5 + 0.5);
    scanAlpha *= mix(0.85, 1.0, fineScan);

    // Flicker — subtle overall brightness variation
    float flicker = 1.0 - uNoiseAmount * 0.3 * (
      sin(uTime * uFlickerSpeed) *
      sin(uTime * uFlickerSpeed * 1.7 + 1.0) *
      0.5 + 0.5
    );

    // Noise overlay — subtle digital noise
    float n = noise(vWorldPosition * 20.0 + uTime * 2.0);
    float noiseOverlay = 1.0 - uNoiseAmount * 0.15 * n;

    // Combine all effects
    float alpha = uOpacity * scanAlpha * flicker * noiseOverlay;

    // Add extra brightness at edges
    color += fresnel * 0.5 * uColor;

    gl_FragColor = vec4(color, alpha);
  }
`;

export interface HologramParams {
  color?: string;
  opacity?: number;
  scanLineSpeed?: number;
  scanLineDensity?: number;
  flickerSpeed?: number;
  edgeGlow?: number;
  noiseAmount?: number;
  wireframe?: boolean;
}

const DEFAULT_PARAMS: Required<HologramParams> = {
  color: "#00aaff",
  opacity: 0.55,
  scanLineSpeed: 2.0,
  scanLineDensity: 40.0,
  flickerSpeed: 8.0,
  edgeGlow: 2.0,
  noiseAmount: 0.5,
  wireframe: false,
};

/**
 * Create a holographic ShaderMaterial for Three.js meshes.
 * Call updateHologramTime(material, clock.elapsedTime) each frame.
 */
export function createHologramMaterial(params?: HologramParams): THREE.ShaderMaterial {
  const p = { ...DEFAULT_PARAMS, ...params };
  const color = new THREE.Color(p.color);

  return new THREE.ShaderMaterial({
    vertexShader: HOLOGRAM_VERTEX,
    fragmentShader: HOLOGRAM_FRAGMENT,
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: color },
      uOpacity: { value: p.opacity },
      uScanLineSpeed: { value: p.scanLineSpeed },
      uScanLineDensity: { value: p.scanLineDensity },
      uFlickerSpeed: { value: p.flickerSpeed },
      uEdgeGlow: { value: p.edgeGlow },
      uNoiseAmount: { value: p.noiseAmount },
    },
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
    wireframe: p.wireframe,
  });
}

/** Update the time uniform for animation. Call in useFrame. */
export function updateHologramTime(material: THREE.ShaderMaterial, time: number): void {
  if (material.uniforms.uTime) {
    material.uniforms.uTime.value = time;
  }
}

/**
 * Hologram color presets for different model types.
 */
export const HOLOGRAM_PRESETS = {
  /** Classic blue hologram (Star Wars style) */
  blue: { color: "#00aaff", edgeGlow: 2.0, opacity: 0.55 },
  /** Cyan technical schematic */
  cyan: { color: "#00ffcc", edgeGlow: 1.5, opacity: 0.5 },
  /** Green matrix / engineering */
  green: { color: "#22ff66", edgeGlow: 1.8, opacity: 0.5 },
  /** Orange / warm hologram */
  orange: { color: "#ff8800", edgeGlow: 2.2, opacity: 0.55 },
  /** Red alert / warning */
  red: { color: "#ff2244", edgeGlow: 2.5, opacity: 0.6 },
  /** Purple sci-fi */
  purple: { color: "#aa44ff", edgeGlow: 2.0, opacity: 0.5 },
  /** White / clean technical */
  white: { color: "#ccddff", edgeGlow: 1.2, opacity: 0.45 },
} as const;

export type HologramPreset = keyof typeof HOLOGRAM_PRESETS;
