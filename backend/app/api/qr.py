"""QR Code API endpoints for location resolution, PNG streaming, and PDF poster generation."""

from typing import Literal
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.location import LocationOut
from app.services.qr_service import (
    generate_campus_poster_pdf,
    generate_qr_png_bytes,
    get_deep_link_url,
    resolve_location_by_identifier,
)

router = APIRouter(prefix="/qr", tags=["QR Codes"])


@router.get(
    "/{identifier}/image",
    summary="Generate dynamic PNG QR code binary stream",
    response_class=Response,
    responses={
        200: {
            "content": {"image/png": {}},
            "description": "Binary PNG QR code stream beginning with magic header \\x89PNG\\r\\n\\x1a\\n",
        },
        404: {"description": "Location or QR code not found"},
    },
)
def get_qr_image(
    identifier: str,
    box_size: int = Query(default=10, ge=1, le=50, description="QR code pixel box size"),
    border: int = Query(default=4, ge=0, le=20, description="QR code quiet zone border width"),
    db: Session = Depends(get_db),
) -> Response:
    """
    Generate dynamic PNG QR code streaming bytes with media_type='image/png'.
    Encodes URL deep-link to the location details page.
    Returns 404 if the location or token does not exist.
    """
    location = resolve_location_by_identifier(db, identifier)
    if not location:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Location or QR code '{identifier}' not found",
        )

    deep_link = get_deep_link_url(location)
    png_bytes = generate_qr_png_bytes(deep_link, box_size=box_size, border=border)

    return Response(
        content=png_bytes,
        media_type="image/png",
        headers={
            "Cache-Control": "public, max-age=86400",
            "Content-Disposition": f'inline; filename="qr-loc-{location.id}.png"',
        },
    )


@router.get(
    "/{identifier}/poster",
    summary="Generate printable campus signage PDF poster",
    response_class=Response,
    responses={
        200: {
            "content": {"application/pdf": {}},
            "description": "Binary PDF document stream beginning with magic header %PDF",
        },
        404: {"description": "Location or QR code not found"},
    },
)
def get_qr_poster(
    identifier: str,
    page_size: Literal["letter", "a4"] = Query(
        default="letter", description="Page size standard (letter or a4)"
    ),
    download: bool = Query(default=False, description="Prompt browser file download dialog"),
    db: Session = Depends(get_db),
) -> Response:
    """
    Generate printable campus signage PDF using ReportLab with media_type='application/pdf'.
    Returns 404 if location doesn't exist.
    """
    location = resolve_location_by_identifier(db, identifier)
    if not location:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Location or QR code '{identifier}' not found",
        )

    pdf_bytes = generate_campus_poster_pdf(location, page_size_name=page_size)
    disposition_type = "attachment" if download else "inline"
    slug = location.name.lower().replace(" ", "-")[:30]

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Cache-Control": "public, max-age=86400",
            "Content-Disposition": f'{disposition_type}; filename="signage-{slug}.pdf"',
        },
    )


@router.get(
    "/{identifier}",
    response_model=LocationOut,
    summary="Resolve QR token or ID to location details",
    responses={
        200: {"description": "Resolved location details with entrance_node_id"},
        404: {"description": "Invalid token or location not found"},
    },
)
def resolve_qr_code(
    identifier: str,
    db: Session = Depends(get_db),
) -> LocationOut:
    """
    Resolve unique cryptographic token, UUID, or location ID to location details.
    Returns 404 if invalid token or location not found.
    """
    location = resolve_location_by_identifier(db, identifier)
    if not location:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Invalid QR identifier '{identifier}' or location not found",
        )

    return LocationOut.model_validate(location)
