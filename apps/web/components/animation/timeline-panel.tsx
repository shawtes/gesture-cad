'use client';

import { useCallback, useRef, type MouseEvent } from 'react';
import type { AnimationAction, AnimationChannel } from '../../lib/animation/timeline';

export interface TimelinePanelProps {
  action: AnimationAction | null;
  currentTime: number;
  isPlaying: boolean;
  fps: number;
  onTimeChange: (time: number) => void;
  onPlay: () => void;
  onPause: () => void;
  onKeyframeAdd: (channelId: string, time: number) => void;
  onKeyframeDelete: (channelId: string, index: number) => void;
}

const RULER_HEIGHT = 28;
const ROW_HEIGHT = 32;
const LEFT_LABEL_WIDTH = 180;
const KEYFRAME_SIZE = 10;
const PIXELS_PER_SECOND = 120;

const styles = {
  container: {
    position: 'fixed' as const,
    bottom: 0,
    left: 0,
    right: 0,
    height: 300,
    backgroundColor: '#1a1a1a',
    borderTop: '1px solid #333',
    display: 'flex',
    flexDirection: 'column' as const,
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#ccc',
    userSelect: 'none' as const,
    zIndex: 100,
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '4px 8px',
    borderBottom: '1px solid #333',
    backgroundColor: '#222',
  },
  button: {
    background: '#333',
    border: '1px solid #555',
    color: '#ccc',
    padding: '4px 10px',
    borderRadius: 3,
    cursor: 'pointer',
    fontSize: 12,
  },
  timeDisplay: {
    marginLeft: 'auto',
    color: '#888',
    fontSize: 11,
  },
  body: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  },
  labels: {
    width: LEFT_LABEL_WIDTH,
    flexShrink: 0,
    borderRight: '1px solid #333',
    overflow: 'hidden',
  },
  labelHeader: {
    height: RULER_HEIGHT,
    borderBottom: '1px solid #333',
    padding: '4px 8px',
    color: '#888',
    fontSize: 11,
  },
  labelRow: {
    height: ROW_HEIGHT,
    padding: '0 8px',
    display: 'flex',
    alignItems: 'center',
    borderBottom: '1px solid #2a2a2a',
    overflow: 'hidden',
    textOverflow: 'ellipsis' as const,
    whiteSpace: 'nowrap' as const,
  },
  timelineArea: {
    flex: 1,
    overflow: 'auto',
    position: 'relative' as const,
  },
  ruler: {
    height: RULER_HEIGHT,
    position: 'sticky' as const,
    top: 0,
    backgroundColor: '#1a1a1a',
    borderBottom: '1px solid #333',
    zIndex: 2,
    cursor: 'pointer',
  },
  channelRow: {
    height: ROW_HEIGHT,
    position: 'relative' as const,
    borderBottom: '1px solid #2a2a2a',
    cursor: 'pointer',
  },
  keyframeDiamond: {
    position: 'absolute' as const,
    width: KEYFRAME_SIZE,
    height: KEYFRAME_SIZE,
    backgroundColor: '#f59e0b',
    transform: 'rotate(45deg)',
    cursor: 'pointer',
    border: '1px solid #d97706',
  },
  playhead: {
    position: 'absolute' as const,
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: '#ef4444',
    zIndex: 3,
    pointerEvents: 'none' as const,
  },
  playheadHandle: {
    position: 'absolute' as const,
    top: 0,
    left: -5,
    width: 12,
    height: 12,
    backgroundColor: '#ef4444',
    clipPath: 'polygon(0 0, 100% 0, 50% 100%)',
  },
  emptyState: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: '#555',
    fontSize: 14,
  },
} as const;

