"""
测试密码验证
"""
import sys
sys.path.insert(0, 'backend')

from auth import verify_password, get_password_hash

# 测试密码
password = "123456"

# 生成新的哈希
new_hash = get_password_hash(password)
print(f"新生成的密码哈希: {new_hash}")

# 验证密码
is_valid = verify_password(password, new_hash)
print(f"密码验证结果: {is_valid}")

# 测试数据库中的哈希
db_hash = "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNiAYMyzJ/I1K"
is_valid_db = verify_password(password, db_hash)
print(f"数据库哈希验证结果: {is_valid_db}")
