# 拼豆图纸生成器

一款可以将图片转换为拼豆图纸的在线工具。

## 功能特性

- 📤 **图片上传** - 支持上传 PNG、JPG、WebP 等常见图片格式
- 🎨 **智能配色** - 多种预设颜色方案可选，支持自定义调色板
- 📐 **灵活尺寸** - 滑动选择目标尺寸，比例自动跟随上传图片
- 👁️ **实时预览** - 实时查看转换效果
- 📥 **多种导出** - 支持导出 PNG、PDF、SVG 等格式
- 👤 **用户系统** - 手机号注册登录，激活码激活
- ⚙️ **管理后台** - 管理员可管理用户、生成激活码

## 技术栈

### 前端
- React 18 + TypeScript
- Vite
- Ant Design
- Fabric.js
- Zustand (状态管理)

### 后端
- Python FastAPI
- SQLAlchemy 2.0 (异步)
- PostgreSQL (Neon)
- JWT 认证

## 项目结构

```
├── backend/               # 后端代码
│   ├── routers/          # API 路由
│   ├── models.py         # 数据模型
│   ├── schemas.py       # Pydantic 模型
│   ├── auth.py          # 认证工具
│   └── main.py          # 应用入口
├── src/                  # 前端代码
│   ├── components/       # React 组件
│   ├── stores/          # 状态管理
│   ├── services/        # API 服务
│   └── utils/          # 工具函数
└── package.json
```

## 快速开始

### 前端

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

访问 http://localhost:5173

### 后端

```bash
cd backend

# 创建虚拟环境
python -m venv venv

# 激活虚拟环境
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# 安装依赖
pip install -r requirements.txt

# 启动服务器
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

API 文档：http://localhost:8000/docs

## 环境变量

后端 `.env` 文件配置：

```
DATABASE_URL=postgresql+asyncpg://user:password@host/dbname
SECRET_KEY=your-secret-key
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
```


## 许可证

MIT License
