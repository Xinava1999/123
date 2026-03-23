import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { initializeApp, getApps } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  deleteDoc, 
  updateDoc, 
  increment, 
  serverTimestamp, 
  limit, 
  query,
  setDoc
} from "firebase/firestore";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Client SDK (on server)
const configPath = path.join(process.cwd(), "firebase-applet-config.json");
let firebaseConfig: any = null;
if (fs.existsSync(configPath)) {
  try {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
  } catch (e) {
    console.error("Error parsing firebase-applet-config.json:", e);
  }
}

// Standard initialization for Cloud Run environment
let firebaseApp: any = null;
try {
  if (getApps().length === 0 && firebaseConfig) {
    firebaseApp = initializeApp(firebaseConfig);
    console.log("Firebase Client SDK initialized with projectId:", firebaseConfig.projectId);
  } else if (getApps().length > 0) {
    firebaseApp = getApps()[0];
  }
} catch (e: any) {
  console.error("Firebase initialization error:", e);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initialize DB
  let db: any;
  try {
    if (firebaseApp && firebaseConfig?.firestoreDatabaseId) {
      db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);
      console.log("Firestore initialized with databaseId:", firebaseConfig.firestoreDatabaseId);
    } else {
      db = getFirestore();
      console.log("Firestore initialized with default database");
    }
  } catch (e) {
    console.error("Firestore initialization failed:", e);
    db = getFirestore();
  }

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

  // Health check
  app.get("/api/health", async (req, res) => {
    try {
      await setDoc(doc(db, "health", "check"), { lastCheck: serverTimestamp() });
      res.json({ status: "ok", database: "connected" });
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

      if (!imageUrl) {
        return res.status(400).json({ error: "imageUrl is required" });
      }

      // Save to Firestore
      const docRef = await addDoc(collection(db, "images"), {
        url: imageUrl,
        authorName: authorName || "QQ群友",
        caption: caption || "来自QQ群自动同步",
        likes: 0,
        createdAt: serverTimestamp(),
      });

      console.log("Image synced from QQ:", docRef.id);
      res.json({ success: true, id: docRef.id });
    } catch (error) {
      console.error("Webhook error:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // --- Proxy API Endpoints for Decks ---
  app.get(["/api/decks", "/api/decks/"], async (req, res) => {
    console.log("GET /api/decks requested");
    try {
      const q = query(collection(db, "decks"), limit(50));
      const snapshot = await getDocs(q);
      console.log(`Found ${snapshot.docs.length} decks`);
      
      const decks = snapshot.docs.map(doc => {
        const data = doc.data();
        let createdAt = new Date();
        if (data.createdAt) {
          if (typeof data.createdAt.toDate === 'function') {
            createdAt = data.createdAt.toDate();
          } else if (data.createdAt._seconds) {
            createdAt = new Date(data.createdAt._seconds * 1000);
          } else {
            createdAt = new Date(data.createdAt);
          }
        }
        return {
          id: doc.id,
          ...data,
          createdAt: createdAt.toISOString()
        };
      });

      decks.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      res.json(decks);
    } catch (error: any) {
      console.error("Error fetching decks:", error);
      res.status(500).json({ error: "Failed to fetch decks", details: error.message });
    }
  });

  app.post(["/api/decks", "/api/decks/"], async (req, res) => {
    console.log("POST /api/decks requested", { bodyKeys: Object.keys(req.body) });
    try {
      if (!db) throw new Error("Database not initialized");
      const { code, title, authorName } = req.body;
      if (!code || !title) return res.status(400).json({ error: "Missing fields" });
      
      const docRef = await addDoc(collection(db, "decks"), {
        code,
        title,
        authorName: authorName || "匿名炉友",
        createdAt: serverTimestamp(),
      });
      console.log("Deck added with ID:", docRef.id);
      res.json({ id: docRef.id });
    } catch (error: any) {
      console.error("Error adding deck:", error);
      res.status(500).json({ 
        error: "Failed to add deck", 
        details: error.message,
        code: error.code,
        stack: error.stack 
      });
    }
  });

  app.delete("/api/decks/:id", async (req, res) => {
    console.log(`DELETE /api/decks/${req.params.id} requested`);
    const adminToken = req.headers["x-admin-token"];
    if (adminToken !== process.env.ADMIN_TOKEN) return res.status(401).json({ error: "Unauthorized" });

    try {
      await deleteDoc(doc(db, "decks", req.params.id));
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting deck:", error);
      res.status(500).json({ error: "Failed to delete deck", details: error.message });
    }
  });

  // --- Proxy API Endpoints for Images ---
  app.get(["/api/images", "/api/images/"], async (req, res) => {
    console.log("GET /api/images requested");
    try {
      const q = query(collection(db, "images"), limit(50));
      const snapshot = await getDocs(q);
      console.log(`Found ${snapshot.docs.length} images`);
      
      const images = snapshot.docs.map(doc => {
        const data = doc.data();
        let createdAt = new Date();
        if (data.createdAt) {
          if (typeof data.createdAt.toDate === 'function') {
            createdAt = data.createdAt.toDate();
          } else if (data.createdAt._seconds) {
            createdAt = new Date(data.createdAt._seconds * 1000);
          } else {
            createdAt = new Date(data.createdAt);
          }
        }
        return {
          id: doc.id,
          ...data,
          createdAt: createdAt.toISOString()
        };
      });

      images.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      res.json(images);
    } catch (error: any) {
      console.error("Error fetching images:", error);
      res.status(500).json({ error: "Failed to fetch images", details: error.message });
    }
  });

  app.post(["/api/images", "/api/images/"], async (req, res) => {
    const bodySize = JSON.stringify(req.body).length;
    console.log("POST /api/images requested", { 
      caption: req.body.caption, 
      authorName: req.body.authorName,
      bodySize: `${(bodySize / 1024).toFixed(2)} KB`
    });
    try {
      if (!db) throw new Error("Database not initialized");
      const { url, caption, authorName } = req.body;
      if (!url || !caption) return res.status(400).json({ error: "Missing fields" });

      const docRef = await addDoc(collection(db, "images"), {
        url,
        caption,
        authorName: authorName || "匿名炉友",
        likes: 0,
        createdAt: serverTimestamp(),
      });
      console.log("Image added with ID:", docRef.id);
      res.json({ id: docRef.id });
    } catch (error: any) {
      console.error("Error adding image:", error);
      res.status(500).json({ 
        error: "Failed to add image", 
        details: error.message,
        code: error.code,
        stack: error.stack
      });
    }
  });

  app.post("/api/images/:id/like", async (req, res) => {
    try {
      const docRef = doc(db, "images", req.params.id);
      await updateDoc(docRef, {
        likes: increment(1)
      });
      res.json({ success: true });
    } catch (error) {
      console.error("Error liking image:", error);
      res.status(500).json({ error: "Failed to like image" });
    }
  });

  app.delete("/api/images/:id", async (req, res) => {
    const adminToken = req.headers["x-admin-token"];
    if (adminToken !== process.env.ADMIN_TOKEN) return res.status(401).json({ error: "Unauthorized" });

    try {
      await deleteDoc(doc(db, "images", req.params.id));
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
