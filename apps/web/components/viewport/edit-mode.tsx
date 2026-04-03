"use client";

/**
 * Edit Mode: vertex/edge/face selection and manipulation in the 3D viewport.
 * Renders selection highlights and handles click-to-select via raycasting.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useThree, useFrame } from "@react-three/fiber";
import {
  HalfEdgeMesh,
  type SelectionMode,
  type MeshSelection,
  createEmptySelection,
} from "@/lib/mesh/half-edge";

// ─── Props ─────────────────────────────────────────────────

export interface EditModeProps {
  mesh: HalfEdgeMesh | null;
  active: boolean;
  selectionMode: SelectionMode;
  onSelectionChange?: (selection: MeshSelection) => void;
}

// ─── Colors ────────────────────────────────────────────────

const COLORS = {
  vertexDefault: 0x888888,
  vertexSelected: 0x3b82f6,
  vertexHovered: 0x60a5fa,
  edgeDefault: 0x444444,
  edgeSelected: 0x3b82f6,
  faceSelected: 0x3b82f6,
  faceHover: 0x60a5fa,
};

// ─── Component ─────────────────────────────────────────────

export default function EditMode({
  mesh,
  active,
  selectionMode,
  onSelectionChange,
}: EditModeProps) {
  const { camera, gl, scene } = useThree();
  const [selection, setSelection] = useState<MeshSelection>(createEmptySelection());
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const raycaster = useRef(new THREE.Raycaster());
  const mouse = useRef(new THREE.Vector2());

  // Build Three.js geometry from half-edge mesh
  const { vertexPoints, edgeLines, faceGeometry } = useMemo(() => {
    if (!mesh) {
      return { vertexPoints: null, edgeLines: null, faceGeometry: null };
    }

    // Vertex points
    const positions: number[] = [];
    const vertexIds: number[] = [];
    for (const [id, v] of mesh.vertices) {
      positions.push(v.position[0], v.position[1], v.position[2]);
      vertexIds.push(id);
    }

    const pointsGeom = new THREE.BufferGeometry();
    pointsGeom.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3)
    );

    // Edge lines
    const edgePositions: number[] = [];
    const visitedEdges = new Set<string>();
    for (const [, he] of mesh.halfEdges) {
      const origin = mesh.getOriginVertex(he);
      const key =
        origin < he.vertex
          ? `${origin}-${he.vertex}`
          : `${he.vertex}-${origin}`;
      if (visitedEdges.has(key)) continue;
      visitedEdges.add(key);

      const v1 = mesh.vertices.get(origin);
      const v2 = mesh.vertices.get(he.vertex);
      if (v1 && v2) {
        edgePositions.push(
          v1.position[0], v1.position[1], v1.position[2],
          v2.position[0], v2.position[1], v2.position[2]
        );
      }
    }

    const linesGeom = new THREE.BufferGeometry();
    linesGeom.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(edgePositions, 3)
    );

    // Face mesh for raycasting
    const tessellated = mesh.toTessellatedMesh();
    const faceGeom = new THREE.BufferGeometry();
    faceGeom.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(tessellated.vertices, 3)
    );
    faceGeom.setIndex(tessellated.indices);
    faceGeom.computeVertexNormals();

    return {
      vertexPoints: { geometry: pointsGeom, ids: vertexIds },
      edgeLines: { geometry: linesGeom },
      faceGeometry: faceGeom,
    };
  }, [mesh]);

  // Vertex colors based on selection
  const vertexColors = useMemo(() => {
    if (!vertexPoints) return null;
    const count = vertexPoints.ids.length;
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const vid = vertexPoints.ids[i];
      const isSelected = selection.vertexIds.has(vid);
      const isHovered = hoveredId === vid;
      const color = new THREE.Color(
        isSelected
          ? COLORS.vertexSelected
          : isHovered
          ? COLORS.vertexHovered
          : COLORS.vertexDefault
      );
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    return colors;
  }, [vertexPoints, selection, hoveredId]);

  // Apply vertex colors
  useEffect(() => {
    if (vertexPoints && vertexColors) {
      vertexPoints.geometry.setAttribute(
        "color",
        new THREE.Float32BufferAttribute(vertexColors, 3)
      );
    }
  }, [vertexPoints, vertexColors]);

  // Handle pointer events
  const handlePointerDown = useCallback(
    (event: THREE.Event & { point?: THREE.Vector3 }) => {
      if (!active || !mesh) return;

      const rect = gl.domElement.getBoundingClientRect();
      const nativeEvent = (event as any).nativeEvent || event;
      mouse.current.x = ((nativeEvent.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.current.y = -((nativeEvent.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.current.setFromCamera(mouse.current, camera);

      const newSelection: MeshSelection = {
        ...selection,
        mode: selectionMode,
      };

      if (selectionMode === "vertex" && vertexPoints) {
        // Find closest vertex to ray
        let closestDist = Infinity;
        let closestIdx = -1;
        const tempVec = new THREE.Vector3();

        for (let i = 0; i < vertexPoints.ids.length; i++) {
          const v = mesh.vertices.get(vertexPoints.ids[i]);
          if (!v) continue;
          tempVec.set(v.position[0], v.position[1], v.position[2]);
          const dist = raycaster.current.ray.distanceToPoint(tempVec);
          if (dist < 0.15 && dist < closestDist) {
            closestDist = dist;
            closestIdx = i;
          }
        }

        if (closestIdx >= 0) {
          const vid = vertexPoints.ids[closestIdx];
          const shift = nativeEvent.shiftKey;
          if (shift) {
            const newVerts = new Set(newSelection.vertexIds);
            if (newVerts.has(vid)) newVerts.delete(vid);
            else newVerts.add(vid);
            newSelection.vertexIds = newVerts;
          } else {
            newSelection.vertexIds = new Set([vid]);
            newSelection.edgeIds = new Set();
            newSelection.faceIds = new Set();
          }
        } else if (!nativeEvent.shiftKey) {
          newSelection.vertexIds = new Set();
          newSelection.edgeIds = new Set();
          newSelection.faceIds = new Set();
        }
      } else if (selectionMode === "face" && faceGeometry) {
        // Raycast against face mesh
        const meshObj = new THREE.Mesh(
          faceGeometry,
          new THREE.MeshBasicMaterial()
        );
        const intersects = raycaster.current.intersectObject(meshObj);

        if (intersects.length > 0) {
          const faceIndex = intersects[0].faceIndex;
          if (faceIndex !== undefined && faceIndex !== null) {
            // Map triangle index to half-edge face
            const faceIds = Array.from(mesh.faces.keys());
            const fid = faceIds[Math.min(faceIndex as number, faceIds.length - 1)];

            const shift = nativeEvent.shiftKey;
            if (shift) {
              const newFaces = new Set(newSelection.faceIds);
              if (newFaces.has(fid)) newFaces.delete(fid);
              else newFaces.add(fid);
              newSelection.faceIds = newFaces;
            } else {
              newSelection.faceIds = new Set([fid]);
              newSelection.vertexIds = new Set();
              newSelection.edgeIds = new Set();
            }
          }
        } else if (!nativeEvent.shiftKey) {
          newSelection.vertexIds = new Set();
          newSelection.edgeIds = new Set();
          newSelection.faceIds = new Set();
        }
      }

      setSelection(newSelection);
      onSelectionChange?.(newSelection);
    },
    [active, mesh, selectionMode, selection, camera, gl, vertexPoints, faceGeometry, onSelectionChange]
  );

  // Hover detection via raycasting each frame
  useFrame(() => {
    if (!active || !mesh || selectionMode !== "vertex" || !vertexPoints) return;

    const tempVec = new THREE.Vector3();
    let closestDist = Infinity;
    let closestId: number | null = null;

    for (let i = 0; i < vertexPoints.ids.length; i++) {
      const v = mesh.vertices.get(vertexPoints.ids[i]);
      if (!v) continue;
      tempVec.set(v.position[0], v.position[1], v.position[2]);
      tempVec.project(camera);
      const dx = tempVec.x - mouse.current.x;
      const dy = tempVec.y - mouse.current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 0.05 && dist < closestDist) {
        closestDist = dist;
        closestId = vertexPoints.ids[i];
      }
    }

    setHoveredId(closestId);
  });

  if (!active || !mesh) return null;

  // Face selection highlight
  const selectedFacePositions = useMemo(() => {
    if (selection.faceIds.size === 0 || !mesh) return null;
    const positions: number[] = [];
    for (const fid of selection.faceIds) {
      const verts = mesh.faceVertices(fid);
      if (verts.length < 3) continue;
      for (let i = 1; i < verts.length - 1; i++) {
        positions.push(
          verts[0].position[0], verts[0].position[1], verts[0].position[2],
          verts[i].position[0], verts[i].position[1], verts[i].position[2],
          verts[i + 1].position[0], verts[i + 1].position[1], verts[i + 1].position[2]
        );
      }
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    return geom;
  }, [mesh, selection.faceIds]);

  return (
    <group onPointerDown={handlePointerDown as any}>
      {/* Vertex points */}
      {vertexPoints && (
        <points geometry={vertexPoints.geometry}>
          <pointsMaterial
            size={6}
            sizeAttenuation={false}
            vertexColors
            transparent
            depthTest={false}
          />
        </points>
      )}

      {/* Edge wireframe */}
      {edgeLines && (
        <lineSegments geometry={edgeLines.geometry}>
          <lineBasicMaterial
            color={COLORS.edgeDefault}
            transparent
            opacity={0.6}
            depthTest={false}
          />
        </lineSegments>
      )}

      {/* Face selection overlay */}
      {selectedFacePositions && (
        <mesh geometry={selectedFacePositions}>
          <meshBasicMaterial
            color={COLORS.faceSelected}
            transparent
            opacity={0.3}
            side={THREE.DoubleSide}
            depthTest={false}
          />
        </mesh>
      )}

      {/* Invisible face mesh for raycasting */}
      {faceGeometry && (
        <mesh geometry={faceGeometry} visible={false} />
      )}
    </group>
  );
}
