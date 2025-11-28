import fs from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Correct absolute path to prophecies.json
const manifestPath = path.join(__dirname, "..", "data", "prophecies.json");

// Correct absolute path to the cards folder
const cardsFolder = path.join(__dirname, "..", "public", "cards");

export function loadProphecies() {
  const raw = fs.readFileSync(manifestPath, "utf8");
  const data = JSON.parse(raw);
  console.log("Loaded prophecies:", data);
  return data;
}


export function saveProphecies(data) {
  fs.writeFileSync(manifestPath, JSON.stringify(data, null, 2));
}

export function getNextProphecy() {
  const list = loadProphecies();
  const next = list.find((p) => !p.posted);

  if (!next) {
    console.log("No unposted prophecies left.");
    return null;
  }

  const imagePath = path.join(cardsFolder, next.filename);

  console.log("Next prophecy:", {
    id: next.id,
    caption: next.caption,
    filename: next.filename,
    imagePath,
  });

  return {
    entry: next,   // original JSON entry
    list,          // full list so we can mark + save
    imagePath,     // absolute path to PNG on disk
    caption: next.caption,
  };
}

export function markProphecyPosted(entry, list) {
  const index = list.indexOf(entry);
  if (index !== -1) {
    list[index].posted = true;
    saveProphecies(list);
  }
}
