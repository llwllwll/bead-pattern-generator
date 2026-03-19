"""
Color Palette Management Router - Brand -> Series -> Color Hierarchy
"""
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, and_, func
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import Brand, Series, Color, Admin, User
from auth import get_current_admin, get_current_user
from schemas import (
    BrandCreate, BrandUpdate, BrandResponse, BrandWithSeriesResponse,
    SeriesCreate, SeriesUpdate, SeriesResponse, SeriesWithColorsResponse,
    ColorCreate, ColorUpdate, ColorResponse,
    HierarchicalBrandResponse, HierarchicalSeriesResponse,
    ColorImportRequest, ColorImportResult,
    PublicBrandListResponse, PublicSeriesListResponse
)

router = APIRouter(prefix="/api/palettes", tags=["palette-management"])


# ============== Helper Functions ==============

async def get_brand_or_404(db: AsyncSession, brand_id: UUID) -> Brand:
    """获取品牌或返回404"""
    result = await db.execute(select(Brand).where(Brand.id == brand_id))
    brand = result.scalar_one_or_none()
    if not brand:
        raise HTTPException(status_code=404, detail="品牌不存在")
    return brand


async def get_series_or_404(db: AsyncSession, series_id: UUID) -> Series:
    """获取系列或返回404"""
    result = await db.execute(
        select(Series).options(selectinload(Series.brand)).where(Series.id == series_id)
    )
    series = result.scalar_one_or_none()
    if not series:
        raise HTTPException(status_code=404, detail="系列不存在")
    return series


async def get_color_or_404(db: AsyncSession, color_id: UUID) -> Color:
    """获取颜色或返回404"""
    result = await db.execute(
        select(Color).options(
            selectinload(Color.series).selectinload(Series.brand)
        ).where(Color.id == color_id)
    )
    color = result.scalar_one_or_none()
    if not color:
        raise HTTPException(status_code=404, detail="颜色不存在")
    return color


# ============== Brand Management ==============

