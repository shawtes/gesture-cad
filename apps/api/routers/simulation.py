"""Simulation router — FEM stress, thermal, and modal analysis."""

from fastapi import APIRouter
from pydantic import BaseModel

from services.fem_service import generate_tet_mesh, solve_static_stress, solve_thermal, solve_modal

router = APIRouter()


class MeshRequest(BaseModel):
    vertices: list[float]
    indices: list[int]
    meshSize: float = 0.5


class StaticStressRequest(BaseModel):
    vertices: list[float]
    indices: list[int]
    youngsModulus: float = 200e9    # Steel default (Pa)
    poissonsRatio: float = 0.3
    fixedNodes: list[int] = []
    forces: dict = {}               # {nodeIndex: [fx, fy, fz]}


class ThermalRequest(BaseModel):
    vertices: list[float]
    indices: list[int]
    conductivity: float = 50.0      # W/(m·K) steel
    temperatures: dict = {}          # {nodeIndex: temperature}
    heatFlux: dict = {}


class ModalRequest(BaseModel):
    vertices: list[float]
    indices: list[int]
    youngsModulus: float = 200e9
    density: float = 7850            # kg/m³ steel
    nModes: int = 6


@router.post("/mesh")
async def api_generate_mesh(req: MeshRequest):
    result = generate_tet_mesh(req.vertices, req.indices, req.meshSize)
    return result


@router.post("/static-stress")
async def api_static_stress(req: StaticStressRequest):
    mesh = generate_tet_mesh(req.vertices, req.indices)
    result = solve_static_stress(
        mesh["nodes"], mesh["elements"],
        req.youngsModulus, req.poissonsRatio,
        req.fixedNodes, req.forces,
    )
    return result


@router.post("/thermal")
async def api_thermal(req: ThermalRequest):
    mesh = generate_tet_mesh(req.vertices, req.indices)
    result = solve_thermal(
        mesh["nodes"], mesh["elements"],
        req.conductivity, req.temperatures, req.heatFlux,
    )
    return result


@router.post("/modal")
async def api_modal(req: ModalRequest):
    mesh = generate_tet_mesh(req.vertices, req.indices)
    result = solve_modal(
        mesh["nodes"], mesh["elements"],
        req.youngsModulus, req.density, req.nModes,
    )
    return result
