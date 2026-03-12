from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from datetime import datetime

from database import get_db
from models import User
from schemas import (
    UserCreate, UserLogin, UserResponse, Token,
    PasswordChange, PasswordResetRequest, PasswordResetConfirm,
    MessageResponse
)
from auth import (
    verify_password, get_password_hash, create_access_token,
    create_refresh_token, decode_token, get_current_user
)

router = APIRouter(prefix="/api/auth", tags=["用户认证"])
security = HTTPBearer()


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate, db: AsyncSession = Depends(get_db)):
    """Register a new user"""
    # Check if user already exists
    result = await db.execute(
        select(User).where(
            or_(User.phone == user_data.phone, User.username == user_data.username)
        )
    )
    existing_user = result.scalar_one_or_none()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this phone or username already exists"
        )
    
    # Create new user
    new_user = User(
        username=user_data.username,
        email=f"{user_data.phone}@placeholder.local",  # Placeholder email
        password_hash=get_password_hash(user_data.password),
        phone=user_data.phone,
        avatar_url=user_data.avatar_url,
        device_id=user_data.device_id,
        device_type=user_data.device_type,
        remaining_credits=10  # Default trial credits
    )
    
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    
    return new_user


@router.post("/login", response_model=Token)
async def login(credentials: UserLogin, db: AsyncSession = Depends(get_db)):
    """User login"""
    # Find user by phone
    result = await db.execute(
        select(User).where(User.phone == credentials.phone)
    )
    user = result.scalar_one_or_none()
    
    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect phone or password"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated"
        )
    
    # Update device info if provided
    if credentials.device_id:
        user.device_id = credentials.device_id
    if credentials.fcm_token:
        user.fcm_token = credentials.fcm_token
    
    await db.commit()
    
    # Create tokens
    access_token = create_access_token(data={"sub": str(user.id)})
    refresh_token = create_refresh_token(data={"sub": str(user.id)})
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }


@router.post("/refresh", response_model=Token)
async def refresh_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Refresh access token"""
    token = credentials.credentials
    payload = decode_token(token)
    
    if payload is None or payload.sub is None or payload.type != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
    
    # Create new tokens
    access_token = create_access_token(data={"sub": payload.sub})
    refresh_token = create_refresh_token(data={"sub": payload.sub})
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Get current user information"""
    return current_user


@router.put("/password", response_model=MessageResponse)
async def change_password(
    password_data: PasswordChange,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Change user password"""
    # Verify old password
    if not verify_password(password_data.old_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect old password"
        )
    
    # Update password
    current_user.password_hash = get_password_hash(password_data.new_password)
    await db.commit()
    
    return {"message": "Password changed successfully"}


@router.post("/password/reset-request", response_model=MessageResponse)
async def request_password_reset(data: PasswordResetRequest, db: AsyncSession = Depends(get_db)):
    """Request password reset"""
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()
    
    if not user:
        # Don't reveal if email exists
        return {"message": "If the email exists, a reset link has been sent"}
    
    # TODO: Send reset email with token
    # For now, just return success message
    return {"message": "If the email exists, a reset link has been sent"}


@router.post("/password/reset-confirm", response_model=MessageResponse)
async def confirm_password_reset(data: PasswordResetConfirm, db: AsyncSession = Depends(get_db)):
    """Confirm password reset"""
    # Decode reset token
    payload = decode_token(data.token)
    
    if payload is None or payload.sub is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )
    
    # Find user
    result = await db.execute(select(User).where(User.id == payload.sub))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Update password
    user.password_hash = get_password_hash(data.new_password)
    await db.commit()
    
    return {"message": "Password reset successfully"}