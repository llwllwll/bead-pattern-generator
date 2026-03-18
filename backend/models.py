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


class AdminLog(Base):
    __tablename__ = "admin_logs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    admin_id = Column(UUID(as_uuid=True), ForeignKey("admins.id", ondelete="SET NULL"), nullable=True)
    
    # Action info
    action = Column(String(50), nullable=False)  # create_user, create_admin, generate_codes, etc.
    resource_type = Column(String(50))  # user, admin, activation_code, brand, series, color, etc.
    resource_id = Column(String(100))  # ID of the affected resource
    
    # Details
    details = Column(JSON)  # Store additional details as JSON
    ip_address = Column(String(45))
    user_agent = Column(Text)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    admin = relationship("Admin", back_populates="logs")


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
    
    # Relationships
    logs = relationship("AdminLog", back_populates="admin", cascade="all, delete-orphan")


# ============ 色彩库新结构：品牌 -> 系列 -> 颜色 ============

class Brand(Base):
    """品牌表"""
    __tablename__ = "brands"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)  # 品牌名称，如 Perler, Hama, Artkal
    code = Column(String(50), unique=True, nullable=False)  # 品牌代码，如 perler, hama
    description = Column(Text)
    logo_url = Column(Text)
    is_active = Column(Boolean, default=True)
    display_order = Column(Integer, default=0)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    series = relationship("Series", back_populates="brand", cascade="all, delete-orphan")


class Series(Base):
    """系列表（原 ColorPalette 的概念）"""
    __tablename__ = "series"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    brand_id = Column(UUID(as_uuid=True), ForeignKey("brands.id", ondelete="CASCADE"), nullable=False)
    
    name = Column(String(100), nullable=False)  # 系列名称，如标准系列、Mini系列、夜光系列
    code = Column(String(50), nullable=False)  # 系列代码
    description = Column(Text)
    is_active = Column(Boolean, default=True)
    is_default = Column(Boolean, default=False)  # 是否为默认系列
    display_order = Column(Integer, default=0)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    brand = relationship("Brand", back_populates="series")
    colors = relationship("Color", back_populates="series", cascade="all, delete-orphan")
    
    # 联合唯一约束：同一品牌内系列代码唯一
    __table_args__ = (
        Index('idx_brand_series_code', 'brand_id', 'code', unique=True),
    )


class Color(Base):
    """颜色表（原 PaletteColor）"""
    __tablename__ = "colors"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    series_id = Column(UUID(as_uuid=True), ForeignKey("series.id", ondelete="CASCADE"), nullable=False)
    
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
    series = relationship("Series", back_populates="colors")
    
    # 联合唯一约束：同一系列内颜色编号唯一
    __table_args__ = (
        Index('idx_series_color_code', 'series_id', 'color_code', unique=True),
    )



