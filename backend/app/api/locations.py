"""FastAPI Router for campus locations, details, and search."""

import re
import unicodedata
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, or_, select
from sqlalchemy.orm import Session, joinedload

from app.db.session import get_db
from app.models.category import Category
from app.models.location import Location
from app.schemas.location import LocationDetailOut, LocationOut

router = APIRouter(tags=["Locations"])


def remove_accents(input_str: str) -> str:
    """Strips accents and combining diacritical marks from unicode text."""
    nfkd = unicodedata.normalize("NFKD", input_str)
    return "".join(c for c in nfkd if not unicodedata.combining(c))


def evaluate_is_open(opening_hours: str | None) -> bool | None:
    """Evaluates whether a location is currently open based on opening_hours string."""
    if not opening_hours:
        return None
    raw = opening_hours.strip().lower()
    if any(k in raw for k in ["24 hours", "24/7", "always open"]):
        return True
    if any(k in raw for k in ["appointment", "closed"]):
        return False
    try:
        if "-" in raw:
            parts = raw.split("-")
            if len(parts) == 2:
                start_str = parts[0].strip()
                end_str = parts[1].strip()
                start_time = datetime.strptime(start_str, "%H:%M").time()
                end_time = datetime.strptime(end_str, "%H:%M").time()
                now_time = datetime.now().time()
                if start_time <= end_time:
                    return start_time <= now_time <= end_time
                else:  # Overnight span
                    return now_time >= start_time or now_time <= end_time
    except Exception:
        pass
    return None


@router.get(
    "/locations",
    response_model=list[LocationOut],
    status_code=status.HTTP_200_OK,
    summary="List active campus locations",
    description="Returns active campus locations with nested category and entrance node details. Supports category filtering.",
)
def list_locations(
    category_id: int | None = Query(None, description="Filter by category ID"),
    category: str | None = Query(None, description="Filter by category slug, name, or ID"),
    db: Session = Depends(get_db),
) -> list[LocationOut]:
    """Retrieve active locations with optional category filtering."""
    stmt = (
        select(Location)
        .join(Location.category)
        .options(
            joinedload(Location.category),
            joinedload(Location.entrance_node),
            joinedload(Location.qr_code),
        )
        .where(Location.is_active.is_(True))
    )

    if category_id is not None:
        stmt = stmt.where(Location.category_id == category_id)
    elif category is not None:
        cat_str = category.strip()
        if cat_str.isdigit():
            stmt = stmt.where(
                or_(
                    Location.category_id == int(cat_str),
                    Category.slug == cat_str.lower(),
                )
            )
        else:
            stmt = stmt.where(
                or_(
                    Category.slug == cat_str.lower(),
                    Category.name.ilike(cat_str),
                )
            )

    stmt = stmt.order_by(Location.id)
    locations = db.scalars(stmt).unique().all()
    return [LocationOut.model_validate(l) for l in locations]


@router.get(
    "/locations/search",
    response_model=list[LocationOut],
    status_code=status.HTTP_200_OK,
    summary="Search campus locations",
    description="Case-insensitive, partial matching across location name, department, category, and description with ranking.",
)
def search_locations(
    q: str = Query("", description="Search term for locations"),
    db: Session = Depends(get_db),
) -> list[LocationOut]:
    """Search active locations matching query across multiple fields."""
    clean_q = q.strip() if q else ""
    if not clean_q or len(clean_q) > 300:
        return []

    ascii_q = remove_accents(clean_q)

    # Search phrases to check
    search_phrases = [clean_q]
    if ascii_q.lower() != clean_q.lower() and ascii_q:
        search_phrases.append(ascii_q)

    # Clean words for multi-word token matching
    words = re.findall(r"\w+", ascii_q)

    # Build SQL filter conditions
    phrase_conditions = []
    for phrase in search_phrases:
        p_pat = f"%{phrase}%"
        phrase_conditions.extend([
            Location.name.ilike(p_pat),
            Location.department.ilike(p_pat),
            Category.name.ilike(p_pat),
            Location.description.ilike(p_pat),
        ])

    all_conditions = [or_(*phrase_conditions)]
    if len(words) >= 2:
        word_match_conditions = []
        for w in words:
            w_pat = f"%{w}%"
            word_match_conditions.append(
                or_(
                    Location.name.ilike(w_pat),
                    Location.department.ilike(w_pat),
                    Category.name.ilike(w_pat),
                    Location.description.ilike(w_pat),
                )
            )
        all_conditions.append(and_(*word_match_conditions))
    elif len(words) == 1 and words[0] not in search_phrases:
        w_pat = f"%{words[0]}%"
        all_conditions.append(
            or_(
                Location.name.ilike(w_pat),
                Location.department.ilike(w_pat),
                Category.name.ilike(w_pat),
                Location.description.ilike(w_pat),
            )
        )

    stmt = (
        select(Location)
        .join(Location.category)
        .options(
            joinedload(Location.category),
            joinedload(Location.entrance_node),
            joinedload(Location.qr_code),
        )
        .where(Location.is_active.is_(True), or_(*all_conditions))
    )

    locations = db.scalars(stmt).unique().all()

    # Relevance Scoring & Ranking
    q_lower = clean_q.lower()
    ascii_lower = ascii_q.lower()

    def score_location(loc: Location) -> int:
        score = 0
        loc_name = (loc.name or "").lower()
        loc_dept = (loc.department or "").lower()
        cat_name = (loc.category.name or "").lower() if loc.category else ""
        loc_desc = (loc.description or "").lower()

        for term in [q_lower, ascii_lower]:
            if not term:
                continue
            if loc_name == term:
                score += 200
            elif loc_name.startswith(term):
                score += 100
            elif term in loc_name:
                score += 60
            if term in loc_dept:
                score += 40
            if term in cat_name:
                score += 30
            if term in loc_desc:
                score += 15

        for w in words:
            wl = w.lower()
            if not wl:
                continue
            if wl in loc_name:
                score += 25
            if wl in loc_dept:
                score += 20
            if wl in cat_name:
                score += 15
            if wl in loc_desc:
                score += 5

        return score

    sorted_locations = sorted(locations, key=score_location, reverse=True)
    return [LocationOut.model_validate(l) for l in sorted_locations]


@router.get(
    "/locations/{id}",
    response_model=LocationDetailOut,
    status_code=status.HTTP_200_OK,
    summary="Get location details by ID",
    description="Returns detailed location metadata including category, entrance node, facilities, and open status.",
)
def get_location_by_id(
    id: int,
    db: Session = Depends(get_db),
) -> LocationDetailOut:
    """Retrieve full location details with open hours evaluation."""
    stmt = (
        select(Location)
        .options(
            joinedload(Location.category),
            joinedload(Location.entrance_node),
            joinedload(Location.qr_code),
        )
        .where(Location.id == id, Location.is_active.is_(True))
    )

    location = db.scalars(stmt).first()
    if not location:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Location with ID {id} not found",
        )

    detail = LocationDetailOut.model_validate(location)
    detail.is_open = evaluate_is_open(location.opening_hours)
    return detail
