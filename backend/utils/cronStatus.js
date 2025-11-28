import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// ESM dirname replacement
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STATUS_FILE = path.join(__dirname, "../data/cronStatus.json");

export function isPostingEnabled() {
  const raw = fs.readFileSync(STATUS_FILE, "utf8");
  const json = JSON.parse(raw);
  return json.postingEnabled === true;
}

export function enablePosting() {
  const json = { postingEnabled: true };
  fs.writeFileSync(STATUS_FILE, JSON.stringify(json, null, 2));
  console.log("🔥 Auto-posting ENABLED");
}

export function disablePosting() {
  const json = { postingEnabled: false };
  fs.writeFileSync(STATUS_FILE, JSON.stringify(json, null, 2));
  console.log("⛔ Auto-posting DISABLED");
}
