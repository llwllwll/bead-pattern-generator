"""
修复密码哈希
"""
import asyncio
import sys
sys.path.insert(0, 'backend')

# 使用 Neon 数据库连接
import os
os.environ['DATABASE_URL'] = 'postgresql+asyncpg://neondb_owner:npg_gYKGX8plrS0v@ep-misty-recipe-akdodnm8-pooler.c-3.us-west-2.aws.neon.tech/neondb?sslmode=require'

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import select
from sqlalchemy.orm import declarative_base
from passlib.context import CryptContext

# Password hashing
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

def get_password_hash(password: str) -> str:
    """Generate password hash"""
    return pwd_context.hash(password)

# Create engine
engine = create_async_engine(
    os.environ['DATABASE_URL'],
    echo=True,
    future=True
)

# Create async session factory
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False
)

Base = declarative_base()

async def fix_password():
    async with AsyncSessionLocal() as session:
        from sqlalchemy import text
        
        # 生成新的密码哈希
        password = "123456"
        new_hash = get_password_hash(password)
        print(f"新密码哈希: {new_hash}")
        
        # 更新数据库中的密码
        result = await session.execute(
            text("UPDATE users SET password_hash = :hash WHERE phone = '13800138000'"),
            {"hash": new_hash}
        )
        await session.commit()
        
        print(f"更新了 {result.rowcount} 行")
        print("密码已更新为: 123456")

if __name__ == "__main__":
    asyncio.run(fix_password())
