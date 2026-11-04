"""Admin API endpoints for authentication, management CRUD, health auditing, and data export."""

import csv
import io
import json
import os
import re
import uuid
from typing import Any
import jwt
from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, UploadFile, status
from fastapi.responses import StreamingResponse
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.core.security import create_access_token, decode_access_token, verify_password
from app.db.base_class import utc_now
from app.db.session import get_db
from app.models.admin import Administrator
from app.models.category import Category
from app.models.location import Location
from app.models.path_edge import PathEdge
from app.models.path_node import PathNode
from app.models.qr_code import QRCode
from app.services.routing import invalidate_graph_cache
from app.schemas.admin import (
    AdminStats,
    DataHealthReport,
    DeleteResponse,
    LoginRequest,
    PhotoUploadResponse,
    TokenResponse,
)
from app.schemas.location import LocationCreate, LocationOut, LocationUpdate
from app.schemas.path_edge import PathEdgeCreate, PathEdgeOut, PathEdgeUpdate
from app.schemas.path_node import PathNodeCreate, PathNodeOut, PathNodeUpdate

router = APIRouter(prefix="/admin", tags=["Admin"])

MAX_UPLOAD_BYTES = 5 * 1024 * 1024  # 5 MB
ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


def get_current_admin(
    request: Request,
    db: Session = Depends(get_db),
) -> Administrator:
    """
    Validates Bearer token in Authorization header according to RFC 6750.
    Returns authenticated Administrator model or raises HTTP 401.
    """
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )

    parts = auth_header.strip().split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication scheme; expected 'Bearer <token>'",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = parts[1]

    try:
        payload = decode_access_token(token)
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token signature has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or tampered token: {str(exc)}",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token verification failed: {str(exc)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

    username: str | None = payload.get("sub")
    if not username:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token payload is missing subject claim ('sub')",
            headers={"WWW-Authenticate": "Bearer"},
        )

    stmt = select(Administrator).where(Administrator.username == username)
    admin = db.scalars(stmt).first()
    if not admin:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Administrator account not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not admin.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Administrator account is inactive",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return admin


# -------------------------------------------------------------------------
# Authentication
# -------------------------------------------------------------------------


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Admin authentication and JWT token issuance",
)
def admin_login(
    payload: LoginRequest,
    db: Session = Depends(get_db),
) -> TokenResponse:
    """Verify administrator credentials and issue a signed JWT access token."""
    stmt = select(Administrator).where(Administrator.username == payload.username)
    admin = db.scalars(stmt).first()

    if not admin or not verify_password(payload.password, admin.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not admin.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Administrator account is inactive",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token(
        subject=admin.username,
        extra_claims={
            "sub": admin.username,
            "role": "admin",
            "is_superuser": admin.is_superuser,
            "admin_id": admin.id,
        },
    )
    return TokenResponse(access_token=token, token_type="bearer")


# -------------------------------------------------------------------------
# Dashboard Statistics
# -------------------------------------------------------------------------


def compute_health_issues_count(db: Session) -> int:
    """Compute total count of topological and entity integrity issues."""
    all_nodes = db.scalars(select(PathNode.id)).all()
    edge_nodes_stmt = select(PathEdge.from_node_id, PathEdge.to_node_id).where(
        PathEdge.is_active.is_(True)
    )
    connected_node_ids = set()
    for u, v in db.execute(edge_nodes_stmt).all():
        connected_node_ids.add(u)
        connected_node_ids.add(v)
    isolated_count = sum(1 for nid in all_nodes if nid not in connected_node_ids)

    node_id_set = set(all_nodes)
    locations = db.scalars(select(Location)).all()
    unlinked_loc_count = sum(
        1
        for loc in locations
        if loc.entrance_node_id is None or loc.entrance_node_id not in node_id_set
    )

    suspect_edge_count = (
        db.scalar(
            select(func.count(PathEdge.id)).where(
                (PathEdge.distance <= 0.0) | (PathEdge.from_node_id == PathEdge.to_node_id)
            )
        )
        or 0
    )

    return isolated_count + unlinked_loc_count + suspect_edge_count


