"""FastAPI Router for campus location categories."""

from fastapi import APIRouter, Depends, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.category import Category
from app.models.location import Location
from app.schemas.category import CategoryOut

router = APIRouter(tags=["Categories"])


@router.get(
    "/categories",
    response_model=list[CategoryOut],
    status_code=status.HTTP_200_OK,
    summary="List all categories with location counts",
    description="Returns all active POI categories matching design tokens with dynamically calculated location counts.",
)
def list_categories(db: Session = Depends(get_db)) -> list[CategoryOut]:
    """Retrieve all active categories with dynamically aggregated location counts."""
    stmt = (
        select(Category, func.count(Location.id).label("location_count"))
        .outerjoin(
            Location,
            (Location.category_id == Category.id) & (Location.is_active.is_(True)),
        )
        .where(Category.is_active.is_(True))
        .group_by(Category.id)
        .order_by(Category.id)
    )

    rows = db.execute(stmt).all()
    categories: list[CategoryOut] = []
    for cat, count in rows:
        cat_out = CategoryOut(
            id=cat.id,
            name=cat.name,
            slug=cat.slug,
            description=cat.description,
            icon=cat.icon,
            color=cat.color,
            is_active=cat.is_active,
            created_at=cat.created_at,
            location_count=int(count),
        )
        categories.append(cat_out)

    return categories
