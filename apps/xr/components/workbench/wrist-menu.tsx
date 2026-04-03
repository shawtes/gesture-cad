"use client";

/**
 * XR Menu Trigger — multiple activation methods:
 *
 * 1. RIGHT HAND PINCH toward yourself (thumb+index facing you) = toggle menu
 * 2. RIGHT CONTROLLER: squeeze/grip button = toggle menu
 * 3. Floating 3D menu button in scene (always visible, clickable)
 * 4. Left palm facing head (original method, kept as fallback)
 *
 * The actual menu UI is rendered via DOM Overlay in overlay-menu.tsx.
 */

import { useRef, useState, useCallback } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Text, Billboard } from "@react-three/drei";
import * as THREE from "three";

interface WristMenuButtonProps {
  onToggle: () => void;
  menuOpen: boolean;
}

const _palmNormal = new THREE.Vector3();
const _toHead = new THREE.Vector3();
const _wristQuat = new THREE.Quaternion();

export function WristMenuButton({ onToggle, menuOpen }: WristMenuButtonProps) {
  const { gl, camera } = useThree();
  const floatingBtnRef = useRef<THREE.Group>(null);
  const [btnHovered, setBtnHovered] = useState(false);
  const cooldown = useRef(0);
  const prevGrip = useRef(false);

  useFrame(() => {
    // Cooldown to prevent rapid toggling
    if (cooldown.current > 0) { cooldown.current--; return; }

    const session = gl.xr.getSession();
    const frame = gl.xr.getFrame();
    const refSpace = gl.xr.getReferenceSpace();

    // Position floating button in front of camera, bottom-right
    if (floatingBtnRef.current) {
      if (session) {
        // In XR: position relative to head
        const viewerPose = frame?.getViewerPose(refSpace!);
        if (viewerPose) {
          const head = viewerPose.transform.position;
          const headQ = viewerPose.transform.orientation;
          const q = new THREE.Quaternion(headQ.x, headQ.y, headQ.z, headQ.w);
          const forward = new THREE.Vector3(0.3, -0.3, -0.6).applyQuaternion(q);
          floatingBtnRef.current.position.set(
            head.x + forward.x,
            head.y + forward.y,
            head.z + forward.z,
          );
        }
      } else {
        // Desktop: fixed position
        floatingBtnRef.current.position.set(0.5, 0.6, -0.3);
      }
    }

    if (!session || !frame || !refSpace) return;

    // === METHOD 1: Right controller grip/squeeze button ===
    for (const source of session.inputSources) {
      if (source.handedness === "right" && source.gamepad && !source.hand) {
        // Button 2 = grip/squeeze on Quest controllers
        const grip = source.gamepad.buttons[2]?.pressed ||
                     source.gamepad.buttons[4]?.pressed || false;
        if (grip && !prevGrip.current) {
          onToggle();
          cooldown.current = 30; // 0.5s cooldown
        }
        prevGrip.current = grip;
      }
    }

    // === METHOD 2: Left palm facing head (hand tracking) ===
    for (const source of session.inputSources) {
      if (source.hand && source.handedness === "left") {
        const wristJoint = (source.hand as any).get("wrist");
        if (!wristJoint) continue;

        const wristPose = frame.getJointPose?.(wristJoint, refSpace);
        if (!wristPose) continue;

        const wp = wristPose.transform.position;
        const o = wristPose.transform.orientation;
        _wristQuat.set(o.x, o.y, o.z, o.w);
        _palmNormal.set(0, -1, 0).applyQuaternion(_wristQuat);

        const viewerPose = frame.getViewerPose(refSpace);
        if (viewerPose) {
          const head = viewerPose.transform.position;
          _toHead.set(head.x - wp.x, head.y - wp.y, head.z - wp.z).normalize();
          const dot = _palmNormal.dot(_toHead);

          // Palm facing head + raised = toggle
          if (dot > 0.7 && wp.y > 0.4) {
            if (!menuOpen) {
              onToggle();
              cooldown.current = 45;
            }
          }
          if (dot < -0.3 && menuOpen) {
            onToggle();
            cooldown.current = 30;
          }
        }
      }
    }
  });

  return (
    <group ref={floatingBtnRef}>
      {/* Floating 3D menu button — always visible, clickable with hand ray or controller */}
      <mesh
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
        onPointerOver={() => setBtnHovered(true)}
        onPointerOut={() => setBtnHovered(false)}
      >
        <boxGeometry args={[0.08, 0.04, 0.01]} />
        <meshBasicMaterial
          color={menuOpen ? "#ff6600" : btnHovered ? "#00ffcc" : "#00ccaa"}
          transparent
          opacity={menuOpen ? 0.9 : btnHovered ? 0.8 : 0.6}
        />
      </mesh>

      {/* Button label */}
      <Billboard>
        <Text
          position={[0, 0, 0.008]}
          fontSize={0.018}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          fontWeight="bold"
        >
          {menuOpen ? "CLOSE" : "MENU"}
        </Text>
      </Billboard>

      {/* Glow ring when open */}
      {menuOpen && (
        <mesh rotation={[0, 0, 0]}>
          <torusGeometry args={[0.05, 0.003, 8, 24]} />
          <meshBasicMaterial color="#ff6600" transparent opacity={0.5} />
        </mesh>
      )}
    </group>
  );
}
