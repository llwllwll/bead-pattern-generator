"""
初始化测试数据脚本
"""
import asyncio
import sys
sys.path.insert(0, 'backend')

from database import engine, AsyncSessionLocal, Base
from sqlalchemy import select
from models import User
from auth import get_password_hash
import uuid

async def init_test_data():
    async with AsyncSessionLocal() as session:
        # 检查是否已存在测试用户
        result = await session.execute(
            select(User).where(User.phone == "13800138000")
        )
        existing_user = result.scalar_one_or_none()
        
        if existing_user:
            print("测试用户已存在")
            print(f"手机号: 13800138000")
            print(f"密码: 123456")
            return
        
        # 创建测试用户
        test_user = User(
            id=uuid.uuid4(),
            username="testuser",
            email="test@example.com",
            password_hash=get_password_hash("123456"),
            phone="13800138000",
            remaining_credits=100,
            is_active=True,
            is_verified=True
        )
        
        session.add(test_user)
        await session.commit()
        
        print("测试用户创建成功！")
        print(f"手机号: 13800138000")
        print(f"密码: 123456")
        print(f"用户名: testuser")

if __name__ == "__main__":
    asyncio.run(init_test_data())
