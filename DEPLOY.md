# 炉石卡组分享站 - GitHub 自动化部署手册

本手册适用于已将代码导出至 GitHub 的用户。

## 1. 服务器环境准备
```bash
# 安装 Node.js 和 PM2 (只需执行一次)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g pm2
```

## 2. 配置 GitHub 部署密钥 (只需执行一次)
1. 服务器执行：`ssh-keygen -t ed25519` (一路回车)。
2. 查看密钥：`cat ~/.ssh/id_ed25519.pub`。
3. 将输出内容复制到 GitHub 仓库的 **Settings -> Deploy keys** 中。

## 3. 首次部署
```bash
cd /root
git clone git@github.com:你的用户名/你的仓库名.git hs-app
cd hs-app
npm install
npm run build
pm2 start server.ts --interpreter tsx --name "hs-app" --env PORT=3000
```

## 4. 日常更新流程
当你在 AI Studio 完成修改并点击 "Export to GitHub" 后：
```bash
cd /root/hs-app
git pull
npm install  # 如果增加了新功能
npm run build
pm2 restart hs-app
```
