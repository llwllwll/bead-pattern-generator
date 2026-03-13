from sqlalchemy import Column, String, Boolean, Integer, DateTime, ForeignKey, Text, DECIMAL, JSON, UUID, Index, func
from sqlalchemy.orm import relationship
from database import Base
import uuid


class User(Base):
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String(50), unique=True, nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    phone = Column(String(20))
    avatar_url = Column(Text)
    
    # Account status
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    is_superuser = Column(Boolean, default=False)
    
    # Activation info
    activation_code_id = Column(UUID(as_uuid=True), ForeignKey("activation_codes.id", ondelete="SET NULL"))
    activated_at = Column(DateTime(timezone=True))
    expires_at = Column(DateTime(timezone=True))
    
    # Usage stats
    remaining_credits = Column(Integer, default=10)
    total_used = Column(Integer, default=0)
    last_used_at = Column(DateTime(timezone=True))
    
    # Device info
    device_id = Column(String(255))
    device_type = Column(String(50))
    fcm_token = Column(Text)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    activation_code = relationship("ActivationCode", foreign_keys=[activation_code_id])
    usage_records = relationship("UsageRecord", back_populates="user", cascade="all, delete-orphan")
    subscriptions = relationship("UserSubscription", back_populates="user", cascade="all, delete-orphan")


class ActivationCode(Base):
    __tablename__ = "activation_codes"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code = Column(String(50), unique=True, nullable=False)
    code_type = Column(String(20), nullable=False)  # trial/monthly/yearly/permanent
    credits = Column(Integer, nullable=False)
    validity_days = Column(Integer)
    
    # Status
    is_used = Column(Boolean, default=False)
    used_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"))
    used_at = Column(DateTime(timezone=True))
    
    # Price
    price = Column(DECIMAL(10, 2))
    currency = Column(String(3), default="CNY")
    max_usage = Column(Integer, default=1)
    
    # Batch management
    batch_id = Column(String(50))
    note = Column(Text)
    
    # Validity
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True))


class UsageRecord(Base):
    __tablename__ = "usage_records"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    # Usage info
    action_type = Column(String(50), nullable=False)
    credits_used = Column(Integer, default=1)
    image_size = Column(Integer)
    result_size = Column(String(20))
    
    # Processing details
    processing_time = Column(Integer)
    success = Column(Boolean, default=True)
    error_message = Column(Text)
    
    # Client info
    ip_address = Column(String(45))  # IPv6 compatible
    user_agent = Column(Text)
    device_info = Column(JSON)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="usage_records")


class SubscriptionPlan(Base):
    __tablename__ = "subscription_plans"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    code = Column(String(50), unique=True, nullable=False)
    
    # Credits
    monthly_credits = Column(Integer)
    total_credits = Column(Integer)
    
    # Feature permissions
    max_image_size = Column(Integer, default=5242880)  # 5MB
    max_output_size = Column(String(20), default="100x100")
    allow_pdf_export = Column(Boolean, default=True)
    allow_custom_palette = Column(Boolean, default=False)
    allow_batch_process = Column(Boolean, default=False)
    
    # Pricing
    price_monthly = Column(DECIMAL(10, 2))
    price_yearly = Column(DECIMAL(10, 2))
    currency = Column(String(3), default="CNY")
    
    is_active = Column(Boolean, default=True)
    display_order = Column(Integer, default=0)
    description = Column(Text)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    subscriptions = relationship("UserSubscription", back_populates="plan")


class UserSubscription(Base):
    __tablename__ = "user_subscriptions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    plan_id = Column(UUID(as_uuid=True), ForeignKey("subscription_plans.id", ondelete="CASCADE"), nullable=False)
    activation_code_id = Column(UUID(as_uuid=True), ForeignKey("activation_codes.id", ondelete="SET NULL"))
    
    # Subscription status
    status = Column(String(20), default="active")  # active/expired/cancelled
    current_period_start = Column(DateTime(timezone=True), nullable=False)
    current_period_end = Column(DateTime(timezone=True), nullable=False)
    
    # Auto renew
    auto_renew = Column(Boolean, default=False)
    
    # Usage stats (current period)
    credits_used = Column(Integer, default=0)
    credits_remaining = Column(Integer)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="subscriptions")
    plan = relationship("SubscriptionPlan", back_populates="subscriptions")


class Admin(Base):
    __tablename__ = "admins"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String(50), unique=True, nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    
    role = Column(String(20), default="staff")  # superadmin/admin/staff
    permissions = Column(JSON, default=dict)
    
    is_active = Column(Boolean, default=True)
    last_login_at = Column(DateTime(timezone=True))
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class ColorPalette(Base):
    """色库表"""
    __tablename__ = "color_palettes"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    code = Column(String(50), unique=True, nullable=False)  # 唯一标识码
    description = Column(Text)
    brand = Column(String(50))  # 品牌，如 Perler, Hama, Artkal
    is_active = Column(Boolean, default=True)
    is_default = Column(Boolean, default=False)  # 是否为默认色板
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    colors = relationship("PaletteColor", back_populates="palette", cascade="all, delete-orphan")


class PaletteColor(Base):
    """色库颜色表"""
    __tablename__ = "palette_colors"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    palette_id = Column(UUID(as_uuid=True), ForeignKey("color_palettes.id", ondelete="CASCADE"), nullable=False)
    
    # 颜色编号，如 "A1", "B12", "H7"
    color_code = Column(String(10), nullable=False)
    name = Column(String(100))
    hex = Column(String(7), nullable=False)  # #RRGGBB
    
    # 颜色属性
    is_transparent = Column(Boolean, default=False)
    is_glow = Column(Boolean, default=False)
    is_metallic = Column(Boolean, default=False)
    
    display_order = Column(Integer, default=0)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    palette = relationship("ColorPalette", back_populates="colors")
    
    # 联合唯一约束：同一色板内颜色编号唯一
    __table_args__ = (
        Index('idx_palette_color_code', 'palette_id', 'color_code', unique=True),
    )