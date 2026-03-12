from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List
from datetime import datetime
from decimal import Decimal
import uuid


# ============== User Schemas ==============

class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    phone: Optional[str] = Field(None, pattern=r'^1[3-9]\d{9}$')
    avatar_url: Optional[str] = None


class UserCreate(UserBase):
    password: str = Field(..., min_length=6, max_length=100)
    device_id: Optional[str] = None
    device_type: Optional[str] = None


class UserLogin(BaseModel):
    phone: str
    password: str
    device_id: Optional[str] = None
    fcm_token: Optional[str] = None


class UserResponse(BaseModel):
    id: uuid.UUID
    username: str
    email: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    is_active: bool
    is_verified: bool
    is_superuser: bool
    remaining_credits: int
    total_used: int
    activated_at: Optional[datetime] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class UserProfileResponse(UserResponse):
    last_used_at: Optional[datetime] = None
    device_type: Optional[str] = None


# ============== Token Schemas ==============

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenPayload(BaseModel):
    sub: Optional[str] = None
    exp: Optional[int] = None
    type: Optional[str] = None


# ============== Password Schemas ==============

class PasswordChange(BaseModel):
    old_password: str
    new_password: str = Field(..., min_length=6, max_length=100)


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str = Field(..., min_length=6, max_length=100)


# ============== Activation Code Schemas ==============

class ActivationCodeBase(BaseModel):
    code: str = Field(..., min_length=8, max_length=50)


class ActivationCodeCreate(BaseModel):
    code_type: str = Field(..., pattern="^(trial|monthly|yearly|permanent)$")
    credits: int = Field(..., gt=0)
    validity_days: Optional[int] = None
    price: Optional[Decimal] = None
    currency: str = "CNY"
    batch_id: Optional[str] = None
    note: Optional[str] = None
    expires_at: Optional[datetime] = None


class ActivationCodeResponse(BaseModel):
    id: uuid.UUID
    code: str
    code_type: str
    credits: int
    validity_days: Optional[int]
    is_used: bool
    used_at: Optional[datetime]
    created_at: datetime
    expires_at: Optional[datetime]
    
    class Config:
        from_attributes = True


class ActivationApply(BaseModel):
    activation_code: str


class ActivationResult(BaseModel):
    success: bool
    message: str
    credits_added: int
    total_credits: int


# ============== Usage Record Schemas ==============

class UsageRecordBase(BaseModel):
    action_type: str
    credits_used: int = 1
    image_size: Optional[int] = None
    result_size: Optional[str] = None
    processing_time: Optional[int] = None
    success: bool = True
    error_message: Optional[str] = None


class UsageRecordCreate(UsageRecordBase):
    pass


class UsageRecordResponse(UsageRecordBase):
    id: uuid.UUID
    user_id: uuid.UUID
    ip_address: Optional[str]
    user_agent: Optional[str]
    device_info: Optional[dict]
    created_at: datetime
    
    class Config:
        from_attributes = True


class UsageHistoryFilter(BaseModel):
    page: int = Field(default=1, ge=1)
    limit: int = Field(default=20, ge=1, le=100)
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None


# ============== Credit Schemas ==============

class CreditInfo(BaseModel):
    remaining_credits: int
    total_used: int
    last_used_at: Optional[datetime] = None


class CreditUpdate(BaseModel):
    action: str = Field(..., pattern="^(add|subtract|set)$")
    amount: int = Field(..., ge=0)
    note: Optional[str] = None


# ============== Subscription Plan Schemas ==============

class SubscriptionPlanBase(BaseModel):
    name: str
    code: str
    monthly_credits: Optional[int] = None
    total_credits: Optional[int] = None
    max_image_size: int = 5242880
    max_output_size: str = "100x100"
    allow_pdf_export: bool = True
    allow_custom_palette: bool = False
    allow_batch_process: bool = False
    price_monthly: Optional[Decimal] = None
    price_yearly: Optional[Decimal] = None
    currency: str = "CNY"
    description: Optional[str] = None


class SubscriptionPlanResponse(SubscriptionPlanBase):
    id: uuid.UUID
    is_active: bool
    display_order: int
    created_at: datetime
    
    class Config:
        from_attributes = True


# ============== User Subscription Schemas ==============

class UserSubscriptionResponse(BaseModel):
    id: uuid.UUID
    plan_id: uuid.UUID
    status: str
    current_period_start: datetime
    current_period_end: datetime
    auto_renew: bool
    credits_used: int
    credits_remaining: Optional[int]
    created_at: datetime
    plan: Optional[SubscriptionPlanResponse] = None
    
    class Config:
        from_attributes = True


# ============== Admin Schemas ==============

class AdminBase(BaseModel):
    username: str
    email: EmailStr
    role: str = "staff"


class AdminCreate(AdminBase):
    password: str = Field(..., min_length=6, max_length=100)
    permissions: dict = {}


class AdminLogin(BaseModel):
    username: str
    password: str


class AdminResponse(AdminBase):
    id: uuid.UUID
    is_active: bool
    permissions: dict
    last_login_at: Optional[datetime]
    created_at: datetime
    
    class Config:
        from_attributes = True


# ============== Pattern Generation Schemas ==============

class PatternGenerateRequest(BaseModel):
    width: int = Field(..., ge=10, le=200)
    height: int = Field(..., ge=10, le=200)
    palette: Optional[str] = None
    options: Optional[dict] = None


class PatternGenerateResponse(BaseModel):
    success: bool
    message: str
    credits_remaining: int
    result_url: Optional[str] = None


class PermissionCheckResponse(BaseModel):
    can_generate: bool
    can_export_pdf: bool
    can_use_custom_palette: bool
    remaining_credits: int
    max_image_size: int
    max_output_size: str
    message: Optional[str] = None


# ============== Generic Response Schemas ==============

class MessageResponse(BaseModel):
    message: str


class ErrorResponse(BaseModel):
    detail: str


class PaginatedResponse(BaseModel):
    items: List
    total: int
    page: int
    limit: int
    pages: int