@router.get(
    "/stats",
    response_model=AdminStats,
    summary="Dashboard aggregate operational metrics",
)
@router.get(
    "/dashboard/stats",
    response_model=AdminStats,
    include_in_schema=False,
)
def get_admin_stats(
    admin: Administrator = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> AdminStats:
    """Return dashboard summary metrics for campus entities and issues."""
    total_locations = db.scalar(select(func.count(Location.id))) or 0
    total_categories = db.scalar(select(func.count(Category.id))) or 0
    total_nodes = db.scalar(select(func.count(PathNode.id))) or 0
    total_edges = db.scalar(select(func.count(PathEdge.id))) or 0
    total_qr_codes = db.scalar(select(func.count(QRCode.id))) or 0
    total_issues = compute_health_issues_count(db)

    health_status = (
        "healthy" if total_issues == 0 else ("warning" if total_issues <= 3 else "critical")
    )

    return AdminStats(
        total_locations=total_locations,
        total_categories=total_categories,
        total_nodes=total_nodes,
        total_edges=total_edges,
        total_qr_codes=total_qr_codes,
        total_issues=total_issues,
        locations_count=total_locations,
        categories_count=total_categories,
        nodes_count=total_nodes,
        edges_count=total_edges,
        qr_codes_count=total_qr_codes,
        issues_count=total_issues,
        health_status=health_status,
    )


# -------------------------------------------------------------------------
# Location CRUD
# -------------------------------------------------------------------------


@router.get(
    "/locations",
    response_model=list[LocationOut],
    summary="List all locations (admin view)",
)
def list_admin_locations(
    admin: Administrator = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> list[LocationOut]:
    stmt = (
        select(Location)
        .options(
            joinedload(Location.category),
            joinedload(Location.entrance_node),
            joinedload(Location.qr_code),
        )
        .order_by(Location.id)
    )
    locations = db.scalars(stmt).unique().all()
    return [LocationOut.model_validate(l) for l in locations]


@router.post(
    "/locations",
    response_model=LocationOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create a campus location with automatic QR code generation",
)
def create_location(
    payload: LocationCreate,
    admin: Administrator = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> LocationOut:
    """Create a new campus POI and automatically issue a unique QR code."""
    cat = db.get(Category, payload.category_id)
    if not cat:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Category with id {payload.category_id} not found",
        )

    if payload.entrance_node_id is not None:
        node = db.get(PathNode, payload.entrance_node_id)
        if not node:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Entrance node with id {payload.entrance_node_id} not found",
            )

    location = Location(
        category_id=payload.category_id,
        name=payload.name,
        description=payload.description,
        department=payload.department,
        latitude=payload.latitude,
        longitude=payload.longitude,
        entrance_node_id=payload.entrance_node_id,
        opening_hours=payload.opening_hours,
        facilities=payload.facilities or [],
        photo_url=payload.photo_url,
        is_active=payload.is_active,
    )
    db.add(location)
    db.flush()

    slug_name = re.sub(r"[^a-z0-9]+", "-", location.name.lower()).strip("-")[:20]
    token = f"ait-loc-{location.id:02d}-{slug_name}-{uuid.uuid4().hex[:6]}"
    qr_record = QRCode(
        location_id=location.id,
        identifier=token,
        code_url=f"/api/qr/{token}",
    )
    db.add(qr_record)
    db.commit()
    db.refresh(location)
    invalidate_graph_cache()
    return LocationOut.model_validate(location)


@router.put(
    "/locations/{location_id}",
    response_model=LocationOut,
    summary="Update an existing campus location",
)
def update_location(
    location_id: int,
    payload: LocationUpdate,
    admin: Administrator = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> LocationOut:
    """Update fields on an existing campus location."""
    location = db.get(Location, location_id)
    if not location:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Location {location_id} not found",
        )

    if payload.category_id is not None:
        cat = db.get(Category, payload.category_id)
        if not cat:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Category {payload.category_id} not found",
            )
        location.category_id = payload.category_id

    if payload.entrance_node_id is not None:
        node = db.get(PathNode, payload.entrance_node_id)
        if not node:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Entrance node {payload.entrance_node_id} not found",
            )
        location.entrance_node_id = payload.entrance_node_id

    update_data = payload.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        if field not in ["category_id", "entrance_node_id"]:
            setattr(location, field, val)

    location.updated_at = utc_now()
    db.commit()
    db.refresh(location)
    invalidate_graph_cache()
    return LocationOut.model_validate(location)


