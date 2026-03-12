from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
import json

from database import get_db
from models import User
from schemas import (
    PatternGenerateRequest, PatternGenerateResponse,
    PermissionCheckResponse
)
from auth import get_current_user, check_credits_required
from routers.activation import deduct_credits

router = APIRouter(prefix="/api/pattern", tags=["图案生成"])


@router.get("/check-permission", response_model=PermissionCheckResponse)
async def check_permission(current_user: User = Depends(get_current_user)):
    """Check user's permissions for pattern generation"""
    # Check if user has active subscription or credits
    can_generate = current_user.remaining_credits > 0
    
    # Default permissions (can be enhanced with subscription plans)
    return PermissionCheckResponse(
        can_generate=can_generate,
        can_export_pdf=True,  # All users can export PDF
        can_use_custom_palette=current_user.remaining_credits > 0,
        remaining_credits=current_user.remaining_credits,
        max_image_size=5242880,  # 5MB
        max_output_size="100x100",
        message=None if can_generate else "Insufficient credits. Please purchase or enter an activation code."
    )


@router.post("/generate", response_model=PatternGenerateResponse)
async def generate_pattern(
    width: int = Form(..., ge=10, le=200),
    height: int = Form(..., ge=10, le=200),
    palette: Optional[str] = Form(None),
    options: Optional[str] = Form(None),
    image: UploadFile = File(...),
    current_user: User = Depends(check_credits_required),
    db: AsyncSession = Depends(get_db)
):
    """Generate bead pattern from uploaded image"""
    
    # Validate image size (5MB limit)
    contents = await image.read()
    if len(contents) > 5242880:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Image size exceeds 5MB limit"
        )
    
    # Parse options if provided
    parsed_options = {}
    if options:
        try:
            parsed_options = json.loads(options)
        except json.JSONDecodeError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid options JSON"
            )
    
    # TODO: Implement actual pattern generation logic here
    # For now, simulate the generation
    
    # Deduct credits
    remaining = await deduct_credits(
        user=current_user,
        action_type="generate",
        credits=1,
        db=db
    )
    
    return PatternGenerateResponse(
        success=True,
        message="Pattern generated successfully",
        credits_remaining=remaining,
        result_url=None  # Would be the URL to the generated pattern
    )


@router.post("/generate-json", response_model=PatternGenerateResponse)
async def generate_pattern_json(
    data: PatternGenerateRequest,
    current_user: User = Depends(check_credits_required),
    db: AsyncSession = Depends(get_db)
):
    """Generate bead pattern (JSON body version for non-file uploads)"""
    
    # TODO: Implement actual pattern generation logic here
    # This endpoint is for when the image is already uploaded or processed client-side
    
    # Deduct credits
    remaining = await deduct_credits(
        user=current_user,
        action_type="generate",
        credits=1,
        db=db
    )
    
    return PatternGenerateResponse(
        success=True,
        message="Pattern generated successfully",
        credits_remaining=remaining,
        result_url=None
    )