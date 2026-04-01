"""File export operations."""

from fastapi import APIRouter

router = APIRouter()


@router.get("/formats")
async def list_formats():
    """List supported export formats."""
    return {
        "formats": [
            {"id": "step", "name": "STEP", "extension": ".step", "status": "planned"},
            {"id": "stl", "name": "STL", "extension": ".stl", "status": "planned"},
            {"id": "obj", "name": "OBJ", "extension": ".obj", "status": "planned"},
            {"id": "gltf", "name": "glTF", "extension": ".gltf", "status": "planned"},
            {"id": "dxf", "name": "DXF", "extension": ".dxf", "status": "planned"},
            {"id": "svg", "name": "SVG", "extension": ".svg", "status": "planned"},
        ]
    }
