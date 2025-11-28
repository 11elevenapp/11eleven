import express from "express";
import { publishToFacebook } from "../utils/facebook.js";

const router = express.Router();

// Test manual post
router.get("/test-post", async (req, res) => {
  const caption = "🔥 11Eleven Test Post — Automated System Check.";
  const imageUrl = "https://11eleven.app/sample.jpg"; // You can replace later

  const result = await publishToFacebook("891543960704734", caption, imageUrl);

  res.json(result);
});

export default router;
