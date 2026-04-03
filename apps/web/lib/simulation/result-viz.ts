/**
 * FEM Result Visualization — maps scalar values (stress, temperature) to vertex colors.
 * Generates a color array for Three.js BufferGeometry color attribute.
 */

/**
 * Map a scalar value to a blue→cyan→green→yellow→red color ramp.
 */
export function scalarToColor(value: number, min: number, max: number): [number, number, number] {
  const range = max - min;
  if (range <= 0) return [0, 0, 1]; // All blue

  const t = Math.max(0, Math.min(1, (value - min) / range));

  // 5-stop color ramp: blue → cyan → green → yellow → red
  if (t < 0.25) {
    const s = t / 0.25;
    return [0, s, 1]; // blue → cyan
  } else if (t < 0.5) {
    const s = (t - 0.25) / 0.25;
    return [0, 1, 1 - s]; // cyan → green
  } else if (t < 0.75) {
    const s = (t - 0.5) / 0.25;
    return [s, 1, 0]; // green → yellow
  } else {
    const s = (t - 0.75) / 0.25;
    return [1, 1 - s, 0]; // yellow → red
  }
}

/**
 * Generate per-vertex color array from scalar values (stress, temperature, etc.).
 * Returns a flat Float32Array suitable for Three.js BufferAttribute.
 */
export function generateHeatmapColors(
  values: number[],
  vertexCount: number,
  minVal?: number,
  maxVal?: number
): Float32Array {
  const colors = new Float32Array(vertexCount * 3);

  if (values.length === 0) {
    // Default: all blue
    for (let i = 0; i < vertexCount; i++) {
      colors[i * 3] = 0.2;
      colors[i * 3 + 1] = 0.4;
      colors[i * 3 + 2] = 1.0;
    }
    return colors;
  }

  const min = minVal ?? Math.min(...values);
  const max = maxVal ?? Math.max(...values);

  for (let i = 0; i < vertexCount; i++) {
    const val = i < values.length ? values[i] : 0;
    const [r, g, b] = scalarToColor(val, min, max);
    colors[i * 3] = r;
    colors[i * 3 + 1] = g;
    colors[i * 3 + 2] = b;
  }

  return colors;
}

/**
 * Generate a color legend bar data for UI display.
 */
export function generateLegend(
  min: number,
  max: number,
  steps: number = 10
): { value: number; color: [number, number, number]; label: string }[] {
  const legend: { value: number; color: [number, number, number]; label: string }[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const value = min + t * (max - min);
    legend.push({
      value,
      color: scalarToColor(value, min, max),
      label: value.toExponential(2),
    });
  }
  return legend;
}