function formatTime(time: number, fps: number): string {
  const totalFrames = Math.round(time * fps);
  const seconds = Math.floor(time);
  const frames = totalFrames % fps;
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}:${String(frames).padStart(2, '0')}`;
}

function timeToX(time: number): number {
  return time * PIXELS_PER_SECOND;
}

function xToTime(x: number): number {
  return Math.max(0, x / PIXELS_PER_SECOND);
}

export function TimelinePanel({
  action,
  currentTime,
  isPlaying,
  fps,
  onTimeChange,
  onPlay,
  onPause,
  onKeyframeAdd,
  onKeyframeDelete,
}: TimelinePanelProps) {
  const timelineRef = useRef<HTMLDivElement>(null);

  const handleRulerClick = useCallback(
    (e: MouseEvent<HTMLCanvasElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const scrollLeft = timelineRef.current?.scrollLeft ?? 0;
      const x = e.clientX - rect.left + scrollLeft;
      onTimeChange(xToTime(x));
    },
    [onTimeChange]
  );

  const handleChannelDoubleClick = useCallback(
    (channelId: string, e: MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const scrollLeft = timelineRef.current?.scrollLeft ?? 0;
      const x = e.clientX - rect.left + scrollLeft;
      const time = xToTime(x);
      // Snap to frame
      const snappedTime = Math.round(time * fps) / fps;
      onKeyframeAdd(channelId, snappedTime);
    },
    [fps, onKeyframeAdd]
  );

  const handleKeyframeClick = useCallback(
    (channelId: string, index: number, e: MouseEvent<HTMLDivElement>) => {
      e.stopPropagation();
      // Right-click or ctrl+click to delete
      if (e.ctrlKey || e.metaKey) {
        onKeyframeDelete(channelId, index);
      }
    },
    [onKeyframeDelete]
  );

  const totalWidth = action ? Math.max(action.duration * PIXELS_PER_SECOND + 200, 800) : 800;

  const renderRuler = () => {
    const duration = action?.duration ?? 5;
    const ticks: React.ReactNode[] = [];
    const tickInterval = 1; // 1 second
    const subTicks = 4;

    for (let t = 0; t <= duration + 1; t += tickInterval) {
      const x = timeToX(t);
      ticks.push(
        <div
          key={`major-${t}`}
          style={{
            position: 'absolute',
            left: x,
            top: 0,
            height: '100%',
            borderLeft: '1px solid #555',
          }}
        >
          <span
            style={{
              position: 'absolute',
              top: 2,
              left: 4,
              fontSize: 10,
              color: '#888',
            }}
          >
            {t}s
          </span>
        </div>
      );

      for (let s = 1; s < subTicks; s++) {
        const subX = timeToX(t + (s * tickInterval) / subTicks);
        ticks.push(
          <div
            key={`minor-${t}-${s}`}
            style={{
              position: 'absolute',
              left: subX,
              bottom: 0,
              height: 8,
              borderLeft: '1px solid #3a3a3a',
            }}
          />
        );
      }
    }

    return ticks;
  };

  const renderChannel = (channel: AnimationChannel) => (
    <div
      key={channel.id}
      style={styles.channelRow}
      onDoubleClick={(e) => handleChannelDoubleClick(channel.id, e)}
    >
      {channel.keyframes.map((kf, idx) => {
        const x = timeToX(kf.time);
        return (
          <div
            key={`${channel.id}-kf-${idx}`}
            style={{
              ...styles.keyframeDiamond,
              left: x - KEYFRAME_SIZE / 2,
              top: (ROW_HEIGHT - KEYFRAME_SIZE) / 2,
            }}
            onClick={(e) => handleKeyframeClick(channel.id, idx, e)}
            title={`${kf.time.toFixed(2)}s: ${kf.value.toFixed(3)}`}
          />
        );
      })}
    </div>
  );

  if (!action) {
    return (
      <div style={styles.container}>
        <div style={styles.toolbar}>
          <span style={{ color: '#888' }}>Animation Timeline</span>
        </div>
        <div style={styles.emptyState}>No animation action selected</div>
      </div>
    );
  }

  const playheadX = timeToX(currentTime);

  return (
    <div style={styles.container}>
      {/* Transport controls */}
      <div style={styles.toolbar}>
        <button
          type="button"
          style={styles.button}
          onClick={isPlaying ? onPause : onPlay}
        >
          {isPlaying ? '\u23F8 Pause' : '\u25B6 Play'}
        </button>
        <button
          type="button"
          style={styles.button}
          onClick={() => onTimeChange(0)}
        >
          \u23F9 Stop
        </button>
        <span style={{ color: '#888', fontSize: 11 }}>
          {action.name} | {action.duration.toFixed(1)}s | {action.channels.length} channels
        </span>
        <span style={styles.timeDisplay}>{formatTime(currentTime, fps)}</span>
      </div>

      {/* Body: labels + timeline */}
      <div style={styles.body}>
        {/* Channel labels */}
        <div style={styles.labels}>
          <div style={styles.labelHeader}>Channel</div>
          {action.channels.map((ch) => (
            <div key={ch.id} style={styles.labelRow}>
              {ch.targetId}.{ch.property}
            </div>
          ))}
        </div>

        {/* Timeline area */}
        <div style={styles.timelineArea} ref={timelineRef}>
          <div style={{ width: totalWidth, position: 'relative' }}>
            {/* Ruler */}
            <div
              style={{ ...styles.ruler, width: totalWidth }}
              onClick={handleRulerClick as unknown as React.MouseEventHandler<HTMLDivElement>}
            >
              {renderRuler()}
            </div>

            {/* Channel rows */}
            {action.channels.map(renderChannel)}

            {/* Playhead */}
            <div style={{ ...styles.playhead, left: playheadX }}>
              <div style={styles.playheadHandle} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
