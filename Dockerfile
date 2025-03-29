# 使用单阶段构建，直接使用开发环境
FROM node:20-slim

WORKDIR /app

# 安装 Python 和必要的构建工具
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# 创建并激活虚拟环境
ENV VIRTUAL_ENV=/opt/venv
RUN python3 -m venv $VIRTUAL_ENV
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

# 复制依赖文件
COPY package*.json ./
COPY requirements.txt ./
# COPY node_modules ./node_modules

# 安装依赖
RUN npm install --legacy-peer-deps
RUN pip install --no-cache-dir -r requirements.txt

# 复制源代码
COPY . .

# 设置环境变量
ENV NODE_ENV=development
ENV PORT=3000
ENV DOCKER_ENV=true
ENV DEPLOYMENT_MODE=single

# 暴露端口
EXPOSE 3000 8000

# 使用开发模式启动
CMD ["npm", "run", "prod"]