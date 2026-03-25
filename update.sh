#!/bin/bash
# 阿里云服务器一键更新脚本
# 路径: /root/hs-app/update.sh

echo "🚀 开始更新项目..."

# 1. 进入目录
cd /root/hs-app

# 2. 拉取最新代码
echo "📥 正在拉取 GitHub 代码..."
git pull origin main

# 3. 安装依赖 (如果有新包)
echo "📦 正在安装依赖..."
npm install

# 4. 构建前端
echo "🏗️ 正在构建前端..."
npm run build

# 5. 重启 PM2 服务
echo "🔄 正在重启服务..."
pm2 restart hs-app || pm2 start server.ts --interpreter tsx --name "hs-app" --env PORT=3000

echo "✅ 更新完成！"
