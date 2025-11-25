import cron from "node-cron";
import axios from "axios";

// MOCK Instagram actions — real API added later
async function mockLike(postId) {
  console.log("❤️ Liked post:", postId);
}

async function mockComment(postId, comment) {
  console.log("💬 Commented:", comment, "->", postId);
}

const COMMENTS = [
  "Beautiful alignment. 💫",
  "This message landed today — thank you.",
  "Perfect timing. 🙏",
  "Needed this more than I knew.",
  "Let it unfold. 🌙"
];

const HASHTAGS = [
  "1111sign",
  "affirmationsoftheday",
  "spiritualawakening",
  "1111energy",
  "selfgrowth",
  "mindsetshift"
];

// Fetch IG posts by hashtag (mock)
async function searchPostsByHashtag(tag) {
  // Placeholder for real IG API
  return [
    { id: `${tag}_1` },
    { id: `${tag}_2` },
    { id: `${tag}_3` },
    { id: `${tag}_4` },
    { id: `${tag}_5` },
  ];
}

async function runEngagement() {
  console.log("🔄 Engagement bot running...");

  // Pick a random hashtag
  const tag = HASHTAGS[Math.floor(Math.random() * HASHTAGS.length)];

  const posts = await searchPostsByHashtag(tag);

  // Like first 5
  for (let i = 0; i < 5; i++) {
    await mockLike(posts[i].id);
  }

  // Comment on first 3
  for (let i = 0; i < 3; i++) {
    const comment = COMMENTS[Math.floor(Math.random() * COMMENTS.length)];
    await mockComment(posts[i].id, comment);
  }

  console.log("✨ Engagement cycle complete.");
}

export function startEngagementBot() {
  console.log("🤖 Engagement Bot ACTIVE");

  // Every 2 hours
  cron.schedule("0 */2 * * *", () => {
    runEngagement();
  });

  // Quick test every 2 minutes
  cron.schedule("*/2 * * * *", () => {
    console.log("⚡ Engagement test tick");
  });
}
