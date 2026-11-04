"""QR Code and Printable Campus Signage Poster Generation Service."""

from __future__ import annotations
import html
import io
from typing import Literal

import qrcode
from qrcode.constants import ERROR_CORRECT_H, ERROR_CORRECT_M
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4, letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.platypus import Image, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.core.config import settings
from app.models.location import Location
from app.models.qr_code import QRCode


def resolve_location_by_identifier(db: Session, identifier: str) -> Location | None:
    """
    Look up an active location by:
    1. Direct location ID integer if identifier is all digits.
    2. QRCode identifier string or token.
    3. Prefixed format (e.g. 'loc-1' or 'LOC-0001').
    """
    clean_identifier = identifier.strip()

    # 1. Direct location ID integer
    if clean_identifier.isdigit():
        loc_id = int(clean_identifier)
        stmt = (
            select(Location)
            .options(
                joinedload(Location.category),
                joinedload(Location.qr_code),
                joinedload(Location.entrance_node),
            )
            .where(Location.id == loc_id, Location.is_active.is_(True))
        )
        location = db.scalars(stmt).first()
        if location:
            return location

    # 2. Lookup by QRCode token / identifier string
    stmt = (
        select(QRCode)
        .options(
            joinedload(QRCode.location).joinedload(Location.category),
            joinedload(QRCode.location).joinedload(Location.entrance_node),
            joinedload(QRCode.location).joinedload(Location.qr_code),
        )
        .where(QRCode.identifier == clean_identifier)
    )
    qr_record = db.scalars(stmt).first()
    if qr_record and qr_record.location and qr_record.location.is_active:
        return qr_record.location

    # 3. Handle prefixes like LOC-1 or loc-1
    if clean_identifier.lower().startswith("loc-"):
        suffix = clean_identifier[4:].lstrip("0")
        if suffix.isdigit():
            loc_id = int(suffix)
            stmt = (
                select(Location)
                .options(
                    joinedload(Location.category),
                    joinedload(Location.qr_code),
                    joinedload(Location.entrance_node),
                )
                .where(Location.id == loc_id, Location.is_active.is_(True))
            )
            location = db.scalars(stmt).first()
            if location:
                return location

    return None


def get_deep_link_url(location: Location) -> str:
    """Generate the public URL deep link for a location."""
    base_url = getattr(settings, "FRONTEND_URL", "http://localhost:5173").rstrip("/")
    return f"{base_url}/explore?location_id={location.id}"


def generate_qr_png_bytes(data: str, box_size: int = 10, border: int = 4) -> bytes:
    """Generate raw PNG bytes of a QR code containing the specified data payload."""
    qr = qrcode.QRCode(
        version=None,
        error_correction=ERROR_CORRECT_M,
        box_size=box_size,
        border=border,
    )
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")

    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    return buffer.getvalue()


def _safe_hex_color(hex_str: str | None, default: str = "#4F46E5") -> colors.HexColor:
    """Safely parse a hex color string into a ReportLab HexColor."""
    if not hex_str:
        return colors.HexColor(default)
    try:
        clean_hex = hex_str if hex_str.startswith("#") else f"#{hex_str}"
        return colors.HexColor(clean_hex)
    except Exception:
        return colors.HexColor(default)


