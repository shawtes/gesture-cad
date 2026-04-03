"""Operations router — B-Rep CAD operations via Build123d backend."""

from fastapi import APIRouter
from pydantic import BaseModel

from services.operations_service import (
    extrude_rect,
    extrude_circle,
    boolean_operation,
    fillet_edges,
    chamfer_edges,
    shell_face,
    loft_profiles,
    sweep_profile,
    draft_faces,
    create_hole,
    create_rib,
    split_body,
    thicken_surface,
    create_helix,
)

router = APIRouter()


# ─── Request/Response Models ───

class MeshData(BaseModel):
    vertices: list[float]
    normals: list[float] = []
    indices: list[int]


class ExtrudeRectRequest(BaseModel):
    x1: float
    z1: float
    x2: float
    z2: float
    distance: float
    direction: str = "up"


class ExtrudeCircleRequest(BaseModel):
    cx: float
    cz: float
    radius: float
    distance: float


class BooleanRequest(BaseModel):
    meshA: MeshData
    meshB: MeshData
    operation: str  # "union" | "subtract" | "intersect"


class FilletRequest(BaseModel):
    mesh: MeshData
    edgeIndices: list[int]
    radius: float


class ChamferRequest(BaseModel):
    mesh: MeshData
    edgeIndices: list[int]
    distance: float


class ShellRequest(BaseModel):
    mesh: MeshData
    faceIndex: int
    thickness: float


class DraftRequest(BaseModel):
    mesh: MeshData
    faceIndices: list[int]
    angle: float
    pullDirection: list[float]


class HoleRequest(BaseModel):
    mesh: MeshData
    center: list[float]
    diameter: float
    depth: float
    holeType: str = "simple"  # simple | counterbore | countersink | tapped
    cboreDiameter: float | None = None
    cboreDepth: float | None = None
    csinkAngle: float | None = None


class RibRequest(BaseModel):
    mesh: MeshData
    profilePoints: list[float]
    thickness: float
    direction: str = "parallel"


class SplitRequest(BaseModel):
    mesh: MeshData
    planeNormal: list[float]
    planeOffset: float
    keepSide: str = "above"


class ThickenRequest(BaseModel):
    mesh: MeshData
    thickness: float
    direction: str = "outward"


class HelixRequest(BaseModel):
    center: list[float]
    radius: float
    pitch: float
    height: float
    taperAngle: float = 0.0
    clockwise: bool = False


class OperationResponse(BaseModel):
    id: str
    vertices: list[float]
    normals: list[float]
    indices: list[int]


# ─── Endpoints ───

@router.post("/extrude/rect", response_model=OperationResponse)
async def api_extrude_rect(req: ExtrudeRectRequest):
    result = extrude_rect(req.x1, req.z1, req.x2, req.z2, req.distance, req.direction)
    return result


@router.post("/extrude/circle", response_model=OperationResponse)
async def api_extrude_circle(req: ExtrudeCircleRequest):
    result = extrude_circle(req.cx, req.cz, req.radius, req.distance)
    return result


@router.post("/boolean", response_model=OperationResponse)
async def api_boolean(req: BooleanRequest):
    mesh_a = {"vertices": req.meshA.vertices, "normals": req.meshA.normals, "indices": req.meshA.indices}
    mesh_b = {"vertices": req.meshB.vertices, "normals": req.meshB.normals, "indices": req.meshB.indices}
    result = boolean_operation(mesh_a, mesh_b, req.operation)
    return result


@router.post("/fillet", response_model=OperationResponse)
async def api_fillet(req: FilletRequest):
    mesh = {"vertices": req.mesh.vertices, "normals": req.mesh.normals, "indices": req.mesh.indices}
    result = fillet_edges(mesh, req.edgeIndices, req.radius)
    return result


@router.post("/chamfer", response_model=OperationResponse)
async def api_chamfer(req: ChamferRequest):
    mesh = {"vertices": req.mesh.vertices, "normals": req.mesh.normals, "indices": req.mesh.indices}
    result = chamfer_edges(mesh, req.edgeIndices, req.distance)
    return result


@router.post("/shell", response_model=OperationResponse)
async def api_shell(req: ShellRequest):
    mesh = {"vertices": req.mesh.vertices, "normals": req.mesh.normals, "indices": req.mesh.indices}
    result = shell_face(mesh, req.faceIndex, req.thickness)
    return result


@router.post("/draft", response_model=OperationResponse)
async def api_draft(req: DraftRequest):
    mesh = {"vertices": req.mesh.vertices, "normals": req.mesh.normals, "indices": req.mesh.indices}
    result = draft_faces(mesh, req.faceIndices, req.angle, req.pullDirection)
    return result


@router.post("/hole", response_model=OperationResponse)
async def api_hole(req: HoleRequest):
    mesh = {"vertices": req.mesh.vertices, "normals": req.mesh.normals, "indices": req.mesh.indices}
    result = create_hole(mesh, req.center, req.diameter, req.depth, req.holeType)
    return result


@router.post("/rib", response_model=OperationResponse)
async def api_rib(req: RibRequest):
    mesh = {"vertices": req.mesh.vertices, "normals": req.mesh.normals, "indices": req.mesh.indices}
    result = create_rib(mesh, req.profilePoints, req.thickness, req.direction)
    return result


@router.post("/split", response_model=OperationResponse)
async def api_split(req: SplitRequest):
    mesh = {"vertices": req.mesh.vertices, "normals": req.mesh.normals, "indices": req.mesh.indices}
    result = split_body(mesh, req.planeNormal, req.planeOffset, req.keepSide)
    return result


@router.post("/thicken", response_model=OperationResponse)
async def api_thicken(req: ThickenRequest):
    mesh = {"vertices": req.mesh.vertices, "normals": req.mesh.normals, "indices": req.mesh.indices}
    result = thicken_surface(mesh, req.thickness, req.direction)
    return result


@router.post("/helix", response_model=OperationResponse)
async def api_helix(req: HelixRequest):
    result = create_helix(req.center, req.radius, req.pitch, req.height, req.taperAngle, req.clockwise)
    return result