@router.get("/brands", response_model=List[BrandResponse])
async def list_brands(
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """List all brands"""
    result = await db.execute(
        select(Brand).order_by(Brand.display_order, Brand.name)
    )
    brands = result.scalars().all()
    
    # 计算每个品牌的系列数量
    response = []
    for brand in brands:
        series_count_result = await db.execute(
            select(func.count(Series.id)).where(Series.brand_id == brand.id)
        )
        series_count = series_count_result.scalar()
        
        response.append({
            "id": brand.id,
            "name": brand.name,
            "code": brand.code,
            "description": brand.description,
            "logo_url": brand.logo_url,
            "is_active": brand.is_active,
            "display_order": brand.display_order,
            "created_at": brand.created_at,
            "updated_at": brand.updated_at,
            "series_count": series_count
        })
    
    return response


@router.post("/brands", response_model=BrandResponse, status_code=201)
async def create_brand(
    data: BrandCreate,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Create a new brand"""
    # Check if code already exists
    existing = await db.execute(select(Brand).where(Brand.code == data.code))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="品牌代码已存在")
    
    brand = Brand(**data.dict())
    db.add(brand)
    await db.commit()
    await db.refresh(brand)
    
    return {
        "id": brand.id,
        "name": brand.name,
        "code": brand.code,
        "description": brand.description,
        "logo_url": brand.logo_url,
        "is_active": brand.is_active,
        "display_order": brand.display_order,
        "created_at": brand.created_at,
        "updated_at": brand.updated_at,
        "series_count": 0
    }


@router.get("/brands/{brand_id}", response_model=BrandWithSeriesResponse)
async def get_brand(
    brand_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Get brand details with series"""
    brand = await get_brand_or_404(db, brand_id)
    
    # Get series with color count
    result = await db.execute(
        select(Series).where(Series.brand_id == brand_id).order_by(Series.display_order)
    )
    series_list = result.scalars().all()
    
    series_data = []
    for series in series_list:
        color_count_result = await db.execute(
            select(func.count(Color.id)).where(Color.series_id == series.id)
        )
        color_count = color_count_result.scalar()
        
        series_data.append({
            "id": series.id,
            "name": series.name,
            "code": series.code,
            "description": series.description,
            "is_active": series.is_active,
            "is_default": series.is_default,
            "display_order": series.display_order,
            "brand_id": series.brand_id,
            "brand_name": brand.name,
            "created_at": series.created_at,
            "updated_at": series.updated_at,
            "color_count": color_count
        })
    
    return {
        "id": brand.id,
        "name": brand.name,
        "code": brand.code,
        "description": brand.description,
        "logo_url": brand.logo_url,
        "is_active": brand.is_active,
        "display_order": brand.display_order,
        "created_at": brand.created_at,
        "updated_at": brand.updated_at,
        "series_count": len(series_data),
        "series": series_data
    }


@router.put("/brands/{brand_id}", response_model=BrandResponse)
async def update_brand(
    brand_id: UUID,
    data: BrandUpdate,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Update a brand"""
    brand = await get_brand_or_404(db, brand_id)
    
    # Check code uniqueness if updating code
    if data.code and data.code != brand.code:
        existing = await db.execute(select(Brand).where(Brand.code == data.code))
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="品牌代码已存在")
    
    update_data = {k: v for k, v in data.dict().items() if v is not None}
    for key, value in update_data.items():
        setattr(brand, key, value)
    
    await db.commit()
    await db.refresh(brand)
    
    series_count_result = await db.execute(
        select(func.count(Series.id)).where(Series.brand_id == brand.id)
    )
    
    return {
        "id": brand.id,
        "name": brand.name,
        "code": brand.code,
        "description": brand.description,
        "logo_url": brand.logo_url,
        "is_active": brand.is_active,
        "display_order": brand.display_order,
        "created_at": brand.created_at,
        "updated_at": brand.updated_at,
        "series_count": series_count_result.scalar()
    }


@router.delete("/brands/{brand_id}", status_code=204)
async def delete_brand(
    brand_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Delete a brand (will cascade delete series and colors)"""
    brand = await get_brand_or_404(db, brand_id)
    await db.delete(brand)
    await db.commit()
    return None


@router.post("/brands/batch-reorder", status_code=200)
async def batch_reorder_brands(
    orders: List[dict],
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Batch update brand display order"""
    for item in orders:
        brand_id = item.get('id')
        display_order = item.get('display_order')
        if brand_id and display_order is not None:
            result = await db.execute(
                select(Brand).where(Brand.id == UUID(brand_id))
            )
            brand = result.scalar_one_or_none()
            if brand:
                brand.display_order = display_order
    
    await db.commit()
    return {"message": "排序更新成功"}


@router.post("/brands/batch-delete", status_code=200)
async def batch_delete_brands(
    brand_ids: List[str],
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Batch delete brands"""
    deleted_count = 0
    for brand_id_str in brand_ids:
        try:
            brand_id = UUID(brand_id_str)
            result = await db.execute(
                select(Brand).where(Brand.id == brand_id)
            )
            brand = result.scalar_one_or_none()
            if brand:
                await db.delete(brand)
                deleted_count += 1
        except Exception:
            pass
    
    await db.commit()
    return {"message": f"成功删除 {deleted_count} 个品牌", "deleted_count": deleted_count}


@router.post("/brands/export")
async def export_brands(
    brand_ids: Optional[List[str]] = None,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Export brands data"""
    query = select(Brand).order_by(Brand.display_order, Brand.name)
    
    if brand_ids:
        uuid_ids = [UUID(bid) for bid in brand_ids]
        query = query.where(Brand.id.in_(uuid_ids))
    
    result = await db.execute(query)
    brands = result.scalars().all()
    
    export_data = []
    for brand in brands:
        series_result = await db.execute(
            select(Series).where(Series.brand_id == brand.id)
        )
        series_list = series_result.scalars().all()
        
        for series in series_list:
            color_result = await db.execute(
                select(Color).where(Color.series_id == series.id)
            )
            colors = color_result.scalars().all()
            
            for color in colors:
                export_data.append({
                    "brand_code": brand.code,
                    "brand_name": brand.name,
                    "series_code": series.code,
                    "series_name": series.name,
                    "color_code": color.color_code,
                    "color_name": color.name or "",
                    "hex": color.hex,
                    "is_transparent": color.is_transparent,
                    "is_glow": color.is_glow,
                    "is_metallic": color.is_metallic
                })
    
    return export_data


# ============== Series Management ==============

@router.get("/series", response_model=List[SeriesResponse])
async def list_series(
    brand_id: Optional[UUID] = None,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """List all series, optionally filtered by brand"""
    query = select(Series).options(selectinload(Series.brand))
    
    if brand_id:
        query = query.where(Series.brand_id == brand_id)
    
    query = query.order_by(Series.display_order, Series.name)
    result = await db.execute(query)
    series_list = result.scalars().all()
    
    response = []
    for series in series_list:
        color_count_result = await db.execute(
            select(func.count(Color.id)).where(Color.series_id == series.id)
        )
        
        response.append({
            "id": series.id,
            "name": series.name,
            "code": series.code,
            "description": series.description,
            "is_active": series.is_active,
            "is_default": series.is_default,
            "display_order": series.display_order,
            "brand_id": series.brand_id,
            "brand_name": series.brand.name if series.brand else None,
            "created_at": series.created_at,
            "updated_at": series.updated_at,
            "color_count": color_count_result.scalar()
        })
    
    return response


@router.post("/series", response_model=SeriesResponse, status_code=201)
async def create_series(
    data: SeriesCreate,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Create a new series"""
    # Verify brand exists
    brand = await get_brand_or_404(db, data.brand_id)
    
    # Check if code already exists for this brand
    existing = await db.execute(
        select(Series).where(
            and_(Series.brand_id == data.brand_id, Series.code == data.code)
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="该品牌下系列代码已存在")
    
    series = Series(**data.dict())
    db.add(series)
    await db.commit()
    await db.refresh(series)
    
    return {
        "id": series.id,
        "name": series.name,
        "code": series.code,
        "description": series.description,
        "is_active": series.is_active,
        "is_default": series.is_default,
        "display_order": series.display_order,
        "brand_id": series.brand_id,
        "brand_name": brand.name,
        "created_at": series.created_at,
        "updated_at": series.updated_at,
        "color_count": 0
    }


@router.get("/series/{series_id}", response_model=SeriesWithColorsResponse)
async def get_series(
    series_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Get series details with colors"""
    series = await get_series_or_404(db, series_id)
    
    # Get colors
    result = await db.execute(
        select(Color).where(Color.series_id == series_id).order_by(Color.display_order, Color.color_code)
    )
    colors = result.scalars().all()
    
    colors_data = []
    for color in colors:
        colors_data.append({
            "id": color.id,
            "color_code": color.color_code,
            "name": color.name,
            "hex": color.hex,
            "is_transparent": color.is_transparent,
            "is_glow": color.is_glow,
            "is_metallic": color.is_metallic,
            "display_order": color.display_order,
            "series_id": color.series_id,
            "series_name": series.name,
            "brand_name": series.brand.name if series.brand else None,
            "created_at": color.created_at,
            "updated_at": color.updated_at
        })
    
    return {
        "id": series.id,
        "name": series.name,
        "code": series.code,
        "description": series.description,
        "is_active": series.is_active,
        "is_default": series.is_default,
        "display_order": series.display_order,
        "brand_id": series.brand_id,
        "brand_name": series.brand.name if series.brand else None,
        "created_at": series.created_at,
        "updated_at": series.updated_at,
        "color_count": len(colors_data),
        "colors": colors_data
    }


@router.put("/series/{series_id}", response_model=SeriesResponse)
async def update_series(
    series_id: UUID,
    data: SeriesUpdate,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Update a series"""
    series = await get_series_or_404(db, series_id)
    
    # Check code uniqueness if updating code
    if data.code and data.code != series.code:
        existing = await db.execute(
            select(Series).where(
                and_(Series.brand_id == series.brand_id, Series.code == data.code)
            )
        )
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="该品牌下系列代码已存在")
    
    update_data = {k: v for k, v in data.dict().items() if v is not None}
    for key, value in update_data.items():
        setattr(series, key, value)
    
    await db.commit()
    await db.refresh(series)
    
    color_count_result = await db.execute(
        select(func.count(Color.id)).where(Color.series_id == series.id)
    )
    
    return {
        "id": series.id,
        "name": series.name,
        "code": series.code,
        "description": series.description,
        "is_active": series.is_active,
        "is_default": series.is_default,
        "display_order": series.display_order,
        "brand_id": series.brand_id,
        "brand_name": series.brand.name if series.brand else None,
        "created_at": series.created_at,
        "updated_at": series.updated_at,
        "color_count": color_count_result.scalar()
    }


@router.delete("/series/{series_id}", status_code=204)
async def delete_series(
    series_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Delete a series (will cascade delete colors)"""
    series = await get_series_or_404(db, series_id)
    await db.delete(series)
    await db.commit()
    return None


@router.post("/series/batch-reorder", status_code=200)
async def batch_reorder_series(
    orders: List[dict],
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Batch update series display order"""
    for item in orders:
        series_id = item.get('id')
        display_order = item.get('display_order')
        if series_id and display_order is not None:
            result = await db.execute(
                select(Series).where(Series.id == UUID(series_id))
            )
            series = result.scalar_one_or_none()
            if series:
                series.display_order = display_order
    
    await db.commit()
    return {"message": "排序更新成功"}


@router.post("/series/batch-delete", status_code=200)
async def batch_delete_series(
    series_ids: List[str],
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Batch delete series"""
    deleted_count = 0
    for series_id_str in series_ids:
        try:
            series_id = UUID(series_id_str)
            result = await db.execute(
                select(Series).where(Series.id == series_id)
            )
            series = result.scalar_one_or_none()
            if series:
                await db.delete(series)
                deleted_count += 1
        except Exception:
            pass
    
    await db.commit()
    return {"message": f"成功删除 {deleted_count} 个系列", "deleted_count": deleted_count}


@router.post("/series/export")
async def export_series(
    series_ids: Optional[List[str]] = None,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Export series data"""
    query = select(Series).options(selectinload(Series.brand)).order_by(Series.display_order, Series.name)
    
    if series_ids:
        uuid_ids = [UUID(sid) for sid in series_ids]
        query = query.where(Series.id.in_(uuid_ids))
    
    result = await db.execute(query)
    series_list = result.scalars().all()
    
    export_data = []
    for series in series_list:
        color_result = await db.execute(
            select(Color).where(Color.series_id == series.id)
        )
        colors = color_result.scalars().all()
        
        for color in colors:
            export_data.append({
                "brand_code": series.brand.code if series.brand else "",
                "brand_name": series.brand.name if series.brand else "",
                "series_code": series.code,
                "series_name": series.name,
                "color_code": color.color_code,
                "color_name": color.name or "",
                "hex": color.hex,
                "is_transparent": color.is_transparent,
                "is_glow": color.is_glow,
                "is_metallic": color.is_metallic
            })
    
    return export_data


# ============== Color Management ==============

@router.get("/colors", response_model=List[ColorResponse])
async def list_colors(
    series_id: Optional[UUID] = None,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """List all colors, optionally filtered by series"""
    from sqlalchemy.orm import joinedload
    
    query = select(Color).options(
        selectinload(Color.series).selectinload(Series.brand)
    )
    
    if series_id:
        query = query.where(Color.series_id == series_id)
    
    query = query.order_by(Color.display_order, Color.color_code)
    result = await db.execute(query)
    colors = result.scalars().all()
    
    response = []
    for color in colors:
        series = color.series
        brand = series.brand if series else None
        
        response.append({
            "id": color.id,
            "color_code": color.color_code,
            "name": color.name,
            "hex": color.hex,
            "is_transparent": color.is_transparent,
            "is_glow": color.is_glow,
            "is_metallic": color.is_metallic,
            "display_order": color.display_order,
            "series_id": color.series_id,
            "series_name": series.name if series else None,
            "brand_name": brand.name if brand else None,
            "created_at": color.created_at,
            "updated_at": color.updated_at
        })
    
    return response


@router.post("/series/{series_id}/colors", response_model=ColorResponse, status_code=201)
async def create_color(
    series_id: UUID,
    data: ColorCreate,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Create a new color in a series"""
    # Verify series exists
    series = await get_series_or_404(db, series_id)
    
    # Check if color_code already exists for this series
    existing = await db.execute(
        select(Color).where(
            and_(Color.series_id == series_id, Color.color_code == data.color_code)
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="该系列下颜色编号已存在")
    
    color = Color(series_id=series_id, **data.dict(exclude={'series_id'}))
    db.add(color)
    await db.commit()
    await db.refresh(color)
    
    return {
        "id": color.id,
        "color_code": color.color_code,
        "name": color.name,
        "hex": color.hex,
        "is_transparent": color.is_transparent,
        "is_glow": color.is_glow,
        "is_metallic": color.is_metallic,
        "display_order": color.display_order,
        "series_id": color.series_id,
        "series_name": series.name,
        "brand_name": series.brand.name if series.brand else None,
        "created_at": color.created_at,
        "updated_at": color.updated_at
    }


@router.put("/colors/{color_id}", response_model=ColorResponse)
async def update_color(
    color_id: UUID,
    data: ColorUpdate,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Update a color"""
    color = await get_color_or_404(db, color_id)
    
    # Check color_code uniqueness if updating
    if data.color_code and data.color_code != color.color_code:
        existing = await db.execute(
            select(Color).where(
                and_(Color.series_id == color.series_id, Color.color_code == data.color_code)
            )
        )
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="该系列下颜色编号已存在")
    
    update_data = {k: v for k, v in data.dict().items() if v is not None}
    for key, value in update_data.items():
        setattr(color, key, value)
    
    await db.commit()
    await db.refresh(color)
    
    series = color.series
    return {
        "id": color.id,
        "color_code": color.color_code,
        "name": color.name,
        "hex": color.hex,
        "is_transparent": color.is_transparent,
        "is_glow": color.is_glow,
        "is_metallic": color.is_metallic,
        "display_order": color.display_order,
        "series_id": color.series_id,
        "series_name": series.name if series else None,
        "brand_name": series.brand.name if series and series.brand else None,
        "created_at": color.created_at,
        "updated_at": color.updated_at
    }


@router.delete("/colors/{color_id}", status_code=204)
async def delete_color(
    color_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Delete a color"""
    color = await get_color_or_404(db, color_id)
    await db.delete(color)
    await db.commit()
    return None


# ============== Bulk Import ==============

@router.post("/import", response_model=ColorImportResult)
async def import_colors(
    data: ColorImportRequest,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Bulk import colors with brand and series creation"""
    errors = []
    imported = 0
    
    for idx, row in enumerate(data.rows):
        try:
            # Find or create brand
            brand_result = await db.execute(
                select(Brand).where(Brand.code == row.brand_code)
            )
            brand = brand_result.scalar_one_or_none()
            
            if not brand:
                if not data.create_brands:
                    errors.append(f"第 {idx + 1} 行: 品牌 '{row.brand_code}' 不存在")
                    continue
                
                brand = Brand(
                    name=row.brand_name,
                    code=row.brand_code,
                    is_active=True
                )
                db.add(brand)
                await db.flush()
            
            # Find or create series
            series_result = await db.execute(
                select(Series).where(
                    and_(Series.brand_id == brand.id, Series.code == row.series_code)
                )
            )
            series = series_result.scalar_one_or_none()
            
            if not series:
                if not data.create_series:
                    errors.append(f"第 {idx + 1} 行: 系列 '{row.series_code}' 不存在")
                    continue
                
                series = Series(
                    brand_id=brand.id,
                    name=row.series_name,
                    code=row.series_code,
                    is_active=True
                )
                db.add(series)
                await db.flush()
            
            # Check if color already exists
            existing_color = await db.execute(
                select(Color).where(
                    and_(Color.series_id == series.id, Color.color_code == row.color_code)
                )
            )
            if existing_color.scalar_one_or_none():
                errors.append(f"第 {idx + 1} 行: 颜色 '{row.color_code}' 已存在于系列 '{row.series_code}'")
                continue
            
            # Create color
            color = Color(
                series_id=series.id,
                color_code=row.color_code,
                name=row.color_name,
                hex=row.hex,
                is_transparent=row.is_transparent,
                is_glow=row.is_glow,
                is_metallic=row.is_metallic
            )
            db.add(color)
            imported += 1
            
        except Exception as e:
            errors.append(f"第 {idx + 1} 行: {str(e)}")
    
    await db.commit()
    
    return {
        "success": len(errors) == 0,
        "total": len(data.rows),
        "imported": imported,
        "failed": len(data.rows) - imported,
        "errors": errors
    }


# ============== Public APIs (for frontend) ==============

@router.get("/public/brands", response_model=List[PublicBrandListResponse])
async def list_public_brands(db: AsyncSession = Depends(get_db)):
    """List all active brands for public use"""
    result = await db.execute(
        select(Brand)
        .where(Brand.is_active == True)
        .order_by(Brand.display_order, Brand.name)
    )
    brands = result.scalars().all()
    
    response = []
    for brand in brands:
        series_count_result = await db.execute(
            select(func.count(Series.id)).where(
                and_(Series.brand_id == brand.id, Series.is_active == True)
            )
        )
        response.append({
            "id": brand.id,
            "name": brand.name,
            "code": brand.code,
            "series_count": series_count_result.scalar()
        })
    
    return response


@router.get("/public/brands/{brand_id}/series", response_model=List[PublicSeriesListResponse])
async def list_public_series(brand_id: UUID, db: AsyncSession = Depends(get_db)):
    """List all active series for a brand"""
    result = await db.execute(
        select(Series)
        .options(selectinload(Series.brand))
        .where(
            and_(Series.brand_id == brand_id, Series.is_active == True)
        )
        .order_by(Series.is_default.desc(), Series.display_order, Series.name)
    )
    series_list = result.scalars().all()
    
    response = []
    for series in series_list:
        color_count_result = await db.execute(
            select(func.count(Color.id)).where(Color.series_id == series.id)
        )
        response.append({
            "id": series.id,
            "name": series.name,
            "code": series.code,
            "brand_id": series.brand_id,
            "brand_name": series.brand.name if series.brand else "",
            "is_default": series.is_default,
            "color_count": color_count_result.scalar()
        })
    
    return response


@router.get("/public/series/{series_id}/colors", response_model=List[ColorResponse])
async def get_public_series_colors(series_id: UUID, db: AsyncSession = Depends(get_db)):
    """Get all colors for a series"""
    result = await db.execute(
        select(Series)
        .options(selectinload(Series.brand))
        .where(Series.id == series_id)
    )
    series = result.scalar_one_or_none()
    
    if not series or not series.is_active:
        raise HTTPException(status_code=404, detail="系列不存在或未激活")
    
    result = await db.execute(
        select(Color)
        .where(Color.series_id == series_id)
        .order_by(Color.display_order, Color.color_code)
    )
    colors = result.scalars().all()
    
    return [{
        "id": color.id,
        "color_code": color.color_code,
        "name": color.name,
        "hex": color.hex,
        "is_transparent": color.is_transparent,
        "is_glow": color.is_glow,
        "is_metallic": color.is_metallic,
        "display_order": color.display_order,
        "series_id": color.series_id,
        "series_name": series.name,
        "brand_name": series.brand.name if series.brand else None,
        "created_at": color.created_at,
        "updated_at": color.updated_at
    } for color in colors]


@router.get("/hierarchy", response_model=List[HierarchicalBrandResponse])
async def get_public_hierarchy(db: AsyncSession = Depends(get_db)):
    """Get full brand -> series -> color hierarchy for public use"""
    result = await db.execute(
        select(Brand)
        .where(Brand.is_active == True)
        .order_by(Brand.display_order, Brand.name)
    )
    brands = result.scalars().all()
    
    response = []
    for brand in brands:
        series_result = await db.execute(
            select(Series)
            .where(
                and_(Series.brand_id == brand.id, Series.is_active == True)
            )
            .order_by(Series.is_default.desc(), Series.display_order, Series.name)
        )
        series_list = series_result.scalars().all()
        
        series_data = []
        for series in series_list:
            color_result = await db.execute(
                select(Color)
                .where(Color.series_id == series.id)
                .order_by(Color.display_order, Color.color_code)
            )
            colors = color_result.scalars().all()
            
            series_data.append({
                "id": series.id,
                "name": series.name,
                "code": series.code,
                "description": series.description,
                "is_default": series.is_default,
                "colors": [{
                    "id": color.id,
                    "color_code": color.color_code,
                    "name": color.name,
                    "hex": color.hex,
                    "is_transparent": color.is_transparent,
                    "is_glow": color.is_glow,
                    "is_metallic": color.is_metallic,
                    "display_order": color.display_order,
                    "series_id": color.series_id,
                    "series_name": series.name,
                    "brand_name": brand.name,
                    "created_at": color.created_at,
                    "updated_at": color.updated_at
                } for color in colors]
            })
        
        response.append({
            "id": brand.id,
            "name": brand.name,
            "code": brand.code,
            "description": brand.description,
            "series": series_data
        })
    
    return response


# ============== Legacy API Compatibility ==============

@router.get("/public", response_model=List[PublicSeriesListResponse])
async def list_public_palettes_legacy(db: AsyncSession = Depends(get_db)):
    """Legacy API: List all active series as palettes"""
    return await list_public_series_brand_optional(db)


async def list_public_series_brand_optional(db: AsyncSession):
    """Helper to list all active series"""
    result = await db.execute(
        select(Series)
        .options(selectinload(Series.brand))
        .where(Series.is_active == True)
        .order_by(Series.is_default.desc(), Series.display_order, Series.name)
    )
    series_list = result.scalars().all()
    
    response = []
    for series in series_list:
        color_count_result = await db.execute(
            select(func.count(Color.id)).where(Color.series_id == series.id)
        )
        response.append({
            "id": series.id,
            "name": f"{series.brand.name} - {series.name}" if series.brand else series.name,
            "code": series.code,
            "brand_id": series.brand_id,
            "brand_name": series.brand.name if series.brand else "",
            "is_default": series.is_default,
            "color_count": color_count_result.scalar()
        })
    
    return response


@router.get("/legacy/{palette_id}", response_model=SeriesWithColorsResponse)
async def get_public_palette_legacy(palette_id: str, db: AsyncSession = Depends(get_db)):
    """Legacy API: Get series as palette"""
    try:
        series_id = UUID(palette_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="无效的系列ID")
    
    result = await db.execute(
        select(Series)
        .options(selectinload(Series.brand))
        .where(Series.id == series_id)
    )
    series = result.scalar_one_or_none()
    
    if not series or not series.is_active:
        raise HTTPException(status_code=404, detail="系列不存在或未激活")
    
    color_result = await db.execute(
        select(Color)
        .where(Color.series_id == series.id)
        .order_by(Color.display_order, Color.color_code)
    )
    colors = color_result.scalars().all()
    
    return {
        "id": series.id,
        "name": f"{series.brand.name} - {series.name}" if series.brand else series.name,
        "code": series.code,
        "description": series.description,
        "is_active": series.is_active,
        "is_default": series.is_default,
        "display_order": series.display_order,
        "brand_id": series.brand_id,
        "brand_name": series.brand.name if series.brand else None,
        "created_at": series.created_at,
        "updated_at": series.updated_at,
        "color_count": len(colors),
        "colors": [{
            "id": color.id,
            "color_code": color.color_code,
            "name": color.name,
            "hex": color.hex,
            "is_transparent": color.is_transparent,
            "is_glow": color.is_glow,
            "is_metallic": color.is_metallic,
            "display_order": color.display_order,
            "series_id": color.series_id,
            "series_name": series.name,
            "brand_name": series.brand.name if series.brand else None,
            "created_at": color.created_at,
            "updated_at": color.updated_at
        } for color in colors]
    }
