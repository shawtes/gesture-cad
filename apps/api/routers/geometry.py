"""Geometry operations using Build123d / OpenCASCADE."""

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class BoxParams(BaseModel):
    width: float = 1.0
    height: float = 1.0
    depth: float = 1.0
    position: list[float] = [0.0, 0.0, 0.0]


class SphereParams(BaseModel):
    radius: float = 1.0
    position: list[float] = [0.0, 0.0, 0.0]


class CylinderParams(BaseModel):
    radius: float = 0.5
    height: float = 1.0
    position: list[float] = [0.0, 0.0, 0.0]


class GeometryResponse(BaseModel):
    id: str
    type: str
    vertices: list[float]
    indices: list[int]
    normals: list[float]


@router.post("/box", response_model=GeometryResponse)
async def create_box(params: BoxParams):
    """Create a box primitive. Will use Build123d when integrated."""
    # Placeholder: return a simple unit cube mesh
    w, h, d = params.width / 2, params.height / 2, params.depth / 2
    px, py, pz = params.position

    vertices = [
        # Front face
        px - w, py - h, pz + d,  px + w, py - h, pz + d,
        px + w, py + h, pz + d,  px - w, py + h, pz + d,
        # Back face
        px - w, py - h, pz - d,  px - w, py + h, pz - d,
        px + w, py + h, pz - d,  px + w, py - h, pz - d,
        # Top face
        px - w, py + h, pz - d,  px - w, py + h, pz + d,
        px + w, py + h, pz + d,  px + w, py + h, pz - d,
        # Bottom face
        px - w, py - h, pz - d,  px + w, py - h, pz - d,
        px + w, py - h, pz + d,  px - w, py - h, pz + d,
        # Right face
        px + w, py - h, pz - d,  px + w, py + h, pz - d,
        px + w, py + h, pz + d,  px + w, py - h, pz + d,
        # Left face
        px - w, py - h, pz - d,  px - w, py - h, pz + d,
        px - w, py + h, pz + d,  px - w, py + h, pz - d,
    ]

    indices = [
        0, 1, 2, 0, 2, 3,       # front
        4, 5, 6, 4, 6, 7,       # back
        8, 9, 10, 8, 10, 11,    # top
        12, 13, 14, 12, 14, 15, # bottom
        16, 17, 18, 16, 18, 19, # right
        20, 21, 22, 20, 22, 23, # left
    ]

    normals = [
        0, 0, 1,  0, 0, 1,  0, 0, 1,  0, 0, 1,    # front
        0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1,   # back
        0, 1, 0,  0, 1, 0,  0, 1, 0,  0, 1, 0,    # top
        0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0,   # bottom
        1, 0, 0,  1, 0, 0,  1, 0, 0,  1, 0, 0,    # right
        -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0,   # left
    ]

    import uuid
    return GeometryResponse(
        id=str(uuid.uuid4()),
        type="box",
        vertices=vertices,
        indices=indices,
        normals=normals,
    )


@router.post("/sphere", response_model=GeometryResponse)
async def create_sphere(params: SphereParams):
    """Create a sphere. Placeholder until Build123d integration."""
    import uuid
    import math

    segments = 16
    rings = 12
    vertices: list[float] = []
    normals: list[float] = []
    indices: list[int] = []

    for j in range(rings + 1):
        theta = j * math.pi / rings
        sin_theta = math.sin(theta)
        cos_theta = math.cos(theta)

        for i in range(segments + 1):
            phi = i * 2 * math.pi / segments
            x = sin_theta * math.cos(phi)
            y = cos_theta
            z = sin_theta * math.sin(phi)

            vertices.extend([
                params.position[0] + x * params.radius,
                params.position[1] + y * params.radius,
                params.position[2] + z * params.radius,
            ])
            normals.extend([x, y, z])

    for j in range(rings):
        for i in range(segments):
            a = j * (segments + 1) + i
            b = a + segments + 1

            indices.extend([a, b, a + 1])
            indices.extend([b, b + 1, a + 1])

    return GeometryResponse(
        id=str(uuid.uuid4()),
        type="sphere",
        vertices=vertices,
        indices=indices,
        normals=normals,
    )
