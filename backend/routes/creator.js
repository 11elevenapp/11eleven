import express from "express";
import { generateProphecyCard } from "../utils/generateProphecy.js";

const router = express.Router();

// Middleware: check creator key
router.use((req, res, next) => {
  const key = req.headers["x-creator-key"];
  if (key !== process.env.CREATOR_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
});

// 👉 1. Generate Early Access (No restrictions)
router.get("/early", async (req, res) => {
  const result = await generateProphecyCard("early");
  res.json(result);
});

// 👉 2. Generate Deep Insight (No restrictions)
router.get("/deep", async (req, res) => {
  const result = await generateProphecyCard("deep");
  res.json(result);
});

// 👉 3. Generate 11:11 Prophecy (No wait)
router.get("/1111", async (req, res) => {
  const result = await generateProphecyCard("1111");
  res.json(result);
});

export default router;
