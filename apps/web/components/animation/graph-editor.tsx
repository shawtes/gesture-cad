'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { AnimationChannel, Keyframe } from '../../lib/animation/timeline';
import { evaluateChannel } from '../../lib/animation/timeline';

export interface GraphEditorProps {
  channels: AnimationChannel[];
  selectedChannelId: string | null;
  currentTime: number;
  onKeyframeUpdate: (channelId: string, index: number, keyframe: Keyframe) => void;
  onTimeChange: (time: number) => void;
}

const PADDING = 40;
const HANDLE_RADIUS = 5;
const CURVE_COLORS = ['#ef4444', '#22c55e', '#3b82f6', '#f59e0b', '#a855f7', '#ec4899'];

interface DragState {
  channelId: string;
  keyframeIndex: number;
  handleType: 'position' | 'inTangent' | 'outTangent';
}

const styles = {
  container: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1a1a1a',
    position: 'relative' as const,
    overflow: 'hidden',
  },
  canvas: {
    display: 'block',
    cursor: 'crosshair',
  },
  legend: {
    position: 'absolute' as const,
    top: 8,
    right: 8,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 4,
    fontSize: 11,
    fontFamily: 'monospace',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    color: '#aaa',
  },
  legendSwatch: {
    width: 12,
    height: 3,
    borderRadius: 1,
  },
} as const;

