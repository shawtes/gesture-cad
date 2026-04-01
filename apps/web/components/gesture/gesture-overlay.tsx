"use client";

import { useEffect, useRef, useCallback, useState } from "react";

interface GestureOverlayProps {
  onGestureDetected: (gesture: string) => void;
  onFpsUpdate: (fps: number) => void;
  onTrackingStatusChange: (active: boolean) => void;
}

const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],       // thumb
  [0, 5], [5, 6], [6, 7], [7, 8],       // index
  [0, 9], [9, 10], [10, 11], [11, 12],  // middle
  [0, 13], [13, 14], [14, 15], [15, 16],// ring
  [0, 17], [17, 18], [18, 19], [19, 20],// pinky
  [5, 9], [9, 13], [13, 17],            // palm
];

function classifyGesture(landmarks: { x: number; y: number; z: number }[]): string {
  if (landmarks.length < 21) return "none";

  const thumbTip = landmarks[4];
  const indexTip = landmarks[8];
  const middleTip = landmarks[12];
  const ringTip = landmarks[16];
  const pinkyTip = landmarks[20];

  const indexMcp = landmarks[5];
  const middleMcp = landmarks[9];
  const ringMcp = landmarks[13];
  const pinkyMcp = landmarks[17];
  const wrist = landmarks[0];

  const isExtended = (tip: typeof wrist, mcp: typeof wrist) =>
    tip.y < mcp.y - 0.04;

  const indexUp = isExtended(indexTip, indexMcp);
  const middleUp = isExtended(middleTip, middleMcp);
  const ringUp = isExtended(ringTip, ringMcp);
  const pinkyUp = isExtended(pinkyTip, pinkyMcp);
  const thumbOut = Math.abs(thumbTip.x - wrist.x) > 0.06;

  // Pinch: thumb and index tips close together
  const pinchDist = Math.hypot(
    thumbTip.x - indexTip.x,
    thumbTip.y - indexTip.y,
    thumbTip.z - indexTip.z
  );
  if (pinchDist < 0.05) return "pinch";

  // Fist: no fingers extended
  if (!indexUp && !middleUp && !ringUp && !pinkyUp && !thumbOut) return "fist";

  // Open palm: all fingers extended
  if (indexUp && middleUp && ringUp && pinkyUp) return "open_palm";

  // Point: only index extended
  if (indexUp && !middleUp && !ringUp && !pinkyUp) return "point";

  // Peace: index + middle extended
  if (indexUp && middleUp && !ringUp && !pinkyUp) return "peace";

  // Three fingers: index + middle + ring
  if (indexUp && middleUp && ringUp && !pinkyUp) return "three_fingers";

  // Thumbs up: only thumb extended
  if (thumbOut && !indexUp && !middleUp && !ringUp && !pinkyUp) return "thumbs_up";

  return "unknown";
}

export function GestureOverlay({
  onGestureDetected,
  onFpsUpdate,
  onTrackingStatusChange,
}: GestureOverlayProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const frameCountRef = useRef(0);
  const lastFpsTimeRef = useRef(Date.now());
  const animFrameRef = useRef<number>(0);
  const handLandmarkerRef = useRef<any>(null);

  const drawHand = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      landmarks: { x: number; y: number; z: number }[],
      width: number,
      height: number
    ) => {
      // Draw connections
      ctx.strokeStyle = "#3b82f6";
      ctx.lineWidth = 2;
      for (const [start, end] of HAND_CONNECTIONS) {
        const s = landmarks[start];
        const e = landmarks[end];
        ctx.beginPath();
        ctx.moveTo(s.x * width, s.y * height);
        ctx.lineTo(e.x * width, e.y * height);
        ctx.stroke();
      }

      // Draw landmarks
      for (const lm of landmarks) {
        ctx.fillStyle = "#22c55e";
        ctx.beginPath();
        ctx.arc(lm.x * width, lm.y * height, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    },
    []
  );

  const startTracking = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraEnabled(true);
        onTrackingStatusChange(true);
      }

      // Load MediaPipe HandLandmarker
      const vision = await import("@mediapipe/tasks-vision");
      const { HandLandmarker, FilesetResolver } = vision;

      const filesetResolver = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      );

      handLandmarkerRef.current = await HandLandmarker.createFromOptions(
        filesetResolver,
        {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numHands: 2,
          minHandDetectionConfidence: 0.5,
          minHandPresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        }
      );

      // Start detection loop
      const detect = () => {
        if (!videoRef.current || !canvasRef.current || !handLandmarkerRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        if (!ctx || video.readyState < 2) {
          animFrameRef.current = requestAnimationFrame(detect);
          return;
        }

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Mirror the video feed
        ctx.save();
        ctx.scale(-1, 1);
        ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
        ctx.restore();

        const results = handLandmarkerRef.current.detectForVideo(
          video,
          performance.now()
        );

        if (results.landmarks && results.landmarks.length > 0) {
          for (const hand of results.landmarks) {
            // Mirror landmarks for display
            const mirrored = hand.map((lm: any) => ({
              ...lm,
              x: 1 - lm.x,
            }));
            drawHand(ctx, mirrored, canvas.width, canvas.height);
          }
          const gesture = classifyGesture(results.landmarks[0]);
          onGestureDetected(gesture);
        } else {
          onGestureDetected("none");
        }

        // FPS calculation
        frameCountRef.current++;
        const now = Date.now();
        if (now - lastFpsTimeRef.current >= 1000) {
          onFpsUpdate(frameCountRef.current);
          frameCountRef.current = 0;
          lastFpsTimeRef.current = now;
        }

        animFrameRef.current = requestAnimationFrame(detect);
      };

      detect();
    } catch (err: any) {
      setError(err.message || "Failed to access camera");
      onTrackingStatusChange(false);
    }
  }, [onGestureDetected, onFpsUpdate, onTrackingStatusChange, drawHand]);

  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream)
          .getTracks()
          .forEach((t) => t.stop());
      }
    };
  }, []);

  if (error) {
    return (
      <div style={styles.errorBanner}>
        Camera error: {error}
      </div>
    );
  }

  return (
    <>
      {/* Hidden video element for webcam capture */}
      <video
        ref={videoRef}
        style={{ display: "none" }}
        playsInline
        muted
      />

      {/* Hand skeleton overlay (bottom-left picture-in-picture) */}
      {cameraEnabled && (
        <canvas
          ref={canvasRef}
          style={styles.pipCanvas}
        />
      )}

      {/* Camera toggle button */}
      {!cameraEnabled && (
        <button onClick={startTracking} style={styles.enableButton}>
          Enable Hand Tracking
        </button>
      )}
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  pipCanvas: {
    position: "absolute",
    bottom: 12,
    left: 12,
    width: 240,
    height: 180,
    borderRadius: 8,
    border: "1px solid #2a2a2a",
    background: "#000",
    zIndex: 10,
    opacity: 0.9,
  },
  enableButton: {
    position: "absolute",
    bottom: 60,
    left: 12,
    padding: "8px 16px",
    background: "#3b82f6",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
    fontFamily: "inherit",
    fontSize: 13,
    zIndex: 10,
  },
  errorBanner: {
    position: "absolute",
    top: 8,
    left: "50%",
    transform: "translateX(-50%)",
    padding: "6px 16px",
    background: "#ef4444",
    color: "#fff",
    borderRadius: 6,
    fontSize: 13,
    zIndex: 20,
  },
};
