import fs from "fs";
import path from "path";

const QUEUE_FILE = path.join(process.cwd(), "queue.json");

// ensure queue exists
if (!fs.existsSync(QUEUE_FILE)) {
  fs.writeFileSync(QUEUE_FILE, JSON.stringify([]));
}

export function readQueue() {
  return JSON.parse(fs.readFileSync(QUEUE_FILE));
}

export function writeQueue(data) {
  fs.writeFileSync(QUEUE_FILE, JSON.stringify(data, null, 2));
}

// Add new content to queue
export function addToQueue(item) {
  const q = readQueue();
  q.push({
    ...item,
    createdAt: Date.now(),
  });
  writeQueue(q);
}

export function getNextItem() {
  const q = readQueue();
  return q.length > 0 ? q[0] : null;
}

export function removeNextItem() {
  const q = readQueue();
  q.shift();
  writeQueue(q);
}