def generate_campus_poster_pdf(
    location: Location,
    page_size_name: Literal["letter", "a4"] = "letter",
) -> bytes:
    """
    Generate a printable campus signage PDF poster (Letter or A4).
    Contains:
      - Header with university branding ('Apex Institute of Technology — Campus Navigator')
      - Location name in bold typography
      - Category badge with color
      - Operating hours and facilities
      - High-resolution embedded QR code image
      - Instructional footer: 'Scan with your phone camera to start instant pedestrian navigation from here.'
    """
    page_size = A4 if page_size_name.lower() == "a4" else letter
    buffer = io.BytesIO()

    # Fixed margins: 36 pt (0.5 inch)
    doc = SimpleDocTemplate(
        buffer,
        pagesize=page_size,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36,
    )

    styles = getSampleStyleSheet()

    uni_header_style = ParagraphStyle(
        "UniHeader",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=18,
        leading=22,
        textColor=colors.HexColor("#1E293B"),
        alignment=TA_CENTER,
    )

    sub_header_style = ParagraphStyle(
        "SubHeader",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#4F46E5"),
        alignment=TA_CENTER,
    )

    loc_name_style = ParagraphStyle(
        "LocName",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=24,
        leading=28,
        textColor=colors.HexColor("#0F172A"),
        alignment=TA_CENTER,
    )

    dept_style = ParagraphStyle(
        "Dept",
        parent=styles["Normal"],
        fontName="Helvetica-Oblique",
        fontSize=12,
        leading=16,
        textColor=colors.HexColor("#64748B"),
        alignment=TA_CENTER,
    )

    badge_style = ParagraphStyle(
        "Badge",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=9,
        leading=11,
        textColor=colors.white,
        alignment=TA_CENTER,
    )

    info_bold = ParagraphStyle(
        "InfoBold",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#1E293B"),
        alignment=TA_CENTER,
    )

    info_body = ParagraphStyle(
        "InfoBody",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#475569"),
        alignment=TA_CENTER,
    )

    footer_primary = ParagraphStyle(
        "FooterPrimary",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=13,
        leading=17,
        textColor=colors.HexColor("#4F46E5"),
        alignment=TA_CENTER,
    )

    footer_sub = ParagraphStyle(
        "FooterSub",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#64748B"),
        alignment=TA_CENTER,
    )

    meta_code = ParagraphStyle(
        "MetaCode",
        parent=styles["Normal"],
        fontName="Courier",
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#94A3B8"),
        alignment=TA_CENTER,
    )

    story = []

    # 1. Header with university branding
    story.append(Paragraph("Apex Institute of Technology — Campus Navigator", uni_header_style))
    story.append(Spacer(1, 4))
    story.append(Paragraph("OFFICIAL CAMPUS WAYFINDING &amp; PEDESTRIAN SIGNAGE", sub_header_style))
    story.append(Spacer(1, 10))

    # Top Brand Accent Bar (Deep Indigo #4F46E5)
    accent_bar = Table([[""]], colWidths=[540], rowHeights=[3])
    accent_bar.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#4F46E5")),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    story.append(accent_bar)
    story.append(Spacer(1, 16))

    # 2. Location name in bold typography
    safe_name = html.escape(location.name)
    story.append(Paragraph(safe_name, loc_name_style))
    if location.department:
        story.append(Spacer(1, 4))
        story.append(Paragraph(html.escape(location.department), dept_style))
    story.append(Spacer(1, 10))

    # 3. Category badge with color
    category_name = location.category.name if location.category else "Campus POI"
    category_color = location.category.color if location.category else "#4F46E5"
    badge_bg_color = _safe_hex_color(category_color)

    badge_table = Table([[Paragraph(html.escape(category_name.upper()), badge_style)]], colWidths=[180], rowHeights=[20])
    badge_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), badge_bg_color),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
    ]))
    story.append(badge_table)
    story.append(Spacer(1, 16))

    # 4. Embedded High-Resolution QR Code
    deep_link = get_deep_link_url(location)
    qr = qrcode.QRCode(
        version=None,
        error_correction=ERROR_CORRECT_H,
        box_size=10,
        border=2,
    )
    qr.add_data(deep_link)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")

    img_buffer = io.BytesIO()
    img.save(img_buffer, format="PNG")
    img_buffer.seek(0)

    qr_image = Image(img_buffer, width=210, height=210)
    qr_card = Table([[qr_image]], colWidths=[230], rowHeights=[230])
    qr_card.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#FFFFFF")),
        ("BOX", (0, 0), (-1, -1), 1.5, colors.HexColor("#CBD5E1")),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(qr_card)

    identifier_str = location.qr_code.identifier if location.qr_code else f"LOC-{location.id:04d}"
    story.append(Spacer(1, 4))
    story.append(Paragraph(f"Point ID: {html.escape(identifier_str)}", meta_code))
    story.append(Spacer(1, 14))

    # 5. Operating hours and facilities
    hours_text = location.opening_hours if location.opening_hours else "Campus Access: Standard Hours"
    facs_list = location.facilities if location.facilities else ["Campus Navigation Point"]
    facs_text = " • ".join(facs_list)

    info_table = Table([
        [Paragraph(f"<b>Operating Hours:</b> {html.escape(hours_text)}", info_bold)],
        [Paragraph(f"<b>Facilities:</b> {html.escape(facs_text)}", info_body)]
    ], colWidths=[480])
    info_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
        ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#E2E8F0")),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(info_table)
    story.append(Spacer(1, 16))

    # 6. Instructional footer
    story.append(Paragraph("Scan with your phone camera to start instant pedestrian navigation from here.", footer_primary))
    story.append(Spacer(1, 6))
    story.append(Paragraph("Opens interactive live map • Wheelchair accessible routing • No app download required", footer_sub))
    story.append(Spacer(1, 8))
    story.append(Paragraph("Apex Institute of Technology • Smart Campus Initiative", footer_sub))

    doc.build(story)
    return buffer.getvalue()
