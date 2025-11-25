import express from "express";
import { 
  readQueue, 
  getNextItem, 
  removeNextItem,
  writeQueue,
  addToQueue
} from "../utils/contentQueue.js";

const router = express.Router();

// Get full queue
router.get("/all", (req, res) => {
  res.json(readQueue());
});

// Peek next item (without removing)
router.get("/peek", (req, res) => {
  const queue = readQueue();
  if (queue.length === 0) {
    return res.status(404).json({ message: "Queue empty" });
  }
  res.json(queue[0]);
});

// Peek next item
router.get("/next", (req, res) => {
  const next = getNextItem();
  res.json(next || { message: "Queue empty" });
});

// Remove next item
router.post("/remove", (req, res) => {
  removeNextItem();
  res.json({ message: "Next item removed" });
});

// Add manual item
router.post("/add", (req, res) => {
  addToQueue(req.body);
  res.json({ message: "Item added to queue" });
});

// Clear the queue
router.post("/clear", (req, res) => {
  writeQueue([]);
  res.json({ message: "Queue cleared" });
});

export default router;