export function GraphEditor({
  channels,
  selectedChannelId,
  currentTime,
  onKeyframeUpdate,
  onTimeChange,
}: GraphEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 400 });

  // Compute time and value ranges
  const timeRange = { min: 0, max: 5 };
  const valueRange = { min: -2, max: 2 };

  for (const ch of channels) {
    for (const kf of ch.keyframes) {
      if (kf.time > timeRange.max) timeRange.max = kf.time + 0.5;
      if (kf.value < valueRange.min) valueRange.min = kf.value - 0.5;
      if (kf.value > valueRange.max) valueRange.max = kf.value + 0.5;
    }
  }

  const timeToX = useCallback(
    (t: number): number => {
      return PADDING + ((t - timeRange.min) / (timeRange.max - timeRange.min)) * (canvasSize.width - 2 * PADDING);
    },
    [timeRange.min, timeRange.max, canvasSize.width]
  );

  const valueToY = useCallback(
    (v: number): number => {
      return canvasSize.height - PADDING - ((v - valueRange.min) / (valueRange.max - valueRange.min)) * (canvasSize.height - 2 * PADDING);
    },
    [valueRange.min, valueRange.max, canvasSize.height]
  );

  const xToTime = useCallback(
    (x: number): number => {
      return timeRange.min + ((x - PADDING) / (canvasSize.width - 2 * PADDING)) * (timeRange.max - timeRange.min);
    },
    [timeRange.min, timeRange.max, canvasSize.width]
  );

  const yToValue = useCallback(
    (y: number): number => {
      return valueRange.min + ((canvasSize.height - PADDING - y) / (canvasSize.height - 2 * PADDING)) * (valueRange.max - valueRange.min);
    },
    [valueRange.min, valueRange.max, canvasSize.height]
  );

  // Resize observer
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setCanvasSize({ width: Math.floor(width), height: Math.floor(height) });
        }
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Draw
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvasSize;
    canvas.width = width;
    canvas.height = height;

    // Clear
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, width, height);

    // Grid
    ctx.strokeStyle = '#2a2a2a';
    ctx.lineWidth = 1;

    // Vertical grid (time)
    const timeStep = Math.max(0.5, Math.ceil((timeRange.max - timeRange.min) / 10) * 0.5);
    for (let t = Math.ceil(timeRange.min / timeStep) * timeStep; t <= timeRange.max; t += timeStep) {
      const x = timeToX(t);
      ctx.beginPath();
      ctx.moveTo(x, PADDING);
      ctx.lineTo(x, height - PADDING);
      ctx.stroke();

      ctx.fillStyle = '#555';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${t.toFixed(1)}s`, x, height - PADDING + 14);
    }

    // Horizontal grid (value)
    const valStep = Math.max(0.1, Math.ceil((valueRange.max - valueRange.min) / 8) * 0.25);
    for (let v = Math.ceil(valueRange.min / valStep) * valStep; v <= valueRange.max; v += valStep) {
      const y = valueToY(v);
      ctx.beginPath();
      ctx.moveTo(PADDING, y);
      ctx.lineTo(width - PADDING, y);
      ctx.stroke();

      ctx.fillStyle = '#555';
      ctx.font = '10px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(v.toFixed(2), PADDING - 4, y + 3);
    }

    // Zero line
    const zeroY = valueToY(0);
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PADDING, zeroY);
    ctx.lineTo(width - PADDING, zeroY);
    ctx.stroke();

    // Draw curves
    const visibleChannels = selectedChannelId
      ? channels.filter((c) => c.id === selectedChannelId)
      : channels;

    visibleChannels.forEach((channel, chIdx) => {
      const color = CURVE_COLORS[chIdx % CURVE_COLORS.length];
      const isSelected = channel.id === selectedChannelId;

      // Sample and draw curve
      ctx.strokeStyle = color;
      ctx.lineWidth = isSelected ? 2.5 : 1.5;
      ctx.globalAlpha = isSelected ? 1 : 0.6;
      ctx.beginPath();

      const sampleCount = Math.max(200, width);
      for (let i = 0; i <= sampleCount; i++) {
        const t = timeRange.min + (i / sampleCount) * (timeRange.max - timeRange.min);
        const v = evaluateChannel(channel, t);
        const x = timeToX(t);
        const y = valueToY(v);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;

      // Draw keyframes and handles
      for (const kf of channel.keyframes) {
        const kx = timeToX(kf.time);
        const ky = valueToY(kf.value);

        // Tangent handles (only for selected channel)
        if (isSelected && kf.interpolation === 'bezier') {
          const inHx = timeToX(kf.time + kf.inTangent[0]);
          const inHy = valueToY(kf.value + kf.inTangent[1]);
          const outHx = timeToX(kf.time + kf.outTangent[0]);
          const outHy = valueToY(kf.value + kf.outTangent[1]);

          // Handle lines
          ctx.strokeStyle = '#666';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(inHx, inHy);
          ctx.lineTo(kx, ky);
          ctx.lineTo(outHx, outHy);
          ctx.stroke();

          // Handle dots
          ctx.fillStyle = '#aaa';
          ctx.beginPath();
          ctx.arc(inHx, inHy, HANDLE_RADIUS - 1, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(outHx, outHy, HANDLE_RADIUS - 1, 0, Math.PI * 2);
          ctx.fill();
        }

        // Keyframe diamond
        ctx.save();
        ctx.translate(kx, ky);
        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = color;
        ctx.fillRect(-HANDLE_RADIUS, -HANDLE_RADIUS, HANDLE_RADIUS * 2, HANDLE_RADIUS * 2);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.strokeRect(-HANDLE_RADIUS, -HANDLE_RADIUS, HANDLE_RADIUS * 2, HANDLE_RADIUS * 2);
        ctx.restore();
      }
    });

    // Playhead
    const phX = timeToX(currentTime);
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(phX, PADDING);
    ctx.lineTo(phX, height - PADDING);
    ctx.stroke();

    // Playhead triangle
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(phX - 6, PADDING);
    ctx.lineTo(phX + 6, PADDING);
    ctx.lineTo(phX, PADDING + 10);
    ctx.closePath();
    ctx.fill();
  }, [channels, selectedChannelId, currentTime, canvasSize, timeToX, valueToY, timeRange, valueRange]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      // Check if clicking on a keyframe or handle
      const visibleChannels = selectedChannelId
        ? channels.filter((c) => c.id === selectedChannelId)
        : channels;

      for (const channel of visibleChannels) {
        for (let i = 0; i < channel.keyframes.length; i++) {
          const kf = channel.keyframes[i];
          const kx = timeToX(kf.time);
          const ky = valueToY(kf.value);

          // Check tangent handles first
          if (kf.interpolation === 'bezier' && channel.id === selectedChannelId) {
            const inHx = timeToX(kf.time + kf.inTangent[0]);
            const inHy = valueToY(kf.value + kf.inTangent[1]);
            if (Math.hypot(mx - inHx, my - inHy) < HANDLE_RADIUS + 3) {
              setDragState({ channelId: channel.id, keyframeIndex: i, handleType: 'inTangent' });
              return;
            }

            const outHx = timeToX(kf.time + kf.outTangent[0]);
            const outHy = valueToY(kf.value + kf.outTangent[1]);
            if (Math.hypot(mx - outHx, my - outHy) < HANDLE_RADIUS + 3) {
              setDragState({ channelId: channel.id, keyframeIndex: i, handleType: 'outTangent' });
              return;
            }
          }

          // Check keyframe position
          if (Math.hypot(mx - kx, my - ky) < HANDLE_RADIUS + 4) {
            setDragState({ channelId: channel.id, keyframeIndex: i, handleType: 'position' });
            return;
          }
        }
      }

      // Click on empty space scrubs the playhead
      onTimeChange(Math.max(0, xToTime(mx)));
    },
    [channels, selectedChannelId, timeToX, valueToY, xToTime, onTimeChange]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!dragState) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      const channel = channels.find((c) => c.id === dragState.channelId);
      if (!channel) return;
      const kf = channel.keyframes[dragState.keyframeIndex];
      if (!kf) return;

      const t = xToTime(mx);
      const v = yToValue(my);

      let updated: Keyframe;
      switch (dragState.handleType) {
        case 'position':
          updated = { ...kf, time: Math.max(0, t), value: v };
          break;
        case 'inTangent':
          updated = { ...kf, inTangent: [t - kf.time, v - kf.value] };
          break;
        case 'outTangent':
          updated = { ...kf, outTangent: [t - kf.time, v - kf.value] };
          break;
        default:
          return;
      }

      onKeyframeUpdate(dragState.channelId, dragState.keyframeIndex, updated);
    },
    [dragState, channels, xToTime, yToValue, onKeyframeUpdate]
  );

  const handleMouseUp = useCallback(() => {
    setDragState(null);
  }, []);

  return (
    <div ref={containerRef} style={styles.container}>
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        style={styles.canvas}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
      {/* Legend */}
      <div style={styles.legend}>
        {channels.map((ch, idx) => (
          <div key={ch.id} style={styles.legendItem}>
            <div
              style={{
                ...styles.legendSwatch,
                backgroundColor: CURVE_COLORS[idx % CURVE_COLORS.length],
              }}
            />
            {ch.targetId}.{ch.property}
          </div>
        ))}
      </div>
    </div>
  );
}
