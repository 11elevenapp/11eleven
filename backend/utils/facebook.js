import fs from "fs";
import path from "path";
import fetch from "node-fetch";

const dataPath = path.join(process.cwd(), "backend/data/instagram.json");

// Load Instagram/FB tokens
function loadTokens() {
  return JSON.parse(fs.readFileSync(dataPath, "utf8"));
}

// Save updated tokens
function saveTokens(tokens) {
  fs.writeFileSync(dataPath, JSON.stringify(tokens, null, 2));
}

/**
 * Publish image to Facebook Page
 * @param {string} pageId
 * @param {string} caption
 * @param {string} imageUrl
 */
export async function publishToFacebook(pageId, caption, imageUrl) {
  const tokens = loadTokens();
  const accessToken = tokens.longLivedAccessToken;

  try {
    // Step 1: Create the photo container
    const containerRes = await fetch(
      `https://graph.facebook.com/v19.0/${pageId}/photos`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: imageUrl,
          caption,
          access_token: accessToken,
        }),
      }
    );

    const containerData = await containerRes.json();
    console.log("📦 FB Container Response:", containerData);

    if (!containerData.id) {
      throw new Error("Failed to create FB photo container");
    }

    return { success: true, id: containerData.id };
  } catch (err) {
    console.error("❌ Error publishing to Facebook:", err);
    return { success: false, error: err.message };
  }
}
