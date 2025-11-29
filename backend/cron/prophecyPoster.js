import cron from "node-cron";
import { publishToInstagram } from "../utils/instagram.js";
import { publishToFacebook } from "../utils/facebook.js";
import { getNextProphecy, markProphecyPosted } from "../utils/prophecyLoader.js";
import { isPostingEnabled } from "../utils/cronStatus.js";

async function runProphecyPost() {
  try {
    const prophecy = getNextProphecy();
    if (!prophecy) {
      console.log("No more prophecies left to post.");
      return;
    }

    const { imagePath, caption, entry, list, imageUrl } = prophecy;

    console.log("Posting prophecy:", imagePath || imageUrl);

    const imageURL =
      imageUrl ||
      process.env.TEST_IMAGE_URL ||
      "https://storage.googleapis.com/graph-explorer-api-samples/jerry.jpg";

    const result = await publishToInstagram(imageURL, caption);

    if (result.success) {
      console.log("IG Post Successful:", result);
      markProphecyPosted(entry, list);

      // Facebook posting
      await publishToFacebook(
        "891543960704734",
        prophecy.caption,
        imageURL
      );
      console.log("📘 Posted to Facebook:", imageURL);
    } else {
      console.log("IG Post Failed:", result.error);
    }
  } catch (err) {
    console.error("Prophecy Post Error:", err);
  }
}

export function startProphecyCronJobs() {
  // 9:00 AM
  cron.schedule(
    "0 9 * * *",
    async () => {
      if (!isPostingEnabled()) {
        console.log("⏸ Auto-posting paused — skipping this slot.");
        return;
      }
      await runProphecyPost();
    },
    { timezone: "America/Chicago" }
  );

  // 3:00 PM
  cron.schedule(
    "0 15 * * *",
    async () => {
      if (!isPostingEnabled()) {
        console.log("⏸ Auto-posting paused — skipping this slot.");
        return;
      }
      await runProphecyPost();
    },
    { timezone: "America/Chicago" }
  );

  // 8:00 PM
  cron.schedule(
    "0 20 * * *",
    async () => {
      if (!isPostingEnabled()) {
        console.log("⏸ Auto-posting paused — skipping this slot.");
        return;
      }
      await runProphecyPost();
    },
    { timezone: "America/Chicago" }
  );

  // 11:11 AM
  cron.schedule(
    "11 11 * * *",
    async () => {
      if (!isPostingEnabled()) {
        console.log("⏸ Auto-posting paused — skipping this slot.");
        return;
      }
      await runProphecyPost();
    },
    { timezone: "America/Chicago" }
  );

  // 11:11 PM
  cron.schedule(
    "11 23 * * *",
    async () => {
      if (!isPostingEnabled()) {
        console.log("⏸ Auto-posting paused — skipping this slot.");
        return;
      }
      await runProphecyPost();
    },
    { timezone: "America/Chicago" }
  );

  console.log("✨ 11Eleven Prophecy Cron Jobs Started.");
}
