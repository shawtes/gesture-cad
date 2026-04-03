// Animation timeline data model and keyframe evaluation

export interface Keyframe {
  time: number;
  value: number;
  inTangent: [number, number];
  outTangent: [number, number];
  interpolation: 'linear' | 'bezier' | 'constant' | 'step';
}

export interface AnimationChannel {
  id: string;
  targetId: string;
  property: string;
  keyframes: Keyframe[];
}

export interface AnimationAction {
  id: string;
  name: string;
  channels: AnimationChannel[];
  duration: number;
  loop: boolean;
}

/**
 * Cubic bezier interpolation between two keyframes.
 * Uses the out tangent of k1 and in tangent of k2 as control points.
 */
export function bezierInterpolate(k1: Keyframe, k2: Keyframe, t: number): number {
  const dt = k2.time - k1.time;
  if (dt <= 0) return k1.value;

  // Control points in value space
  const p0 = k1.value;
  const p1 = k1.value + k1.outTangent[1] * (dt / 3);
  const p2 = k2.value + k2.inTangent[1] * (dt / 3);
  const p3 = k2.value;

  // Cubic bezier: B(t) = (1-t)^3*p0 + 3*(1-t)^2*t*p1 + 3*(1-t)*t^2*p2 + t^3*p3
  const oneMinusT = 1 - t;
  const oneMinusT2 = oneMinusT * oneMinusT;
  const oneMinusT3 = oneMinusT2 * oneMinusT;
  const t2 = t * t;
  const t3 = t2 * t;

  return oneMinusT3 * p0 + 3 * oneMinusT2 * t * p1 + 3 * oneMinusT * t2 * p2 + t3 * p3;
}

/**
 * Binary search for the keyframe pair surrounding the given time,
 * then interpolate based on the keyframe's interpolation mode.
 */
export function evaluateChannel(channel: AnimationChannel, time: number): number {
  const { keyframes } = channel;
  if (keyframes.length === 0) return 0;
  if (keyframes.length === 1) return keyframes[0].value;

  // Clamp to range
  if (time <= keyframes[0].time) return keyframes[0].value;
  if (time >= keyframes[keyframes.length - 1].time) return keyframes[keyframes.length - 1].value;

  // Binary search for the interval containing time
  let lo = 0;
  let hi = keyframes.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >>> 1;
    if (keyframes[mid].time <= time) {
      lo = mid;
    } else {
      hi = mid;
    }
  }

  const k1 = keyframes[lo];
  const k2 = keyframes[hi];
  const dt = k2.time - k1.time;
  const localT = dt > 0 ? (time - k1.time) / dt : 0;

  switch (k1.interpolation) {
    case 'constant':
      return k1.value;
    case 'step':
      return localT < 1 ? k1.value : k2.value;
    case 'linear':
      return k1.value + (k2.value - k1.value) * localT;
    case 'bezier':
      return bezierInterpolate(k1, k2, localT);
    default:
      return k1.value + (k2.value - k1.value) * localT;
  }
}

/**
 * Evaluate all channels of an action at the given time.
 * Returns a map of targetId -> property -> value.
 */
export function evaluateAction(
  action: AnimationAction,
  time: number
): Map<string, Map<string, number>> {
  const result = new Map<string, Map<string, number>>();

  // Handle looping
  let evalTime = time;
  if (action.loop && action.duration > 0) {
    evalTime = ((time % action.duration) + action.duration) % action.duration;
  } else {
    evalTime = Math.max(0, Math.min(time, action.duration));
  }

  for (const channel of action.channels) {
    const value = evaluateChannel(channel, evalTime);

    let targetMap = result.get(channel.targetId);
    if (!targetMap) {
      targetMap = new Map<string, number>();
      result.set(channel.targetId, targetMap);
    }
    targetMap.set(channel.property, value);
  }

  return result;
}

/**
 * Add a keyframe to a channel at the given time, maintaining sorted order.
 * Returns the newly created keyframe.
 */
export function addKeyframe(
  channel: AnimationChannel,
  time: number,
  value: number
): Keyframe {
  const keyframe: Keyframe = {
    time,
    value,
    inTangent: [-1, 0],
    outTangent: [1, 0],
    interpolation: 'bezier',
  };

  // Find insertion index (maintain sorted order by time)
  let insertIdx = channel.keyframes.length;
  for (let i = 0; i < channel.keyframes.length; i++) {
    if (channel.keyframes[i].time > time) {
      insertIdx = i;
      break;
    }
    // If a keyframe already exists at this time, replace it
    if (channel.keyframes[i].time === time) {
      channel.keyframes[i] = keyframe;
      return keyframe;
    }
  }

  channel.keyframes.splice(insertIdx, 0, keyframe);
  return keyframe;
}

/**
 * Remove a keyframe from a channel by index.
 */
export function removeKeyframe(channel: AnimationChannel, index: number): void {
  if (index >= 0 && index < channel.keyframes.length) {
    channel.keyframes.splice(index, 1);
  }
}
