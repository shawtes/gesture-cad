"""Pydantic models for sketch validation API."""

from pydantic import BaseModel
from typing import Literal


class SketchPointModel(BaseModel):
    id: str
    type: Literal["point"]
    x: float
    z: float


class SketchLineModel(BaseModel):
    id: str
    type: Literal["line"]
    x1: float
    z1: float
    x2: float
    z2: float


class SketchCircleModel(BaseModel):
    id: str
    type: Literal["circle"]
    cx: float
    cz: float
    radius: float


class SketchRectModel(BaseModel):
    id: str
    type: Literal["rect"]
    x1: float
    z1: float
    x2: float
    z2: float


SketchEntityModel = SketchPointModel | SketchLineModel | SketchCircleModel | SketchRectModel


class ConstraintModel(BaseModel):
    id: str
    type: str
    entity_ids: list[str]
    value: float | None = None


class SketchValidationRequest(BaseModel):
    entities: list[SketchEntityModel]
    constraints: list[ConstraintModel] = []


class SketchValidationResponse(BaseModel):
    valid: bool
    closed: bool
    entity_count: int
    constraint_count: int
    errors: list[str] = []
