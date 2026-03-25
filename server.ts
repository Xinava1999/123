import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import admin from "firebase-admin";
import fs from "fs";
import Database from "better-sqlite3";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Database Selection ---
// Default to SQLite if explicitly requested, or if no Firebase config exists
const hasFirebaseConfig = fs.existsSync(configPath);
const USE_SQLITE = process.env.USE_SQLITE === "true" || !hasFirebaseConfig;
let db: any;
let sqliteDb: any;

// Initialize SQLite if requested
if (USE_SQLITE) {
  console.log("Initializing SQLite database...");
  sqliteDb = new Database("database.sqlite");
  
  // Create tables if they don't exist
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS images (
      id TEXT PRIMARY KEY,
      url TEXT NOT NULL,
      authorName TEXT,
      caption TEXT,
      likes INTEGER DEFAULT 0,
      createdAt TEXT
    );
    CREATE TABLE IF NOT EXISTS decks (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL,
      title TEXT NOT NULL,
      authorName TEXT,
      createdAt TEXT
    );
    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      parentId TEXT NOT NULL,
      parentType TEXT NOT NULL,
      text TEXT NOT NULL,
      authorName TEXT,
      createdAt TEXT
    );
    CREATE TABLE IF NOT EXISTS likes_tracking (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      imageId TEXT NOT NULL,
      createdAt TEXT
    );
  `);
}

// Initialize Firebase Admin SDK (on server)
const configPath = path.join(process.cwd(), "firebase-applet-config.json");
let firebaseConfig: any = null;
if (fs.existsSync(configPath)) {
  try {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
  } catch (e) {
    console.error("Error parsing firebase-applet-config.json:", e);
  }
}

if (!USE_SQLITE && firebaseConfig) {
  try {
    if (admin.apps.length === 0) {
      // In GCP/Cloud Run, applicationDefault() is preferred.
      // If that fails, we use the projectId from our config.
      admin.initializeApp({
        projectId: firebaseConfig.projectId,
      });
      console.log("Firebase Admin SDK initialized with projectId:", firebaseConfig.projectId);
    }
    
    // Use the specific database ID if provided in config
    if (firebaseConfig.firestoreDatabaseId) {
      db = admin.firestore(firebaseConfig.firestoreDatabaseId);
      console.log("Firestore initialized with databaseId:", firebaseConfig.firestoreDatabaseId);
    } else {
      db = admin.firestore();
      console.log("Firestore initialized with default database");
    }
  } catch (e: any) {
    console.error("Firebase Admin initialization error:", e);
    // Fallback to SQLite if Firebase fails (useful for local dev or if GCP auth fails)
    if (!USE_SQLITE) {
      console.log("Falling back to SQLite due to Firebase error...");
      // Initialize SQLite if it wasn't already
      if (!sqliteDb) {
        sqliteDb = new Database("database.sqlite");
        // ... (tables creation logic is already above, but we'll ensure it's called)
      }
    }
  }
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

  // --- API Routes ---

  // Health check
  app.get("/api/health", async (req, res) => {
    try {
      if (USE_SQLITE || !db) {
        res.json({ status: "ok", database: "sqlite" });
      } else {
        await db.collection("health").doc("check").set({ lastCheck: admin.firestore.FieldValue.serverTimestamp() });
        res.json({ status: "ok", database: "firestore" });
      }
    } catch (error: any) {
      console.error("Health check failed:", error);
      res.status(500).json({ status: "error", message: error.message });
    }
  });

  // API Route for QQ Webhook
  app.post("/api/webhook/qq", async (req, res) => {
    const secret = req.headers["x-webhook-secret"];
    const expectedSecret = process.env.WEBHOOK_SECRET;

    if (expectedSecret && secret !== expectedSecret) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const { imageUrl, authorName, caption } = req.body;
      if (!imageUrl) return res.status(400).json({ error: "imageUrl is required" });

      const id = Math.random().toString(36).substring(2, 15);
      const data = {
        url: imageUrl,
        authorName: authorName || "QQ群友",
        caption: caption || "来自QQ群自动同步",
        likes: 0,
        createdAt: new Date().toISOString(),
      };

      if (USE_SQLITE || !db) {
        sqliteDb.prepare("INSERT INTO images (id, url, authorName, caption, likes, createdAt) VALUES (?, ?, ?, ?, ?, ?)")
          .run(id, data.url, data.authorName, data.caption, data.likes, data.createdAt);
      } else {
        await db.collection("images").doc(id).set({
          ...data,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }

      res.json({ success: true, id });
    } catch (error) {
      console.error("Webhook error:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // --- Decks API ---
  app.get("/api/decks", async (req, res) => {
    try {
      let decks: any[] = [];
      if (USE_SQLITE || !db) {
        decks = sqliteDb.prepare("SELECT * FROM decks ORDER BY createdAt DESC LIMIT 50").all();
      } else {
        const snapshot = await db.collection("decks").orderBy("createdAt", "desc").limit(50).get();
        decks = snapshot.docs.map((doc: any) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt
        }));
      }
      res.json(decks);
    } catch (error: any) {
      console.error("Error fetching decks:", error);
      res.status(500).json({ error: "Failed to fetch decks", details: error.message });
    }
  });

  app.post("/api/decks", async (req, res) => {
    try {
      const { code, title, authorName } = req.body;
      if (!code || !title) return res.status(400).json({ error: "Missing fields" });
      
      const id = Math.random().toString(36).substring(2, 15);
      const data = {
        code,
        title,
        authorName: authorName || "匿名炉友",
        createdAt: new Date().toISOString()
      };

      if (USE_SQLITE || !db) {
        sqliteDb.prepare("INSERT INTO decks (id, code, title, authorName, createdAt) VALUES (?, ?, ?, ?, ?)")
          .run(id, data.code, data.title, data.authorName, data.createdAt);
      } else {
        await db.collection("decks").doc(id).set({
          ...data,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
      res.json({ id });
    } catch (error: any) {
      console.error("Error adding deck:", error);
      res.status(500).json({ error: "Failed to add deck", details: error.message });
    }
  });

  app.delete("/api/decks/:id", async (req, res) => {
    const adminToken = req.headers["x-admin-token"];
    if (adminToken !== process.env.ADMIN_TOKEN) return res.status(401).json({ error: "Unauthorized" });

    try {
      if (USE_SQLITE || !db) {
        sqliteDb.prepare("DELETE FROM decks WHERE id = ?").run(req.params.id);
      } else {
        await db.collection("decks").doc(req.params.id).delete();
      }
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting deck:", error);
      res.status(500).json({ error: "Failed to delete deck", details: error.message });
    }
  });

  // --- Images API ---
  app.get("/api/images", async (req, res) => {
    try {
      let images: any[] = [];
      if (USE_SQLITE || !db) {
        images = sqliteDb.prepare("SELECT * FROM images ORDER BY createdAt DESC LIMIT 50").all();
      } else {
        const snapshot = await db.collection("images").orderBy("createdAt", "desc").limit(50).get();
        images = snapshot.docs.map((doc: any) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt
        }));
      }
      res.json(images);
    } catch (error: any) {
      console.error("Error fetching images:", error);
      res.status(500).json({ error: "Failed to fetch images", details: error.message });
    }
  });

  app.post("/api/images", async (req, res) => {
    try {
      const { url, caption, authorName } = req.body;
      if (!url || !caption) return res.status(400).json({ error: "Missing fields" });

      const id = Math.random().toString(36).substring(2, 15);
      const data = {
        url,
        caption,
        authorName: authorName || "匿名炉友",
        likes: 0,
        createdAt: new Date().toISOString()
      };

      if (USE_SQLITE || !db) {
        sqliteDb.prepare("INSERT INTO images (id, url, caption, authorName, likes, createdAt) VALUES (?, ?, ?, ?, ?, ?)")
          .run(id, data.url, data.caption, data.authorName, data.likes, data.createdAt);
      } else {
        await db.collection("images").doc(id).set({
          ...data,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
      res.json({ id });
    } catch (error: any) {
      console.error("Error adding image:", error);
      res.status(500).json({ error: "Failed to add image", details: error.message });
    }
  });

  app.post("/api/images/:id/like", async (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: "userId is required" });

    try {
      const likeId = `${req.params.id}_${userId}`;
      
      if (USE_SQLITE || !db) {
        const existing = sqliteDb.prepare("SELECT id FROM likes_tracking WHERE id = ?").get(likeId);
        if (existing) return res.status(400).json({ error: "Already liked" });

        sqliteDb.prepare("UPDATE images SET likes = likes + 1 WHERE id = ?").run(req.params.id);
        sqliteDb.prepare("INSERT INTO likes_tracking (id, userId, imageId, createdAt) VALUES (?, ?, ?, ?)")
          .run(likeId, userId, req.params.id, new Date().toISOString());
      } else {
        const likeRef = db.collection("likes_tracking").doc(likeId);
        const likeDocSnap = await likeRef.get();
        if (likeDocSnap.exists) return res.status(400).json({ error: "Already liked" });

        await db.collection("images").doc(req.params.id).update({
          likes: admin.firestore.FieldValue.increment(1)
        });
        await likeRef.set({
          userId,
          imageId: req.params.id,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error liking image:", error);
      res.status(500).json({ error: "Failed to like image", details: error.message });
    }
  });

  // --- Comments API ---
  app.get("/api/:type/:id/comments", async (req, res) => {
    const { type, id } = req.params;
    if (!["decks", "images"].includes(type)) return res.status(400).json({ error: "Invalid type" });

    try {
      let comments: any[] = [];
      if (USE_SQLITE || !db) {
        comments = sqliteDb.prepare("SELECT * FROM comments WHERE parentId = ? AND parentType = ? ORDER BY createdAt ASC")
          .all(id, type);
      } else {
        const snapshot = await db.collection(type).doc(id).collection("comments").orderBy("createdAt", "asc").get();
        comments = snapshot.docs.map((doc: any) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt
        }));
      }
      res.json(comments);
    } catch (error: any) {
      console.error("Error fetching comments:", error);
      res.status(500).json({ error: "Failed to fetch comments", details: error.message });
    }
  });

  app.post("/api/:type/:id/comments", async (req, res) => {
    const { type, id } = req.params;
    const { text, authorName } = req.body;
    if (!["decks", "images"].includes(type)) return res.status(400).json({ error: "Invalid type" });
    if (!text) return res.status(400).json({ error: "Text is required" });

    try {
      const commentId = Math.random().toString(36).substring(2, 15);
      const data = {
        text,
        authorName: authorName || "匿名炉友",
        createdAt: new Date().toISOString()
      };

      if (USE_SQLITE || !db) {
        sqliteDb.prepare("INSERT INTO comments (id, parentId, parentType, text, authorName, createdAt) VALUES (?, ?, ?, ?, ?, ?)")
          .run(commentId, id, type, data.text, data.authorName, data.createdAt);
      } else {
        await db.collection(type).doc(id).collection("comments").doc(commentId).set({
          ...data,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
      res.json({ id: commentId });
    } catch (error: any) {
      console.error("Error adding comment:", error);
      res.status(500).json({ error: "Failed to add comment", details: error.message });
    }
  });

  app.delete("/api/images/:id", async (req, res) => {
    const adminToken = req.headers["x-admin-token"];
    if (adminToken !== process.env.ADMIN_TOKEN) return res.status(401).json({ error: "Unauthorized" });

    try {
      if (USE_SQLITE || !db) {
        sqliteDb.prepare("DELETE FROM images WHERE id = ?").run(req.params.id);
      } else {
        await db.collection("images").doc(req.params.id).delete();
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting image:", error);
      res.status(500).json({ error: "Failed to delete image" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