@router.delete(
    "/locations/{location_id}",
    response_model=DeleteResponse,
    summary="Delete a campus location and its associated QR code",
)
def delete_location(
    location_id: int,
    admin: Administrator = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> DeleteResponse:
    """Delete a location and remove associated QR code records."""
    location = db.get(Location, location_id)
    if not location:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Location {location_id} not found",
        )

    db.query(QRCode).filter(QRCode.location_id == location_id).delete()
    db.delete(location)
    db.commit()
    invalidate_graph_cache()
    return DeleteResponse(status="deleted", id=location_id, entity="location")


@router.post(
    "/locations/{location_id}/photo",
    response_model=PhotoUploadResponse,
    summary="Upload a photo for a campus location",
)
async def upload_location_photo(
    location_id: int,
    file: UploadFile = File(...),
    admin: Administrator = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> PhotoUploadResponse:
    """Accept and validate image upload (<= 5MB, jpeg/png/webp) and update location photo."""
    location = db.get(Location, location_id)
    if not location:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Location {location_id} not found",
        )

    content_type = file.content_type.lower() if file.content_type else ""
    if content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid MIME type '{content_type}'. Allowed types: {', '.join(sorted(ALLOWED_MIME_TYPES))}",
        )

    original_ext = os.path.splitext(file.filename or "")[1].lower()
    if original_ext not in ALLOWED_EXTENSIONS:
        original_ext = (
            ".jpg"
            if "jpeg" in content_type
            else (".png" if "png" in content_type else ".webp")
        )

    contents = await file.read()
    if len(contents) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty (0 bytes)",
        )
    if len(contents) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File exceeds maximum allowed size of 5 MB (actual: {len(contents)} bytes)",
        )

    current_dir = os.path.dirname(os.path.abspath(__file__))
    app_dir = os.path.dirname(current_dir)
    upload_dir = os.path.join(app_dir, "static", "uploads")
    os.makedirs(upload_dir, exist_ok=True)

    safe_name = f"loc_{location_id}_{uuid.uuid4().hex[:8]}{original_ext}"
    dest_path = os.path.join(upload_dir, safe_name)

    with open(dest_path, "wb") as f:
        f.write(contents)

    photo_url = f"/static/uploads/{safe_name}"
    location.photo_url = photo_url
    location.updated_at = utc_now()
    db.commit()
    db.refresh(location)

    return PhotoUploadResponse(
        status="success",
        location_id=location_id,
        photo_url=photo_url,
        filename=safe_name,
        size_bytes=len(contents),
    )


# -------------------------------------------------------------------------
# Node CRUD
# -------------------------------------------------------------------------


