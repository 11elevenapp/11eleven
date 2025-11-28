import fs from "fs";
import path from "path";
import fetch from "node-fetch";

const dataPath = path.join(process.cwd(), "data", "instagram.json");

function loadData() {
  return JSON.parse(fs.readFileSync(dataPath, "utf8"));
}

function saveData(data) {
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
}

export async function exchangeCodeForToken(code) {
  const endpoint = `https://api.instagram.com/oauth/access_token`;
  
  const body = new URLSearchParams({
    client_id: process.env.IG_CLIENT_ID,
    client_secret: process.env.IG_CLIENT_SECRET,
    grant_type: "authorization_code",
    redirect_uri: "https://11eleven.app/auth/instagram/callback",
    code
  });

  const res = await fetch(endpoint, { method: "POST", body });
  const json = await res.json();

  if (json.access_token) {
    const db = loadData();
    db.access_token = json.access_token;
    db.user_id = json.user_id;
    db.expires_at = Date.now() + 3600 * 1000; // 1 hour
    saveData(db);
  }

  return json;
}

export async function refreshLongLivedToken() {
  const db = loadData();

  const url = `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${db.access_token}`;

  const res = await fetch(url);
  const json = await res.json();

  if (json.access_token) {
    db.access_token = json.access_token;
    db.expires_at = Date.now() + json.expires_in * 1000;
    saveData(db);
  }

  return json;
}

export async function publishToInstagram(imageUrl, caption) {
  const db = loadData();
  const userId = db.user_id;

  // STEP 1 — Create Media Container
  const createRes = await fetch(
    `https://graph.facebook.com/v18.0/${userId}/media`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image_url: imageUrl,
        caption,
        access_token: db.access_token
      })
    }
  );

  const createData = await createRes.json();
  if (!createData.id) return createData;

  // STEP 2 — Publish Container
  const publishRes = await fetch(
    `https://graph.facebook.com/v18.0/${userId}/media_publish`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        creation_id: createData.id,
        access_token: db.access_token
      })
    }
  );

  return publishRes.json();
}
