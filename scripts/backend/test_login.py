"""
测试登录功能
"""
import asyncio
import sys
sys.path.insert(0, 'backend')

from database import AsyncSessionLocal
from sqlalchemy import select
from models import User
from auth import verify_password, get_password_hash

async def test_login():
    async with AsyncSessionLocal() as session:
        # 查找用户
        result = await session.execute(
            select(User).where(User.phone == "13800138000")
        )
        user = result.scalar_one_or_none()
        
        if not user:
            print("用户不存在")
            return
        
        print(f"找到用户: {user.username}")
        print(f"手机号: {user.phone}")
        print(f"密码哈希: {user.password_hash}")
        print(f"是否激活: {user.is_active}")
        
        # 测试密码验证
        password = "123456"
        print(f"\n测试密码: {password}")
        
        try:
            is_valid = verify_password(password, user.password_hash)
            print(f"密码验证结果: {is_valid}")
        except Exception as e:
            print(f"密码验证出错: {e}")
            import traceback
            traceback.print_exc()
        
        # 生成新哈希测试
        print("\n生成新密码哈希测试:")
        new_hash = get_password_hash(password)
        print(f"新哈希: {new_hash}")
        
        try:
            is_valid_new = verify_password(password, new_hash)
            print(f"新哈希验证结果: {is_valid_new}")
        except Exception as e:
            print(f"新哈希验证出错: {e}")

if __name__ == "__main__":
    asyncio.run(test_login())
