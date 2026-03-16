import json
import requests

# 登录获取令牌
def get_token():
    login_url = "http://localhost:8001/api/auth/login"
    login_data = {
        "phone": "13800138000",
        "password": "123456"
    }
    headers = {"Content-Type": "application/json"}
    response = requests.post(login_url, json=login_data, headers=headers)
    if response.status_code == 200:
        return response.json().get("access_token")
    else:
        print(f"登录失败，状态码: {response.status_code}")
        print("错误信息:", response.text)
        return None

# 生成122个颜色
colors = []
for i in range(1, 123):
    color = {
        "color_code": f"C{i}",
        "name": f"颜色 {i}",
        "hex": f"#{(i * 997 % 0xffffff):06x}",
        "is_transparent": False,
        "is_glow": False,
        "is_metallic": False,
        "display_order": i
    }
    colors.append(color)

# 色板数据
palette_data = {
    "name": "自定义122色",
    "code": "custom_122",
    "description": "122色的自定义色板",
    "brand": "Custom",
    "is_default": False,
    "colors": colors
}

# 获取令牌
token = get_token()
if not token:
    print("无法获取令牌，退出程序")
    exit(1)

# 发送请求
url = "http://localhost:8001/api/admin/palettes/custom"
headers = {
    "Content-Type": "application/json",
    "Authorization": f"Bearer {token}"
}

print("正在创建122色的色板...")
response = requests.post(url, json=palette_data, headers=headers)

if response.status_code == 201:
    print("色板创建成功！")
    print("响应:", response.json())
else:
    print(f"色板创建失败，状态码: {response.status_code}")
    print("错误信息:", response.text)
