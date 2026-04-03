// Procedural animation generators
// Each returns targetId -> property -> value map compatible with evaluateAction output

/**
 * Generate bone rotations for a procedural walk cycle.
 * Uses sin/cos functions to produce natural-looking locomotion.
 */
export function proceduralWalkCycle(
  time: number,
  speed: number,
  stepHeight: number
): Map<string, Map<string, number>> {
  const result = new Map<string, Map<string, number>>();
  const phase = time * speed;

  const set = (targetId: string, property: string, value: number): void => {
    let targetMap = result.get(targetId);
    if (!targetMap) {
      targetMap = new Map<string, number>();
      result.set(targetId, targetMap);
    }
    targetMap.set(property, value);
  };

  // Hip: vertical bounce (double frequency since both feet strike per cycle)
  const hipBounce = Math.abs(Math.sin(phase * 2)) * stepHeight * 0.3;
  set('hip', 'position.y', hipBounce);
  // Slight lateral sway
  set('hip', 'position.x', Math.sin(phase) * 0.02);
  set('hip', 'rotation.z', Math.sin(phase) * 0.03);

  // Thighs: alternating forward/back rotation
  const thighSwing = Math.sin(phase) * 0.5;
  set('thigh.L', 'rotation.x', thighSwing);
  set('thigh.R', 'rotation.x', -thighSwing);

  // Shins: knee bend (only bends when leg is behind, using clamped sine)
  const kneeAngleL = Math.max(0, Math.sin(phase - 0.5)) * 0.8;
  const kneeAngleR = Math.max(0, Math.sin(phase - 0.5 + Math.PI)) * 0.8;
  set('shin.L', 'rotation.x', -kneeAngleL);
  set('shin.R', 'rotation.x', -kneeAngleR);

  // Feet: ankle roll
  const ankleL = Math.sin(phase + 0.3) * 0.2;
  const ankleR = Math.sin(phase + 0.3 + Math.PI) * 0.2;
  set('foot.L', 'rotation.x', ankleL);
  set('foot.R', 'rotation.x', ankleR);

  // Spine: slight counter-rotation to hips
  set('spine', 'rotation.y', Math.sin(phase) * 0.08);
  set('spine', 'rotation.x', Math.sin(phase * 2) * 0.02);

  // Arms: counter-swing opposite to legs
  const armSwing = Math.sin(phase) * 0.4;
  set('upperArm.L', 'rotation.x', -armSwing);
  set('upperArm.R', 'rotation.x', armSwing);
  set('lowerArm.L', 'rotation.x', Math.max(0, -Math.sin(phase)) * 0.3);
  set('lowerArm.R', 'rotation.x', Math.max(0, Math.sin(phase)) * 0.3);

  return result;
}

/**
 * Subtle chest and belly expansion for a breathing cycle.
 */
export function proceduralBreathingCycle(
  time: number,
  intensity: number
): Map<string, Map<string, number>> {
  const result = new Map<string, Map<string, number>>();

  const set = (targetId: string, property: string, value: number): void => {
    let targetMap = result.get(targetId);
    if (!targetMap) {
      targetMap = new Map<string, number>();
      result.set(targetId, targetMap);
    }
    targetMap.set(property, value);
  };

  // Slow breathing rate (~0.25 Hz, ~15 breaths/min)
  const breathPhase = time * Math.PI * 0.5;
  const breathAmount = (Math.sin(breathPhase) * 0.5 + 0.5) * intensity;

  // Chest expansion
  set('chest', 'scale.x', 1 + breathAmount * 0.02);
  set('chest', 'scale.y', 1 + breathAmount * 0.03);
  set('chest', 'scale.z', 1 + breathAmount * 0.02);

  // Belly expansion (slightly delayed phase)
  const bellyPhase = breathPhase - 0.3;
  const bellyAmount = (Math.sin(bellyPhase) * 0.5 + 0.5) * intensity;
  set('belly', 'scale.z', 1 + bellyAmount * 0.03);
  set('belly', 'scale.x', 1 + bellyAmount * 0.01);

  // Shoulders rise slightly on inhale
  set('shoulder.L', 'position.y', breathAmount * 0.005);
  set('shoulder.R', 'position.y', breathAmount * 0.005);

  // Slight spine extension on inhale
  set('spine', 'rotation.x', -breathAmount * 0.01);

  return result;
}

/**
 * Gentle body sway for idle animation.
 * Uses multiple layered sine waves for organic motion.
 */
export function proceduralIdleSway(
  time: number
): Map<string, Map<string, number>> {
  const result = new Map<string, Map<string, number>>();

  const set = (targetId: string, property: string, value: number): void => {
    let targetMap = result.get(targetId);
    if (!targetMap) {
      targetMap = new Map<string, number>();
      result.set(targetId, targetMap);
    }
    targetMap.set(property, value);
  };

  // Slow lateral sway (primary wave)
  const swayX = Math.sin(time * 0.7) * 0.01 + Math.sin(time * 1.3) * 0.005;
  const swayZ = Math.sin(time * 0.5) * 0.008 + Math.cos(time * 0.9) * 0.004;

  // Hip sway
  set('hip', 'position.x', swayX);
  set('hip', 'position.z', swayZ);
  set('hip', 'rotation.z', swayX * 2);

  // Spine follows with slight delay
  set('spine', 'rotation.z', Math.sin(time * 0.7 - 0.2) * 0.015);
  set('spine', 'rotation.x', Math.sin(time * 0.4) * 0.01);

  // Head micro-movements
  set('head', 'rotation.y', Math.sin(time * 0.3) * 0.02 + Math.sin(time * 1.1) * 0.01);
  set('head', 'rotation.x', Math.sin(time * 0.5) * 0.008);

  // Weight shifting between feet
  const weightShift = Math.sin(time * 0.4) * 0.5 + 0.5; // 0 to 1
  set('foot.L', 'position.y', weightShift * 0.002);
  set('foot.R', 'position.y', (1 - weightShift) * 0.002);

  return result;
}
