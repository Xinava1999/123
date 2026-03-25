import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 数据库延迟加载函数
async function getDatabase() {
  try {
    const { default: Database } = await import("better-sqlite3");
    const db = new Database("database.sqlite");
    db.exec(`
      CREATE TABLE IF NOT EXISTS images (id TEXT PRIMARY KEY, url TEXT NOT NULL, authorName TEXT, caption TEXT, likes INTEGER DEFAULT 0, createdAt TEXT);
      CREATE TABLE IF NOT EXISTS decks (id TEXT PRIMARY KEY, code TEXT NOT NULL, title TEXT NOT NULL, authorName TEXT, createdAt TEXT);
    `);
    return db;
  } catch (e) {
    console.error("❌ 数据库加载失败 (可能是插件编译问题):", e.message);
    return null;
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;
  const db = await getDatabase();

  app.use(express.json({ limit: '10mb' }));

  // 健康检查
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      database: db ? "connected" : "failed",
      mode: fs.existsSync(path.join(__dirname, "dist")) ? "production" : "development"
    });
  });

  // 静态资源处理
  const distPath = path.join(__dirname, "dist");
  if (fs.existsSync(distPath)) {
    console.log("✅ 检测到 dist 目录，使用静态服务模式");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      const indexPath = path.join(distPath, "index.html");
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send("未找到 index.html");
      }
    });
  } else {
    console.log("⚠️ 未检测到 dist 目录，尝试启动 Vite 开发模式...");
    try {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } catch (e) {
      console.error("🔥 Vite 启动失败 (可能是 vite.config.ts 路径问题):", e.message);
      res.status(500).send("服务器启动失败，请检查配置。");
    }
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log("\n========================================");
    console.log(`🚀 炉石传说工具站已启动！`);
    console.log(`🔗 访问地址: http://47.82.123.147:3000`);
    console.log("========================================\n");
  });
}

startServer().catch(err => {
  console.error("🔥 启动失败:", err);
});
