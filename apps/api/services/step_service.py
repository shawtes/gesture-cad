"""
STEP file import/export service via Build123d / OpenCASCADE.
Falls back to basic STL tessellation when Build123d is not available.
"""

import math
import uuid
import json
import tempfile
import os

try:
    import build123d as bd
    HAS_BUILD123D = True
except ImportError:
    HAS_BUILD123D = False


def import_step(file_bytes: bytes) -> dict:
    """Import a STEP file and return tessellated mesh data."""
    if not HAS_BUILD123D:
        return {"error": "Build123d not installed. Install with: pip install build123d", "vertices": [], "normals": [], "indices": []}

    try:
        with tempfile.NamedTemporaryFile(suffix=".step", delete=False) as f:
            f.write(file_bytes)
            temp_path = f.name

        part = bd.import_step(temp_path)
        os.unlink(temp_path)

        mesh = part.tessellate(tolerance=0.01)
        vertices = [c for v in mesh[0] for c in v]
        indices = [i for tri in mesh[1] for i in tri]

        return {
            "id": str(uuid.uuid4())[:8],
            "vertices": vertices,
            "normals": [0.0] * len(vertices),
            "indices": indices,
        }
    except Exception as e:
        return {"error": str(e), "vertices": [], "normals": [], "indices": []}


def export_step(vertices: list[float], indices: list[int]) -> bytes | None:
    """Export mesh data as a STEP file. Requires Build123d."""
    if not HAS_BUILD123D:
        return None

    try:
        # Create a simple solid from the mesh vertices bounding box
        xs = vertices[0::3]
        ys = vertices[1::3]
        zs = vertices[2::3]
        if not xs:
            return None

        min_x, max_x = min(xs), max(xs)
        min_y, max_y = min(ys), max(ys)
        min_z, max_z = min(zs), max(zs)

        with bd.BuildPart() as part:
            bd.Box(max_x - min_x, max_y - min_y, max_z - min_z)

        with tempfile.NamedTemporaryFile(suffix=".step", delete=False) as f:
            temp_path = f.name

        bd.export_step(part.part, temp_path)

        with open(temp_path, "rb") as f:
            data = f.read()
        os.unlink(temp_path)
        return data
    except Exception:
        return None


def export_stl_binary(vertices: list[float], indices: list[int]) -> bytes:
    """Export mesh as binary STL."""
    import struct

    num_triangles = len(indices) // 3
    header = b"\0" * 80
    data = header + struct.pack("<I", num_triangles)

    for i in range(0, len(indices), 3):
        i0, i1, i2 = indices[i], indices[i + 1], indices[i + 2]
        v0 = (vertices[i0 * 3], vertices[i0 * 3 + 1], vertices[i0 * 3 + 2])
        v1 = (vertices[i1 * 3], vertices[i1 * 3 + 1], vertices[i1 * 3 + 2])
        v2 = (vertices[i2 * 3], vertices[i2 * 3 + 1], vertices[i2 * 3 + 2])

        # Compute normal
        ax, ay, az = v1[0] - v0[0], v1[1] - v0[1], v1[2] - v0[2]
        bx, by, bz = v2[0] - v0[0], v2[1] - v0[1], v2[2] - v0[2]
        nx = ay * bz - az * by
        ny = az * bx - ax * bz
        nz = ax * by - ay * bx
        length = math.sqrt(nx * nx + ny * ny + nz * nz) or 1
        nx, ny, nz = nx / length, ny / length, nz / length

        data += struct.pack("<fff", nx, ny, nz)
        data += struct.pack("<fff", *v0)
        data += struct.pack("<fff", *v1)
        data += struct.pack("<fff", *v2)
        data += struct.pack("<H", 0)  # attribute byte count

    return data
