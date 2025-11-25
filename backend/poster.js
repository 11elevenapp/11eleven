import axios from "axios";
import fs from "fs";
import FormData from "form-data";
import cron from "node-cron";

const QUEUE_PEEK = "http://localhost:8787/queue/peek";
const QUEUE_REMOVE = "http://localhost:8787/queue/remove";

// Placeholder — we connect APIs later
async function postToInstagram(imagePath, caption) {
  console.log("📸 (SIMULATED) Posting to Instagram:", imagePath);

  // simulate delay
  await new Promise(r => setTimeout(r, 1200));

  return { success: true };
}

async function runPosterBot() {
  try {
    // 1. Peek queue item
    const peek = await axios.get(QUEUE_PEEK);
    if (!peek.data || !peek.data.cardUrl) {
      console.log("⏳ Queue empty — nothing to post.");
      return;
    }

    const item = peek.data;
    console.log("🎯 Posting item:", item.prophecyText);

    // 2. Download image
    const imgUrl = `http://localhost:8787${item.cardUrl}`;
    const imgPath = `./downloaded_card.png`;
    const imgResponse = await axios.get(imgUrl, { responseType: "arraybuffer" });
    fs.writeFileSync(imgPath, imgResponse.data);

    // 3. Build caption
    const caption = `${item.captions.medium}\n\n${item.cta}\n\n${item.hashtags}`;

    // 4. Post to Instagram (placeholder)
    const result = await postToInstagram(imgPath, caption);

    if (result.success) {
      console.log("✅ Post successful. Removing item from queue...");
      await axios.post(QUEUE_REMOVE);
    } else {
      console.log("❌ Post failed — leaving item in queue.");
    }

    // Cleanup file
    if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);

  } catch (err) {
    console.error("POSTER ERROR:", err);
  }
}

// Schedule: every day at 11:11 AM
cron.schedule("11 11 * * *", () => {
  console.log("⏰ Poster Bot triggered @ 11:11");
  runPosterBot();
});

// Schedule: simulator every 60 sec (disable when live)
cron.schedule("* * * * *", () => {
  console.log("⏳ Poster Bot TEST tick...");
  runPosterBot();
});

export { runPosterBot };
