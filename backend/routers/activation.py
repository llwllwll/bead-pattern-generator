from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from datetime import datetime, timedelta

from database import get_db
from models import User, ActivationCode, UsageRecord
from schemas import (
    ActivationApply, ActivationResult, ActivationCodeResponse,
    UsageHistoryFilter, UsageRecordResponse, CreditInfo
)
from auth import get_current_user, check_credits_required

router = APIRouter(prefix="/api", tags=["激活码与额度"])


@router.post("/activation/validate")
async def validate_activation_code(
    data: ActivationApply,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Validate an activation code without applying it"""
    result = await db.execute(
        select(ActivationCode).where(ActivationCode.code == data.activation_code)
    )
    code = result.scalar_one_or_none()
    
    if not code:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid activation code"
        )
    
    # Check if code is already used
    if code.is_used:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Activation code has already been used"
        )
    
    # Check if code is expired
    if code.expires_at and code.expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Activation code has expired"
        )
    
    return {
        "valid": True,
        "code_type": code.code_type,
        "credits": code.credits,
        "validity_days": code.validity_days
    }


@router.post("/activation/apply", response_model=ActivationResult)
async def apply_activation_code(
    data: ActivationApply,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Apply an activation code to user account"""
    result = await db.execute(
        select(ActivationCode).where(ActivationCode.code == data.activation_code)
    )
    code = result.scalar_one_or_none()
    
    if not code:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid activation code"
        )
    
    # Check if code is already used
    if code.is_used:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Activation code has already been used"
        )
    
    # Check if code is expired
    if code.expires_at and code.expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Activation code has expired"
        )
    
    # Mark code as used
    code.is_used = True
    code.used_by = current_user.id
    code.used_at = datetime.utcnow()
    
    # Update user credits and activation info
    current_user.remaining_credits += code.credits
    current_user.activation_code_id = code.id
    current_user.activated_at = datetime.utcnow()
    
    # Set expiration if validity_days is specified
    if code.validity_days:
        current_user.expires_at = datetime.utcnow() + timedelta(days=code.validity_days)
    
    await db.commit()
    
    return ActivationResult(
        success=True,
        message=f"Successfully activated! Added {code.credits} credits.",
        credits_added=code.credits,
        total_credits=current_user.remaining_credits
    )


@router.get("/activation/history", response_model=list[ActivationCodeResponse])
async def get_activation_history(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get user's activation code history"""
    result = await db.execute(
        select(ActivationCode).where(ActivationCode.used_by == current_user.id)
    )
    codes = result.scalars().all()
    
    return codes


@router.get("/user/credits", response_model=CreditInfo)
async def get_user_credits(current_user: User = Depends(get_current_user)):
    """Get user's credit information"""
    return CreditInfo(
        remaining_credits=current_user.remaining_credits,
        total_used=current_user.total_used,
        last_used_at=current_user.last_used_at
    )


@router.get("/user/usage-history", response_model=list[UsageRecordResponse])
async def get_usage_history(
    filters: UsageHistoryFilter = Depends(),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get user's usage history"""
    query = select(UsageRecord).where(UsageRecord.user_id == current_user.id)
    
    # Apply date filters
    if filters.start_date:
        query = query.where(UsageRecord.created_at >= filters.start_date)
    if filters.end_date:
        query = query.where(UsageRecord.created_at <= filters.end_date)
    
    # Order by created_at desc
    query = query.order_by(UsageRecord.created_at.desc())
    
    # Apply pagination
    query = query.offset((filters.page - 1) * filters.limit).limit(filters.limit)
    
    result = await db.execute(query)
    records = result.scalars().all()
    
    return records


async def deduct_credits(
    user: User,
    action_type: str,
    credits: int = 1,
    db: AsyncSession = None
):
    """Deduct credits from user and record usage"""
    if user.remaining_credits < credits:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Insufficient credits"
        )
    
    # Deduct credits
    user.remaining_credits -= credits
    user.total_used += credits
    user.last_used_at = datetime.utcnow()
    
    # Create usage record
    usage_record = UsageRecord(
        user_id=user.id,
        action_type=action_type,
        credits_used=credits
    )
    
    db.add(usage_record)
    await db.commit()
    
    return user.remaining_credits