@router.get(
    "/nodes",
    response_model=list[PathNodeOut],
    summary="List all path nodes",
)
def list_nodes(
    admin: Administrator = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> list[PathNodeOut]:
    nodes = db.scalars(select(PathNode).order_by(PathNode.id)).all()
    return [PathNodeOut.model_validate(n) for n in nodes]


@router.post(
    "/nodes",
    response_model=PathNodeOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create a path node",
)
def create_node(
    payload: PathNodeCreate,
    admin: Administrator = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> PathNodeOut:
    """Create a new walkable path node."""
    node = PathNode(**payload.model_dump())
    db.add(node)
    db.commit()
    db.refresh(node)
    invalidate_graph_cache()
    return PathNodeOut.model_validate(node)


@router.put(
    "/nodes/{node_id}",
    response_model=PathNodeOut,
    summary="Update a path node",
)
def update_node(
    node_id: int,
    payload: PathNodeUpdate,
    admin: Administrator = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> PathNodeOut:
    node = db.get(PathNode, node_id)
    if not node:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Path node {node_id} not found",
        )

    for field, val in payload.model_dump(exclude_unset=True).items():
        setattr(node, field, val)

    db.commit()
    db.refresh(node)
    invalidate_graph_cache()
    return PathNodeOut.model_validate(node)


@router.delete(
    "/nodes/{node_id}",
    response_model=DeleteResponse,
    summary="Delete a path node and cascade cleanup incident edges and entrances",
)
def delete_node(
    node_id: int,
    admin: Administrator = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> DeleteResponse:
    """Delete a path node, clearing referencing entrance_node_ids and incident edges."""
    node = db.get(PathNode, node_id)
    if not node:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Path node {node_id} not found",
        )

    db.query(Location).filter(Location.entrance_node_id == node_id).update(
        {"entrance_node_id": None}
    )
    db.query(PathEdge).filter(
        (PathEdge.from_node_id == node_id) | (PathEdge.to_node_id == node_id)
    ).delete()
    db.delete(node)
    db.commit()
    invalidate_graph_cache()
    return DeleteResponse(status="deleted", id=node_id, entity="node")


# -------------------------------------------------------------------------
# Edge CRUD
# -------------------------------------------------------------------------


@router.get(
    "/edges",
    response_model=list[PathEdgeOut],
    summary="List all path edges",
)
def list_edges(
    admin: Administrator = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> list[PathEdgeOut]:
    edges = db.scalars(select(PathEdge).order_by(PathEdge.id)).all()
    return [PathEdgeOut.model_validate(e) for e in edges]


@router.post(
    "/edges",
    response_model=PathEdgeOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create a walkable path edge",
)
def create_edge(
    payload: PathEdgeCreate,
    admin: Administrator = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> PathEdgeOut:
    """Create a new path edge, verifying endpoints exist."""
    from_node = db.get(PathNode, payload.from_node_id)
    to_node = db.get(PathNode, payload.to_node_id)
    if not from_node or not to_node:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Referenced node(s) do not exist (from_node_id={payload.from_node_id}, to_node_id={payload.to_node_id})",
        )

    edge = PathEdge(**payload.model_dump())
    db.add(edge)
    db.commit()
    db.refresh(edge)
    invalidate_graph_cache()
    return PathEdgeOut.model_validate(edge)


@router.put(
    "/edges/{edge_id}",
    response_model=PathEdgeOut,
    summary="Update a path edge",
)
def update_edge(
    edge_id: int,
    payload: PathEdgeUpdate,
    admin: Administrator = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> PathEdgeOut:
    edge = db.get(PathEdge, edge_id)
    if not edge:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Path edge {edge_id} not found",
        )

    update_dict = payload.model_dump(exclude_unset=True)
    if "from_node_id" in update_dict:
        if not db.get(PathNode, update_dict["from_node_id"]):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"From node {update_dict['from_node_id']} not found",
            )
    if "to_node_id" in update_dict:
        if not db.get(PathNode, update_dict["to_node_id"]):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"To node {update_dict['to_node_id']} not found",
            )

    for field, val in update_dict.items():
        setattr(edge, field, val)

    db.commit()
    db.refresh(edge)
    invalidate_graph_cache()
    return PathEdgeOut.model_validate(edge)


@router.delete(
    "/edges/{edge_id}",
    response_model=DeleteResponse,
    summary="Delete a path edge",
)
def delete_edge(
    edge_id: int,
    admin: Administrator = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> DeleteResponse:
    edge = db.get(PathEdge, edge_id)
    if not edge:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Path edge {edge_id} not found",
        )

    db.delete(edge)
    db.commit()
    invalidate_graph_cache()
    return DeleteResponse(status="deleted", id=edge_id, entity="edge")


# -------------------------------------------------------------------------
# Health Check / Auditor
# -------------------------------------------------------------------------


@router.get(
    "/health-check",
    response_model=DataHealthReport,
    summary="Audit database and graph topology for inconsistencies and orphans",
)
def audit_data_health(
    admin: Administrator = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> DataHealthReport:
    """Run an exhaustive integrity audit over campus topology and entities."""
    nodes = {n.id: n for n in db.scalars(select(PathNode)).all()}
    edges = db.scalars(select(PathEdge)).all()
    locations = db.scalars(select(Location)).all()
    qr_codes = db.scalars(select(QRCode)).all()

    # 1. Isolated nodes (degree 0)
    degree_map = {nid: 0 for nid in nodes}
    for e in edges:
        if e.is_active:
            if e.from_node_id in degree_map:
                degree_map[e.from_node_id] += 1
            if e.to_node_id in degree_map:
                degree_map[e.to_node_id] += 1

    isolated_nodes = []
    for nid, deg in degree_map.items():
        if deg == 0:
            node = nodes[nid]
            isolated_nodes.append({
                "node_id": nid,
                "name": node.name,
                "latitude": node.latitude,
                "longitude": node.longitude,
                "degree": 0,
                "severity": "warning",
                "description": f"Node {nid} ('{node.name}') has degree 0 (no incident edges).",
            })

    # 2. Locations missing entrance node
    locations_missing_entrance = []
    for loc in locations:
        if loc.entrance_node_id is None:
            locations_missing_entrance.append({
                "location_id": loc.id,
                "name": loc.name,
                "reason": "entrance_node_id is null",
                "severity": "error",
                "description": f"Location {loc.id} ('{loc.name}') has no entrance node assigned.",
            })
        elif loc.entrance_node_id not in nodes:
            locations_missing_entrance.append({
                "location_id": loc.id,
                "name": loc.name,
                "entrance_node_id": loc.entrance_node_id,
                "reason": "referenced entrance node does not exist",
                "severity": "error",
                "description": f"Location {loc.id} references non-existent entrance node {loc.entrance_node_id}.",
            })

    # 3. Suspect edges
    suspect_edges = []
    for e in edges:
        reasons = []
        if e.distance <= 0.0:
            reasons.append("non-positive distance")
        if e.from_node_id == e.to_node_id:
            reasons.append("self-loop")
        if e.distance > 1000.0:
            reasons.append("excessive length (>1000m)")
        if e.from_node_id not in nodes or e.to_node_id not in nodes:
            reasons.append("dangling node foreign key")

        if reasons:
            suspect_edges.append({
                "edge_id": e.id,
                "from_node_id": e.from_node_id,
                "to_node_id": e.to_node_id,
                "distance": e.distance,
                "reasons": reasons,
                "severity": "error",
                "description": f"Edge {e.id} ({e.from_node_id}->{e.to_node_id}) has issues: {', '.join(reasons)}",
            })

    # 4. Orphaned QR codes
    loc_id_set = {loc.id for loc in locations}
    orphaned_qr = []
    for qr in qr_codes:
        if qr.location_id not in loc_id_set:
            orphaned_qr.append({
                "qr_id": qr.id,
                "location_id": qr.location_id,
                "identifier": qr.identifier,
                "severity": "error",
                "description": f"QR code {qr.id} references non-existent location {qr.location_id}.",
            })

    total_issues = (
        len(isolated_nodes)
        + len(locations_missing_entrance)
        + len(suspect_edges)
        + len(orphaned_qr)
    )

    status_str = (
        "healthy" if total_issues == 0 else ("warning" if total_issues <= 3 else "critical")
    )

    return DataHealthReport(
        status=status_str,
        total_issues=total_issues,
        isolated_nodes=isolated_nodes,
        locations_missing_entrance=locations_missing_entrance,
        suspect_edges=suspect_edges,
        orphaned_qr_codes=orphaned_qr,
        summary={
            "isolated_nodes_count": len(isolated_nodes),
            "locations_missing_entrance_count": len(locations_missing_entrance),
            "suspect_edges_count": len(suspect_edges),
            "orphaned_qr_count": len(orphaned_qr),
            "total_nodes": len(nodes),
            "total_edges": len(edges),
            "total_locations": len(locations),
        },
    )


# -------------------------------------------------------------------------
# Streaming Data Export
# -------------------------------------------------------------------------


@router.get(
    "/export/{entity}",
    summary="Export campus entities as CSV or JSON stream",
)
def export_campus_data(
    entity: str,
    format: str = Query("csv", pattern="^(csv|json)$"),
    admin: Administrator = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Export campus data models as downloadable CSV or JSON file."""
    entity = entity.lower().strip()
    valid_entities = {"locations", "nodes", "edges", "categories", "all"}
    if entity not in valid_entities:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid entity '{entity}'. Choose from: {', '.join(sorted(valid_entities))}",
        )

    if format == "json" or entity == "all":
        data: dict[str, Any] = {}
        if entity in ["locations", "all"]:
            locs = db.scalars(select(Location)).all()
            data["locations"] = [
                {
                    "id": l.id,
                    "category_id": l.category_id,
                    "name": l.name,
                    "description": l.description,
                    "department": l.department,
                    "latitude": l.latitude,
                    "longitude": l.longitude,
                    "entrance_node_id": l.entrance_node_id,
                    "opening_hours": l.opening_hours,
                    "facilities": l.facilities,
                    "photo_url": l.photo_url,
                    "is_active": l.is_active,
                }
                for l in locs
            ]
        if entity in ["nodes", "all"]:
            nds = db.scalars(select(PathNode)).all()
            data["nodes"] = [
                {
                    "id": n.id,
                    "name": n.name,
                    "latitude": n.latitude,
                    "longitude": n.longitude,
                    "floor": n.floor,
                    "node_type": n.node_type,
                    "is_accessible": n.is_accessible,
                    "is_active": n.is_active,
                }
                for n in nds
            ]
        if entity in ["edges", "all"]:
            edgs = db.scalars(select(PathEdge)).all()
            data["edges"] = [
                {
                    "id": e.id,
                    "from_node_id": e.from_node_id,
                    "to_node_id": e.to_node_id,
                    "distance": e.distance,
                    "edge_type": e.edge_type,
                    "is_accessible": e.is_accessible,
                    "is_bidirectional": e.is_bidirectional,
                    "is_active": e.is_active,
                }
                for e in edgs
            ]
        if entity in ["categories", "all"]:
            cats = db.scalars(select(Category)).all()
            data["categories"] = [
                {
                    "id": c.id,
                    "name": c.name,
                    "slug": c.slug,
                    "description": c.description,
                    "icon": c.icon,
                    "color": c.color,
                    "is_active": c.is_active,
                }
                for c in cats
            ]

        payload = data[entity] if entity != "all" else data
        json_str = json.dumps(payload, indent=2)
        return StreamingResponse(
            iter([json_str]),
            media_type="application/json",
            headers={"Content-Disposition": f'attachment; filename="{entity}_export.json"'},
        )

    output = io.StringIO()
    writer = csv.writer(output)

    if entity == "locations":
        writer.writerow([
            "id",
            "name",
            "category_id",
            "department",
            "latitude",
            "longitude",
            "entrance_node_id",
            "opening_hours",
            "facilities",
            "is_active",
        ])
        for l in db.scalars(select(Location)).all():
            writer.writerow([
                l.id,
                l.name,
                l.category_id,
                l.department or "",
                l.latitude,
                l.longitude,
                l.entrance_node_id or "",
                l.opening_hours or "",
                ",".join(l.facilities) if l.facilities else "",
                l.is_active,
            ])

    elif entity == "nodes":
        writer.writerow([
            "id",
            "name",
            "latitude",
            "longitude",
            "floor",
            "node_type",
            "is_accessible",
            "is_active",
        ])
        for n in db.scalars(select(PathNode)).all():
            writer.writerow([
                n.id,
                n.name or "",
                n.latitude,
                n.longitude,
                n.floor,
                n.node_type,
                n.is_accessible,
                n.is_active,
            ])

    elif entity == "edges":
        writer.writerow([
            "id",
            "from_node_id",
            "to_node_id",
            "distance",
            "edge_type",
            "is_accessible",
            "is_bidirectional",
            "is_active",
        ])
        for e in db.scalars(select(PathEdge)).all():
            writer.writerow([
                e.id,
                e.from_node_id,
                e.to_node_id,
                e.distance,
                e.edge_type,
                e.is_accessible,
                e.is_bidirectional,
                e.is_active,
            ])

    elif entity == "categories":
        writer.writerow(
            ["id", "name", "slug", "description", "icon", "color", "is_active"]
        )
        for c in db.scalars(select(Category)).all():
            writer.writerow(
                [c.id, c.name, c.slug, c.description or "", c.icon, c.color, c.is_active]
            )

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{entity}_export.csv"'},
    )
