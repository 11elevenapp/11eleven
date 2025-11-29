// cron/manualGenerator.js
import cron from "node-cron";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { generateProphecyCard } from "../utils/generateProphecy.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Folders
const CARDS_DIR = path.join(__dirname, "..", "public", "cards");
const CAPTIONS_DIR = path.join(__dirname, "..", "public", "captions");

// Make sure captions folder exists
if (!fs.existsSync(CAPTIONS_DIR)) {
  fs.mkdirSync(CAPTIONS_DIR, { recursive: true });
}

// -------------------------
// ROTATING POST TYPES
// -------------------------
const ROTATION = ["early", "deep", "1111"];
let index = 0;

// -------------------------
// CRON: every 5 minutes
// -------------------------
export function startManualGenerationCron() {
  console.log("⏳ Manual Generation Cron: Active (every 5 minutes)");

  cron.schedule("*/5 * * * *", async () => {
    const kind = ROTATION[index];
    index = (index + 1) % ROTATION.length;

    console.log(`⚡ Generating ${kind} card...`);

    try {
      const result = await generateProphecyCard(kind);

      // Save caption JSON
      const fileName = `${kind}-${Date.now()}.json`;
      const writePath = path.join(CAPTIONS_DIR, fileName);

      fs.writeFileSync(
        writePath,
        JSON.stringify(
          {
            type: kind,
            prophecy: result.prophecyText,
            captions: result.captions,
            cta: result.cta,
            hashtags: result.hashtags,
            cardUrl: result.cardUrl,
          },
          null,
          2
        )
      );

      console.log(`📄 Caption saved → ${fileName}`);
      console.log(`🖼️ Card created → ${result.cardUrl}`);
    } catch (err) {
      console.error("❌ Generation failed:", err);
    }
  });
}
