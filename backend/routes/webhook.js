// backend/routes/webhook.js
import express from "express";
const router = express.Router();

const VERIFY_TOKEN = "my_verify_token_1111"; // must match Meta Dashboard EXACTLY

// STEP 1 — VERIFY WEBHOOK
router.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✔ IG Webhook VERIFIED");
    return res.status(200).send(challenge);
  }

  console.log("❌ Verification failed");
  return res.sendStatus(403);
});

// STEP 2 — RECEIVE WEBHOOK EVENTS
router.post("/webhook", (req, res) => {
  console.log("📩 IG Webhook received:", JSON.stringify(req.body, null, 2));
  res.sendStatus(200);
});

export default router;
