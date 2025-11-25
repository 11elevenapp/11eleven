import cron from "node-cron";
import axios from "axios";
import { addToQueue } from "./utils/contentQueue.js";

// Creator API URL
const CREATOR_URL = "http://localhost:8787/creator";

// Task helper  
async function generateAndQueue(kind) {
  try {
    const res = await axios.get(`${CREATOR_URL}/${kind}`, {
      headers: { "x-creator-key": process.env.CREATOR_KEY },
    });

    const payload = res.data;
    await addToQueue(payload);

    console.log(`📥 QUEUED (${kind}) @`, new Date().toLocaleString());
  } catch (err) {
    console.error("Scheduler failed:", err.message);
  }
}

export function startScheduler() {
  console.log("🕒 Post Scheduler Active...");

  // 9:00 AM
  cron.schedule("0 9 * * *", () => generateAndQueue("early"));

  // 3:00 PM
  cron.schedule("0 15 * * *", () => generateAndQueue("early"));

  // 8:00 PM
  cron.schedule("0 20 * * *", () => generateAndQueue("deep"));

  // 11:11 AM
  cron.schedule("11 11 * * *", () => generateAndQueue("1111"));

  // 11:11 PM
  cron.schedule("11 23 * * *", () => generateAndQueue("1111"));
}

