import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { fileURLToPath, pathToFileURL } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 数据库延迟加载函数
async function getDatabase() {
  try {
    const sqlite3 = await import("sqlite3");
    const { open } = await import("sqlite");
    
    const db = await open({
      filename: "database.sqlite",
      driver: sqlite3.default.Database
    });

    await db.exec(`
      CREATE TABLE IF NOT EXISTS images (id TEXT PRIMARY KEY, url TEXT NOT NULL, authorName TEXT, caption TEXT, likes INTEGER DEFAULT 0, createdAt TEXT);
      CREATE TABLE IF NOT EXISTS decks (id TEXT PRIMARY KEY, code TEXT NOT NULL, title TEXT NOT NULL, authorName TEXT, createdAt TEXT);
      CREATE TABLE IF NOT EXISTS comments (id TEXT PRIMARY KEY, parentId TEXT NOT NULL, parentType TEXT NOT NULL, text TEXT NOT NULL, authorName TEXT, createdAt TEXT);
      CREATE TABLE IF NOT EXISTS likes_tracking (userId TEXT, imageId TEXT, PRIMARY KEY(userId, imageId));
      CREATE TABLE IF NOT EXISTS quiz_questions (id TEXT PRIMARY KEY, question TEXT, options TEXT, correctAnswer INTEGER);
      CREATE TABLE IF NOT EXISTS quiz_scores (id TEXT PRIMARY KEY, nickname TEXT, score INTEGER, createdAt TEXT);
      CREATE TABLE IF NOT EXISTS votes (id TEXT PRIMARY KEY, title TEXT NOT NULL, options TEXT NOT NULL, type TEXT NOT NULL, authorName TEXT, createdAt TEXT);
      CREATE TABLE IF NOT EXISTS vote_records (userId TEXT, voteId TEXT, optionIndex INTEGER, PRIMARY KEY(userId, voteId));
    `);

    // 初始题库
    const questionsCount = await db.get("SELECT COUNT(*) as count FROM quiz_questions") as any;
    
    // 加载离线题库
    let allQuestions = [];
    try {
      const questionsPath = path.resolve(__dirname, "src/data/questions.json");
      if (fs.existsSync(questionsPath)) {
        allQuestions = JSON.parse(fs.readFileSync(questionsPath, "utf-8"));
      }
    } catch (e) {
      console.error("❌ 加载题库文件失败:", e.message);
    }

    if (questionsCount.count < allQuestions.length) {
      console.log(`📝 正在同步题库... (当前: ${questionsCount.count}, 目标: ${allQuestions.length})`);
      // 如果题库数量不足，清空并重新导入（或者只导入缺失的，这里为了简单直接清空重导）
      await db.run("DELETE FROM quiz_questions");
      for (const q of allQuestions) {
        await db.run("INSERT INTO quiz_questions (id, question, options, correctAnswer) VALUES (?, ?, ?, ?)", 
          crypto.randomUUID(), q.q, JSON.stringify(q.o), q.a);
      }
      console.log("✅ 题库同步完成");
    }

    // 初始投票
    const votesCount = await db.get("SELECT COUNT(*) as count FROM votes") as any;
    if (votesCount.count === 0) {
      await db.run("INSERT INTO votes (id, title, options, type, authorName, createdAt) VALUES (?, ?, ?, ?, ?, ?)",
        crypto.randomUUID(), "你觉得当前版本哪个职业最强？", JSON.stringify(["法师", "战士", "德鲁伊", "萨满", "其他"]), "official", "管理员", new Date().toISOString());
    }

    return db;
  } catch (e) {
    console.error("❌ 数据库加载失败:", e.message);
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
      mode: fs.existsSync(path.resolve(process.cwd(), "dist")) ? "production" : "development"
    });
  });

  // API 路由
  
  // Decks API
  app.get("/api/decks", async (req, res) => {
    if (!db) return res.status(500).json({ error: "数据库未连接" });
    const decks = await db.all("SELECT * FROM decks ORDER BY createdAt DESC");
    res.json(decks);
  });

  app.post("/api/decks", async (req, res) => {
    if (!db) return res.status(500).json({ error: "数据库未连接" });
    const { code, title, authorName } = req.body;
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    await db.run("INSERT INTO decks (id, code, title, authorName, createdAt) VALUES (?, ?, ?, ?, ?)", id, code, title, authorName, createdAt);
    res.json({ id });
  });

  app.delete("/api/decks/:id", async (req, res) => {
    if (!db) return res.status(500).json({ error: "数据库未连接" });
    const { id } = req.params;
    const adminToken = req.headers['x-admin-token'];
    if (adminToken === process.env.ADMIN_PASSWORD || adminToken === 'qb123') {
      await db.run("DELETE FROM decks WHERE id = ?", id);
      res.json({ success: true });
    } else {
      res.status(403).json({ error: "Forbidden" });
    }
  });

  // Images API
  app.get("/api/images", async (req, res) => {
    if (!db) return res.status(500).json({ error: "数据库未连接" });
    const images = await db.all("SELECT * FROM images ORDER BY createdAt DESC");
    res.json(images);
  });

  app.post("/api/images", async (req, res) => {
    if (!db) return res.status(500).json({ error: "数据库未连接" });
    const { url, caption, authorName } = req.body;
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    await db.run("INSERT INTO images (id, url, caption, authorName, createdAt) VALUES (?, ?, ?, ?, ?)", id, url, caption, authorName, createdAt);
    res.json({ id });
  });

  app.delete("/api/images/:id", async (req, res) => {
    if (!db) return res.status(500).json({ error: "数据库未连接" });
    const { id } = req.params;
    const adminToken = req.headers['x-admin-token'];
    if (adminToken === process.env.ADMIN_PASSWORD || adminToken === 'qb123') {
      await db.run("DELETE FROM images WHERE id = ?", id);
      res.json({ success: true });
    } else {
      res.status(403).json({ error: "Forbidden" });
    }
  });

  app.post("/api/images/:id/like", async (req, res) => {
    if (!db) return res.status(500).json({ error: "数据库未连接" });
    const { id } = req.params;
    const { userId } = req.body;
    
    if (!userId) return res.status(400).json({ error: "Missing userId" });

    const existing = await db.get("SELECT * FROM likes_tracking WHERE userId = ? AND imageId = ?", userId, id);
    if (existing) {
      return res.status(400).json({ error: "Already liked" });
    }

    await db.run("INSERT INTO likes_tracking (userId, imageId) VALUES (?, ?)", userId, id);
    await db.run("UPDATE images SET likes = likes + 1 WHERE id = ?", id);
    res.json({ success: true });
  });

  // Quiz API
  app.get("/api/quiz/questions", async (req, res) => {
    if (!db) return res.status(500).json({ error: "数据库未连接" });
    const { exclude } = req.query;
    let query = "SELECT * FROM quiz_questions";
    const params: any[] = [];
    
    if (exclude) {
      const excludeIds = (exclude as string).split(',').filter(id => id.length > 0);
      if (excludeIds.length > 0) {
        query += ` WHERE id NOT IN (${excludeIds.map(() => '?').join(',')})`;
        params.push(...excludeIds);
      }
    }
    
    query += " ORDER BY RANDOM() LIMIT 5";
    const questions = await db.all(query, ...params);
    const formatted = questions.map((q: any) => ({
      ...q,
      options: JSON.parse(q.options)
    }));
    res.json(formatted);
  });

  app.post("/api/quiz/scores", async (req, res) => {
    if (!db) return res.status(500).json({ error: "数据库未连接" });
    const { nickname, score } = req.body;
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    await db.run("INSERT INTO quiz_scores (id, nickname, score, createdAt) VALUES (?, ?, ?, ?)", id, nickname || "匿名炉友", score, createdAt);
    res.json({ success: true });
  });

  app.get("/api/quiz/leaderboard", async (req, res) => {
    if (!db) return res.status(500).json({ error: "数据库未连接" });
    const scores = await db.all("SELECT nickname, score, createdAt FROM quiz_scores ORDER BY score DESC, createdAt ASC LIMIT 10");
    res.json(scores);
  });

  // Votes API
  app.get("/api/votes", async (req, res) => {
    if (!db) return res.status(500).json({ error: "数据库未连接" });
    const votes = await db.all("SELECT * FROM votes ORDER BY createdAt DESC");
    const formatted = await Promise.all(votes.map(async (v: any) => {
      const records = await db.all("SELECT optionIndex, COUNT(*) as count FROM vote_records WHERE voteId = ? GROUP BY optionIndex", v.id);
      const options = JSON.parse(v.options);
      const counts = options.map((_: any, idx: number) => {
        const record = records.find(r => r.optionIndex === idx);
        return record ? record.count : 0;
      });
      return { ...v, options, counts };
    }));
    res.json(formatted);
  });

  app.post("/api/votes", async (req, res) => {
    if (!db) return res.status(500).json({ error: "数据库未连接" });
    const { title, options, type, authorName } = req.body;
    const adminToken = req.headers['x-admin-token'];
    
    // 官方投票只有管理员能发
    if (type === 'official' && adminToken !== process.env.ADMIN_PASSWORD && adminToken !== 'qb123') {
      return res.status(403).json({ error: "只有管理员能发布官方投票" });
    }

    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    await db.run("INSERT INTO votes (id, title, options, type, authorName, createdAt) VALUES (?, ?, ?, ?, ?, ?)", 
      id, title, JSON.stringify(options), type, authorName, createdAt);
    res.json({ id });
  });

  app.post("/api/votes/:id/vote", async (req, res) => {
    if (!db) return res.status(500).json({ error: "数据库未连接" });
    const { id: voteId } = req.params;
    const { userId, optionIndex } = req.body;

    const existing = await db.get("SELECT * FROM vote_records WHERE userId = ? AND voteId = ?", userId, voteId);
    if (existing) {
      return res.status(400).json({ error: "你已经投过票了" });
    }

    await db.run("INSERT INTO vote_records (userId, voteId, optionIndex) VALUES (?, ?, ?)", userId, voteId, optionIndex);
    res.json({ success: true });
  });

  app.delete("/api/votes/:id", async (req, res) => {
    if (!db) return res.status(500).json({ error: "数据库未连接" });
    const { id } = req.params;
    const adminToken = req.headers['x-admin-token'];
    if (adminToken === process.env.ADMIN_PASSWORD || adminToken === 'qb123') {
      await db.run("DELETE FROM votes WHERE id = ?", id);
      await db.run("DELETE FROM vote_records WHERE voteId = ?", id);
      res.json({ success: true });
    } else {
      res.status(403).json({ error: "Forbidden" });
    }
  });

  // Comments API
  app.get("/api/:type/:id/comments", async (req, res) => {
    if (!db) return res.status(500).json({ error: "数据库未连接" });
    const { type, id } = req.params;
    const comments = await db.all("SELECT * FROM comments WHERE parentId = ? AND parentType = ? ORDER BY createdAt DESC", id, type);
    res.json(comments);
  });

  app.post("/api/:type/:id/comments", async (req, res) => {
    if (!db) return res.status(500).json({ error: "数据库未连接" });
    const { type, id: parentId } = req.params;
    const { text, authorName } = req.body;
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    await db.run("INSERT INTO comments (id, parentId, parentType, text, authorName, createdAt) VALUES (?, ?, ?, ?, ?, ?)", id, parentId, type, text, authorName, createdAt);
    res.json({ id });
  });

  // 静态资源处理
  const distPath = path.join(__dirname, "dist");
  
  if (fs.existsSync(distPath)) {
    console.log(`✅ 检测到 dist 目录: ${distPath}，使用静态服务模式`);
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      const indexPath = path.join(distPath, "index.html");
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send("未找到 index.html，请先运行 npm run build");
      }
    });
  } else {
    console.log("⚠️ 未检测到 dist 目录，尝试启动 Vite 开发模式...");
    try {
      const vite = await createViteServer({
        root: __dirname,
        server: { 
          middlewareMode: true,
          hmr: false 
        },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } catch (e) {
      console.error("🔥 Vite 启动失败:", e.message);
      console.log("💡 建议: 请尝试先运行 'npm run build' 生成 dist 目录，然后再启动服务器。");
      process.exit(1);
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
