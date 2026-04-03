"""Import/Export router — file I/O for STEP, STL, OBJ, glTF."""

from fastapi import APIRouter, UploadFile, File, Response
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from services.step_service import import_step, export_step, export_stl_binary

router = APIRouter()


class ExportRequest(BaseModel):
    vertices: list[float]
    indices: list[int]
    format: str = "stl"  # "stl" | "step" | "obj"


@router.post("/import/step")
async def api_import_step(file: UploadFile = File(...)):
    """Import a STEP file and return tessellated mesh."""
    content = await file.read()
    result = import_step(content)
    if "error" in result and result["error"]:
        return JSONResponse(status_code=422, content=result)
    return result


@router.post("/import/stl")
async def api_import_stl(file: UploadFile = File(...)):
    """Import an STL file — parsed client-side, but this endpoint validates."""
    content = await file.read()
    # Basic validation: check header
    if len(content) < 84:
        return JSONResponse(status_code=422, content={"error": "File too small to be a valid STL"})
    return {"status": "ok", "size": len(content), "message": "STL parsing is done client-side via file-io.ts"}


@router.post("/export/stl")
async def api_export_stl(req: ExportRequest):
    """Export mesh as binary STL."""
    if not req.vertices or not req.indices:
        return JSONResponse(status_code=400, content={"error": "Empty mesh"})

    stl_data = export_stl_binary(req.vertices, req.indices)
    return Response(
        content=stl_data,
        media_type="application/octet-stream",
        headers={"Content-Disposition": "attachment; filename=model.stl"},
    )


@router.post("/export/step")
async def api_export_step(req: ExportRequest):
    """Export mesh as STEP file (requires Build123d)."""
    step_data = export_step(req.vertices, req.indices)
    if step_data is None:
        return JSONResponse(
            status_code=422,
            content={"error": "STEP export requires Build123d. Install with: pip install build123d"},
        )
    return Response(
        content=step_data,
        media_type="application/octet-stream",
        headers={"Content-Disposition": "attachment; filename=model.step"},
    )


@router.post("/export/obj")
async def api_export_obj(req: ExportRequest):
    """Export mesh as OBJ file."""
    lines = ["# GestureCAD OBJ Export\n"]

    # Vertices
    for i in range(0, len(req.vertices), 3):
        lines.append(f"v {req.vertices[i]:.6f} {req.vertices[i+1]:.6f} {req.vertices[i+2]:.6f}\n")

    # Faces (OBJ is 1-indexed)
    for i in range(0, len(req.indices), 3):
        lines.append(f"f {req.indices[i]+1} {req.indices[i+1]+1} {req.indices[i+2]+1}\n")

    obj_data = "".join(lines).encode("utf-8")
    return Response(
        content=obj_data,
        media_type="text/plain",
        headers={"Content-Disposition": "attachment; filename=model.obj"},
    )
