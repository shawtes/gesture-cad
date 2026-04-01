"""Geometry service: validates sketch entities and checks wire closure.

Uses basic geometric analysis. Build123d integration is deferred until
it's installed in the environment — this service works without it.
"""

import math
from typing import Any


def validate_sketch(entities: list[dict], constraints: list[dict]) -> dict:
    """Validate a sketch: check entity validity and wire closure."""
    errors: list[str] = []
    valid = True

    if not entities:
        return {
            "valid": False,
            "closed": False,
            "entity_count": 0,
            "constraint_count": len(constraints),
            "errors": ["No entities in sketch"],
        }

    # Validate individual entities
    for entity in entities:
        etype = entity.get("type")
        if etype == "line":
            dx = entity["x2"] - entity["x1"]
            dz = entity["z2"] - entity["z1"]
            length = math.hypot(dx, dz)
            if length < 0.001:
                errors.append(f"Line {entity['id']} has zero length")
                valid = False
        elif etype == "circle":
            if entity["radius"] < 0.001:
                errors.append(f"Circle {entity['id']} has zero radius")
                valid = False
        elif etype == "rect":
            w = abs(entity["x2"] - entity["x1"])
            h = abs(entity["z2"] - entity["z1"])
            if w < 0.001 or h < 0.001:
                errors.append(f"Rectangle {entity['id']} has zero dimension")
                valid = False

    # Check wire closure: are all line endpoints connected?
    lines = [e for e in entities if e["type"] == "line"]
    closed = False
    if len(lines) >= 3:
        closed = _check_wire_closure(lines)

    # Circles and rects are inherently closed
    circles = [e for e in entities if e["type"] == "circle"]
    rects = [e for e in entities if e["type"] == "rect"]
    if circles or rects:
        closed = True

    return {
        "valid": valid and len(errors) == 0,
        "closed": closed,
        "entity_count": len(entities),
        "constraint_count": len(constraints),
        "errors": errors,
    }


def _check_wire_closure(lines: list[dict], tolerance: float = 0.15) -> bool:
    """Check if a set of lines forms a closed wire (loop)."""
    if len(lines) < 3:
        return False

    # Collect all endpoints
    endpoints: list[tuple[float, float]] = []
    for line in lines:
        endpoints.append((line["x1"], line["z1"]))
        endpoints.append((line["x2"], line["z2"]))

    # For a closed wire, every endpoint should be coincident with exactly one other endpoint
    for i, ep in enumerate(endpoints):
        matches = 0
        for j, other in enumerate(endpoints):
            if i == j:
                continue
            dist = math.hypot(ep[0] - other[0], ep[1] - other[1])
            if dist < tolerance:
                matches += 1
        if matches == 0:
            return False

    return True
