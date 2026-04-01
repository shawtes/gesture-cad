"""GestureCAD — FastAPI Backend for CAD operations."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import geometry, export, sketch

app = FastAPI(
    title="GestureCAD API",
    description="Backend for hand-gesture-controlled CAD application",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "gesture-cad-api"}


app.include_router(geometry.router, prefix="/api/geometry", tags=["geometry"])
app.include_router(export.router, prefix="/api/export", tags=["export"])
app.include_router(sketch.router, prefix="/api/sketch", tags=["sketch"])
