import express from "express";
import fetch from "node-fetch";
import { 
  exchangeCodeForToken,
  refreshLongLivedToken,
  publishToInstagram
} from "../utils/instagram.js";
import { publishToFacebook } from "../utils/facebook.js";
import { getNextProphecy, markProphecyPosted } from "../utils/prophecyLoader.js";
import {
  isPostingEnabled,
  enablePosting,
  disablePosting,
} from "../utils/cronStatus.js";

const router = express.Router();

// Poll Instagram container until ready
async function waitForMediaReady(igUserId, containerId, token) {
  console.log("🔍 Diagnosing IG media status...");

  const base = `https://graph.facebook.com/v21.0/${containerId}`;
  const maxAttempts = 20; // 30–40 seconds
  const delay = (ms) => new Promise((res) => setTimeout(res, ms));

  for (let i = 1; i <= maxAttempts; i++) {
    const url = `${base}?fields=status_code,status&access_token=${token}`;

    try {
      const res = await fetch(url);
      const json = await res.json();

      console.log(`🔎 [Attempt ${i}] IG status:`, json);

      if (json.status_code === "FINISHED" || json.status === "FINISHED") {
        console.log("✅ Media FINISHED & READY");
        return true;
      }

      if (json.status_code === "ERROR" || json.status === "ERROR" || json.error) {
        console.log("❌ IG returned ERROR:", json);
        return false;
      }
    } catch (err) {
      console.log("⚠️ Poll error:", err);
      return false;
    }

    await delay(2000);
  }

  console.log("⏳ Timeout — media never entered FINISHED state.");
  return false;
}

// 1. Handle IG Callback
router.get("/callback", async (req, res) => {
  const { code } = req.query;

  if (!code) return res.status(400).send("Missing code");

  await exchangeCodeForToken(code);

  res.send(`
    <html>
    <body style="background:#0d0d14; color:white; display:flex; align-items:center; justify-content:center; height:100vh; font-family:Arial">
      <h2>Instagram Login Completed</h2>
    </body>
    </html>
  `);
});

// 2. Manual Refresh Token
router.get("/refresh", async (req, res) => {
  const result = await refreshLongLivedToken();
  res.json(result);
});

// 3. Post to Instagram
router.post("/publish", async (req, res) => {
  const { imageUrl, caption } = req.body;

  if (!imageUrl) return res.status(400).send("Missing imageUrl");
  if (!caption) return res.status(400).send("Missing caption");

  const result = await publishToInstagram(imageUrl, caption);
  res.json(result);
});

router.get("/test-post", async (req, res) => {
  try {
    const next = getNextProphecy();

    if (!next) {
      return res.status(404).json({ error: "No unposted prophecies left" });
    }

    const { caption, entry, list } = next;
    const imageURL =
      process.env.TEST_IMAGE_URL ||
      "https://storage.googleapis.com/graph-explorer-api-samples/jerry.jpg";
    console.log("TEST POST using imageURL:", imageURL);

    // 1) Create IG media container
    const container = await fetch(
      `https://graph.instagram.com/me/media`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_url: imageURL,
          caption,
          access_token: process.env.FB_IG_ACCESS_TOKEN,
        }),
      }
    ).then((r) => r.json());

    if (!container.id) {
      console.error("IG container creation failed:", container);
      return res.status(500).json({ error: "Failed to create IG media container", container });
    }

    // ========== WAIT FOR IG MEDIA TO BE READY ==========
    const FB_ACCOUNT_ID = process.env.FB_ACCOUNT_ID;
    const FB_IG_ACCESS_TOKEN = process.env.FB_IG_ACCESS_TOKEN;

    const ready = await waitForMediaReady(
      FB_ACCOUNT_ID,
      container.id,
      FB_IG_ACCESS_TOKEN
    );

    if (!ready) {
      return res.json({
        ok: false,
        error: "Media not ready after polling"
      });
    }

    // ========== PUBLISH TO INSTAGRAM ==========
    const publishUrl = `https://graph.facebook.com/v21.0/${FB_ACCOUNT_ID}/media_publish`;

    const publishRes = await fetch(publishUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        creation_id: container.id,
        access_token: FB_IG_ACCESS_TOKEN,
      }),
    });

    const publishJson = await publishRes.json();
    console.log("📤 Publish result:", publishJson);

    // Respond now (IG publish result)
    res.json({
      ok: true,
      container,
      publish: publishJson
    });

    // 2) Optionally also post to Facebook (already wired)
    try {
      await publishToFacebook(process.env.FB_PAGE_ID, caption, imageURL);
      console.log("FB test post sent");
    } catch (fbErr) {
      console.error("FB test post error:", fbErr.message);
    }

    // 3) Mark prophecy as posted
    markProphecyPosted(entry, list);

    return res.json({
      ok: true,
      caption,
      imageURL,
      igResult,
    });
  } catch (err) {
    console.error("TEST POST ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// Check status
router.get("/cron-status", (req, res) => {
  res.json({ postingEnabled: isPostingEnabled() });
});

// Turn ON
router.post("/cron-start", (req, res) => {
  enablePosting();
  res.json({ success: true, postingEnabled: true });
});

// Turn OFF
router.post("/cron-stop", (req, res) => {
  disablePosting();
  res.json({ success: true, postingEnabled: false });
});

export default router;
