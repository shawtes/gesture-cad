"""Sketch validation API."""

from fastapi import APIRouter
from models.sketch import SketchValidationRequest, SketchValidationResponse
from services.geometry_service import validate_sketch

router = APIRouter()


@router.post("/validate", response_model=SketchValidationResponse)
async def validate(request: SketchValidationRequest):
    """Validate a sketch: check entity validity and wire closure."""
    entities = [e.model_dump() for e in request.entities]
    constraints = [c.model_dump() for c in request.constraints]
    result = validate_sketch(entities, constraints)
    return SketchValidationResponse(**result)
