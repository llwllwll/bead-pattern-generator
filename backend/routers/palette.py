"""
Color Palette Management Router
"""
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import ColorPalette, PaletteColor, Admin
from auth import get_current_admin
from pydantic import BaseModel

router = APIRouter(prefix="/api/admin/palettes", tags=["palette-management"])


# Schemas
class PaletteColorCreate(BaseModel):
    color_code: str
    name: Optional[str] = None
    hex: str
    is_transparent: bool = False
    is_glow: bool = False
    is_metallic: bool = False
    display_order: int = 0


class PaletteColorResponse(BaseModel):
    id: UUID
    color_code: str
    name: Optional[str]
    hex: str
    is_transparent: bool
    is_glow: bool
    is_metallic: bool
    display_order: int

    class Config:
        from_attributes = True


class ColorPaletteCreate(BaseModel):
    name: str
    code: str
    description: Optional[str] = None
    brand: Optional[str] = None
    is_default: bool = False
    colors: List[PaletteColorCreate]


class ColorPaletteUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    brand: Optional[str] = None
    is_active: Optional[bool] = None
    is_default: Optional[bool] = None


class ColorPaletteResponse(BaseModel):
    id: UUID
    name: str
    code: str
    description: Optional[str]
    brand: Optional[str]
    is_active: bool
    is_default: bool
    colors: List[PaletteColorResponse]
    created_at: str

    class Config:
        from_attributes = True


class ColorPaletteListResponse(BaseModel):
    id: UUID
    name: str
    code: str
    brand: Optional[str]
    is_active: bool
    is_default: bool
    color_count: int

    class Config:
        from_attributes = True


# Public API (for frontend)
@router.get("/public", response_model=List[ColorPaletteListResponse])
async def list_public_palettes(db: AsyncSession = Depends(get_db)):
    """List all active palettes for public use"""
    result = await db.execute(
        select(ColorPalette)
        .where(ColorPalette.is_active == True)
        .order_by(ColorPalette.is_default.desc(), ColorPalette.name)
    )
    palettes = result.scalars().all()
    
    # Get color count for each palette
    response = []
    for palette in palettes:
        color_count_result = await db.execute(
            select(PaletteColor).where(PaletteColor.palette_id == palette.id)
        )
        color_count = len(color_count_result.scalars().all())
        
        response.append({
            "id": palette.id,
            "name": palette.name,
            "code": palette.code,
            "brand": palette.brand,
            "is_active": palette.is_active,
            "is_default": palette.is_default,
            "color_count": color_count
        })
    
    return response


@router.get("/public/{palette_id}", response_model=ColorPaletteResponse)
async def get_public_palette(palette_id: UUID, db: AsyncSession = Depends(get_db)):
    """Get a specific palette with all colors"""
    result = await db.execute(
        select(ColorPalette)
        .where(and_(ColorPalette.id == palette_id, ColorPalette.is_active == True))
        .options(selectinload(ColorPalette.colors))
    )
    palette = result.scalar_one_or_none()
    
    if not palette:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Palette not found"
        )
    
    # Sort colors by display_order
    palette.colors.sort(key=lambda x: x.display_order)
    
    return {
        "id": palette.id,
        "name": palette.name,
        "code": palette.code,
        "description": palette.description,
        "brand": palette.brand,
        "is_active": palette.is_active,
        "is_default": palette.is_default,
        "colors": palette.colors,
        "created_at": palette.created_at.isoformat() if palette.created_at else None
    }


