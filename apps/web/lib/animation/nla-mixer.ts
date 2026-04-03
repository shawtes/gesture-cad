// Non-Linear Animation mixing system

import type { AnimationAction } from './timeline';
import { evaluateAction } from './timeline';

export interface NLAStrip {
  id: string;
  actionId: string;
  startTime: number;
  endTime: number;
  blendIn: number;
  blendOut: number;
  scale: number;
  repeat: number;
  weight: number;
  muted: boolean;
}

export interface NLATrack {
  id: string;
  name: string;
  strips: NLAStrip[];
}

/**
 * Non-Linear Animation mixer.
 * Evaluates stacked tracks of animation strips, blending them additively from bottom to top.
 */
export class NLAMixer {
  tracks: NLATrack[] = [];

  addTrack(name: string): NLATrack {
    const track: NLATrack = {
      id: `track_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name,
      strips: [],
    };
    this.tracks.push(track);
    return track;
  }

  addStrip(trackId: string, strip: NLAStrip): void {
    const track = this.tracks.find((t) => t.id === trackId);
    if (track) {
      track.strips.push(strip);
    }
  }

  /**
   * Evaluate all tracks at the given time.
   * For each track, find the active strip, evaluate its action, and blend with weight.
   * Tracks are stacked additively from first (bottom) to last (top).
   */
  evaluate(
    time: number,
    actions: Map<string, AnimationAction>
  ): Map<string, Map<string, number>> {
    const result = new Map<string, Map<string, number>>();

    for (const track of this.tracks) {
      for (const strip of track.strips) {
        if (strip.muted) continue;
        if (time < strip.startTime || time > strip.endTime) continue;

        const action = actions.get(strip.actionId);
        if (!action) continue;

        // Map global time to local action time
        const stripDuration = strip.endTime - strip.startTime;
        if (stripDuration <= 0) continue;

        const localTimeNorm = (time - strip.startTime) / stripDuration;
        const scaledDuration = action.duration * strip.scale;
        const totalDuration = scaledDuration > 0 ? scaledDuration : action.duration;

        // Handle repeat: local time wraps within the action
        let localTime = localTimeNorm * totalDuration * strip.repeat;
        if (totalDuration > 0) {
          localTime = ((localTime % totalDuration) + totalDuration) % totalDuration;
        }

        // Calculate blend weight
        let blendWeight = strip.weight;
        const elapsed = time - strip.startTime;
        const remaining = strip.endTime - time;

        if (strip.blendIn > 0 && elapsed < strip.blendIn) {
          blendWeight *= elapsed / strip.blendIn;
        }
        if (strip.blendOut > 0 && remaining < strip.blendOut) {
          blendWeight *= remaining / strip.blendOut;
        }

        // Evaluate the action at local time
        const actionResult = evaluateAction(action, localTime);

        // Blend into result (additive)
        for (const [targetId, propMap] of actionResult) {
          let targetMap = result.get(targetId);
          if (!targetMap) {
            targetMap = new Map<string, number>();
            result.set(targetId, targetMap);
          }
          for (const [prop, value] of propMap) {
            const existing = targetMap.get(prop) ?? 0;
            targetMap.set(prop, existing + value * blendWeight);
          }
        }
      }
    }

    return result;
  }
}
