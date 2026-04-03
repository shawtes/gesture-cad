"use client";

/**
 * Wrist Menu — 3D wrist button only (no Html).
 * The actual menu UI is rendered via DOM Overlay in overlay-menu.tsx.
 * This component just provides the 3D button at the wrist + palm detection.
 */

import { useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

interface WristMenuButtonProps {
  onToggle: () => void;
  menuOpen: boolean;
}

const _palmNormal = new THREE.Vector3();
const _toHead = new THREE.Vector3();
const _wristQuat = new THREE.Quaternion();
const _wristPos = new THREE.Vector3();

export function WristMenuButton({ onToggle, menuOpen }: WristMenuButtonProps) {
  const { gl } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const [visible, setVisible] = useState(false);
  const frameCount = useRef(0);

  useFrame(() => {
    const session = gl.xr.getSession();
    const frame = gl.xr.getFrame();
    const refSpace = gl.xr.getReferenceSpace();
    if (!session || !frame || !refSpace || !groupRef.current) {
      setVisible(false);
      return;
    }

    for (const source of session.inputSources) {
      if (source.hand && source.handedness === "left") {
        const wristJoint = (source.hand as any).get("wrist");
        if (!wristJoint) continue;

        const wristPose = frame.getJointPose?.(wristJoint, refSpace);
        if (!wristPose) continue;

        const wp = wristPose.transform.position;
        _wristPos.set(wp.x, wp.y, wp.z);
        groupRef.current.position.lerp(_wristPos, 0.5);
        setVisible(true);

        // Auto-toggle on palm facing head
        const o = wristPose.transform.orientation;
        _wristQuat.set(o.x, o.y, o.z, o.w);
        _palmNormal.set(0, -1, 0).applyQuaternion(_wristQuat);

        const viewerPose = frame.getViewerPose(refSpace);
        if (viewerPose) {
          const head = viewerPose.transform.position;
          _toHead.set(head.x - wp.x, head.y - wp.y, head.z - wp.z).normalize();
          const dot = _palmNormal.dot(_toHead);

          if (dot > 0.6 && _wristPos.y > 0.3) {
            frameCount.current++;
            if (frameCount.current === 15 && !menuOpen) onToggle();
          } else {
            if (frameCount.current > 0) frameCount.current = Math.max(0, frameCount.current - 2);
            if (frameCount.current === 0 && dot < -0.2 && menuOpen) onToggle();
          }
        }

        return;
      }
    }
    setVisible(false);
  });

  if (!visible) return null;

  return (
    <group ref={groupRef}>
      <mesh position={[0, 0.03, 0]} onClick={onToggle}>
        <cylinderGeometry args={[0.018, 0.018, 0.006, 16]} />
        <meshBasicMaterial
          color={menuOpen ? "#00ffcc" : "#ffffff"}
          transparent
          opacity={menuOpen ? 0.6 : 0.3}
        />
      </mesh>
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.02, 0.001, 8, 24]} />
        <meshBasicMaterial
          color={menuOpen ? "#00ffcc" : "#446688"}
          transparent
          opacity={0.4}
        />
      </mesh>
    </group>
  );
}