# Admin API
@router.get("/", response_model=List[ColorPaletteListResponse])
async def list_palettes(
    current_admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """List all palettes (admin only)"""
    result = await db.execute(
        select(ColorPalette).order_by(ColorPalette.created_at.desc())
    )
    palettes = result.scalars().all()
    
    # Get color count for each palette
    response = []
    for palette in palettes:
        color_count_result = await db.execute(
            select(PaletteColor).where(PaletteColor.palette_id == palette.id)
        )
        color_count = len(color_count_result.scalars().all())
        
        response.append({
            "id": palette.id,
            "name": palette.name,
            "code": palette.code,
            "brand": palette.brand,
            "is_active": palette.is_active,
            "is_default": palette.is_default,
            "color_count": color_count
        })
    
    return response


@router.post("/", response_model=ColorPaletteResponse, status_code=status.HTTP_201_CREATED)
async def create_palette(
    palette_data: ColorPaletteCreate,
    current_admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """Create a new palette with colors (admin only)"""
    # Check if code already exists
    result = await db.execute(
        select(ColorPalette).where(ColorPalette.code == palette_data.code)
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Palette with code '{palette_data.code}' already exists"
        )
    
    # Create palette
    palette = ColorPalette(
        name=palette_data.name,
        code=palette_data.code,
        description=palette_data.description,
        brand=palette_data.brand,
        is_default=palette_data.is_default
    )
    db.add(palette)
    await db.flush()  # Get palette.id
    
    # Create colors
    for color_data in palette_data.colors:
        color = PaletteColor(
            palette_id=palette.id,
            color_code=color_data.color_code,
            name=color_data.name,
            hex=color_data.hex,
            is_transparent=color_data.is_transparent,
            is_glow=color_data.is_glow,
            is_metallic=color_data.is_metallic,
            display_order=color_data.display_order
        )
        db.add(color)
    
    await db.commit()
    await db.refresh(palette)
    
    # Load colors
    result = await db.execute(
        select(ColorPalette)
        .where(ColorPalette.id == palette.id)
        .options(selectinload(ColorPalette.colors))
    )
    palette = result.scalar_one()
    palette.colors.sort(key=lambda x: x.display_order)
    
    return {
        "id": palette.id,
        "name": palette.name,
        "code": palette.code,
        "description": palette.description,
        "brand": palette.brand,
        "is_active": palette.is_active,
        "is_default": palette.is_default,
        "colors": palette.colors,
        "created_at": palette.created_at.isoformat() if palette.created_at else None
    }


@router.get("/{palette_id}", response_model=ColorPaletteResponse)
async def get_palette(
    palette_id: UUID,
    current_admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get a specific palette with all colors (admin only)"""
    result = await db.execute(
        select(ColorPalette)
        .where(ColorPalette.id == palette_id)
        .options(selectinload(ColorPalette.colors))
    )
    palette = result.scalar_one_or_none()
    
    if not palette:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Palette not found"
        )
    
    palette.colors.sort(key=lambda x: x.display_order)
    
    return {
        "id": palette.id,
        "name": palette.name,
        "code": palette.code,
        "description": palette.description,
        "brand": palette.brand,
        "is_active": palette.is_active,
        "is_default": palette.is_default,
        "colors": palette.colors,
        "created_at": palette.created_at.isoformat() if palette.created_at else None
    }


@router.put("/{palette_id}", response_model=ColorPaletteResponse)
async def update_palette(
    palette_id: UUID,
    palette_data: ColorPaletteUpdate,
    current_admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """Update a palette (admin only)"""
    result = await db.execute(
        select(ColorPalette).where(ColorPalette.id == palette_id)
    )
    palette = result.scalar_one_or_none()
    
    if not palette:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Palette not found"
        )
    
    # Update fields
    if palette_data.name is not None:
        palette.name = palette_data.name
    if palette_data.description is not None:
        palette.description = palette_data.description
    if palette_data.brand is not None:
        palette.brand = palette_data.brand
    if palette_data.is_active is not None:
        palette.is_active = palette_data.is_active
    if palette_data.is_default is not None:
        palette.is_default = palette_data.is_default
    
    await db.commit()
    await db.refresh(palette)
    
    # Load colors
    result = await db.execute(
        select(ColorPalette)
        .where(ColorPalette.id == palette.id)
        .options(selectinload(ColorPalette.colors))
    )
    palette = result.scalar_one()
    palette.colors.sort(key=lambda x: x.display_order)
    
    return {
        "id": palette.id,
        "name": palette.name,
        "code": palette.code,
        "description": palette.description,
        "brand": palette.brand,
        "is_active": palette.is_active,
        "is_default": palette.is_default,
        "colors": palette.colors,
        "created_at": palette.created_at.isoformat() if palette.created_at else None
    }


@router.delete("/{palette_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_palette(
    palette_id: UUID,
    current_admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """Delete a palette (admin only)"""
    result = await db.execute(
        select(ColorPalette).where(ColorPalette.id == palette_id)
    )
    palette = result.scalar_one_or_none()
    
    if not palette:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Palette not found"
        )
    
    await db.delete(palette)
    await db.commit()
    
    return None


# Color management within a palette
@router.post("/{palette_id}/colors", response_model=PaletteColorResponse, status_code=status.HTTP_201_CREATED)
async def add_color_to_palette(
    palette_id: UUID,
    color_data: PaletteColorCreate,
    current_admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """Add a color to a palette (admin only)"""
    # Check if palette exists
    result = await db.execute(
        select(ColorPalette).where(ColorPalette.id == palette_id)
    )
    palette = result.scalar_one_or_none()
    
    if not palette:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Palette not found"
        )
    
    # Check if color code already exists in this palette
    result = await db.execute(
        select(PaletteColor).where(
            and_(
                PaletteColor.palette_id == palette_id,
                PaletteColor.color_code == color_data.color_code
            )
        )
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Color with code '{color_data.color_code}' already exists in this palette"
        )
    
    color = PaletteColor(
        palette_id=palette_id,
        color_code=color_data.color_code,
        name=color_data.name,
        hex=color_data.hex,
        is_transparent=color_data.is_transparent,
        is_glow=color_data.is_glow,
        is_metallic=color_data.is_metallic,
        display_order=color_data.display_order
    )
    db.add(color)
    await db.commit()
    await db.refresh(color)
    
    return color


@router.put("/{palette_id}/colors/{color_id}", response_model=PaletteColorResponse)
async def update_color(
    palette_id: UUID,
    color_id: UUID,
    color_data: PaletteColorCreate,
    current_admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """Update a color in a palette (admin only)"""
    result = await db.execute(
        select(PaletteColor).where(
            and_(
                PaletteColor.id == color_id,
                PaletteColor.palette_id == palette_id
            )
        )
    )
    color = result.scalar_one_or_none()
    
    if not color:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Color not found"
        )
    
    color.color_code = color_data.color_code
    color.name = color_data.name
    color.hex = color_data.hex
    color.is_transparent = color_data.is_transparent
    color.is_glow = color_data.is_glow
    color.is_metallic = color_data.is_metallic
    color.display_order = color_data.display_order
    
    await db.commit()
    await db.refresh(color)
    
    return color


@router.delete("/{palette_id}/colors/{color_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_color(
    palette_id: UUID,
    color_id: UUID,
    current_admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """Delete a color from a palette (admin only)"""
    result = await db.execute(
        select(PaletteColor).where(
            and_(
                PaletteColor.id == color_id,
                PaletteColor.palette_id == palette_id
            )
        )
    )
    color = result.scalar_one_or_none()
    
    if not color:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Color not found"
        )
    
    await db.delete(color)
    await db.commit()
    
    return None
