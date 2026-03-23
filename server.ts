import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import admin from "firebase-admin";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
// We try to load the config from the file provided by AI Studio
const configPath = path.join(process.cwd(), "firebase-applet-config.json");
let firebaseConfig = null;
if (fs.existsSync(configPath)) {
  firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
}

if (firebaseConfig) {
  admin.initializeApp({
    projectId: firebaseConfig.projectId,
  });
}

const db = admin.firestore();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for QQ Webhook
  // This endpoint is designed to be called by a QQ Bot (e.g., NapCat, Go-CQHTTP)
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
      const docRef = await db.collection("images").add({
        url: imageUrl,
        authorName: authorName || "QQ群友",
        caption: caption || "来自QQ群自动同步",
        likes: 0,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log("Image synced from QQ:", docRef.id);
      res.json({ success: true, id: docRef.id });
    } catch (error) {
      console.error("Webhook error:", error);
      res.status(500).json({ error: "Internal Server Error" });
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
