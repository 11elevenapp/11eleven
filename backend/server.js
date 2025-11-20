// -----------------------------------------------------------
// 11Eleven Oracle — Supercharged Backend v3
// Nemesis & ChatGPT
// -----------------------------------------------------------

import express from "express";
import dotenv from "dotenv";
import OpenAI from "openai";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();

// Enable static file serving from the /public folder
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, "../public")));
app.use(express.json({ limit: "25mb" }));

const USER_DATA_PATH = path.join(__dirname, "..", "public", "userData.json");
const USER_DATA_DEFAULT = {
  preferences: {},
  avoid: {},
  last10Themes: [],
  insights: {
    dominantTheme: null,
    trend: null,
    emotionalTone: null,
    patternScore: 0,
  },
  language: "en",
  geo: {
    timeZone: null,
    region: "unknown",
    source: "none",
  },
  preferencesModel: {
    byTheme: {},
    byEmotion: {},
    byTone: {},
    languages: [],
    lastLanguage: "en",
  },
};

async function ensureUserDataFile() {
  try {
    await fs.access(USER_DATA_PATH);
  } catch {
    await fs.writeFile(
      USER_DATA_PATH,
      JSON.stringify(USER_DATA_DEFAULT, null, 2),
      "utf8"
    );
  }
}

function withDefaultUserData(raw) {
  return {
    preferences: raw.preferences || {},
    avoid: raw.avoid || {},
    last10Themes: Array.isArray(raw.last10Themes) ? raw.last10Themes : [],
    insights: {
      dominantTheme:
        raw.insights?.dominantTheme ?? USER_DATA_DEFAULT.insights.dominantTheme,
      trend: raw.insights?.trend ?? USER_DATA_DEFAULT.insights.trend,
      emotionalTone:
        raw.insights?.emotionalTone ??
        USER_DATA_DEFAULT.insights.emotionalTone,
      patternScore:
        typeof raw.insights?.patternScore === "number"
          ? raw.insights.patternScore
      : USER_DATA_DEFAULT.insights.patternScore,
    },
    language: raw.language || USER_DATA_DEFAULT.language,
    geo: {
      timeZone: raw.geo?.timeZone ?? USER_DATA_DEFAULT.geo.timeZone,
      region: raw.geo?.region ?? USER_DATA_DEFAULT.geo.region,
      source: raw.geo?.source ?? USER_DATA_DEFAULT.geo.source,
    },
    preferencesModel: {
      byTheme: raw.preferencesModel?.byTheme || {},
      byEmotion: raw.preferencesModel?.byEmotion || {},
      byTone: raw.preferencesModel?.byTone || {},
      languages: Array.isArray(raw.preferencesModel?.languages)
        ? raw.preferencesModel.languages
        : [],
      lastLanguage:
        raw.preferencesModel?.lastLanguage ||
        USER_DATA_DEFAULT.preferencesModel.lastLanguage,
    },
  };
}

async function readUserData() {
  await ensureUserDataFile();
  try {
    const raw = await fs.readFile(USER_DATA_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return withDefaultUserData(parsed);
  } catch {
    await fs.writeFile(
      USER_DATA_PATH,
      JSON.stringify(USER_DATA_DEFAULT, null, 2),
      "utf8"
    );
    return withDefaultUserData(USER_DATA_DEFAULT);
  }
}

async function writeUserData(data) {
  const merged = withDefaultUserData(data);
  await fs.writeFile(
    USER_DATA_PATH,
    JSON.stringify(merged, null, 2),
    "utf8"
  );
}

function themeToneMapping(themeKey) {
  const map = {
    release: "release",
    decision: "awakening",
    worthiness: "rebuilding",
    boundaries: "empowering",
    selfDiscovery: "transformational",
    warm: "gentle",
    direct: "activation",
  };
  return map[themeKey] || null;
}

function trendFromHistory(history) {
  const lightSet = new Set(["worthiness", "decision", "warm", "selfDiscovery"]);
  const deepSet = new Set(["release", "boundaries", "direct"]);
  let lightCount = 0;
  let deepCount = 0;
  history.forEach((theme) => {
    if (lightSet.has(theme)) lightCount += 1;
    else if (deepSet.has(theme)) deepCount += 1;
  });
  if (lightCount > deepCount + 1) return "lifting";
  if (deepCount > lightCount + 1) return "descending";
  return "balancing";
}

function computeDominantTheme(preferences, history) {
  const scores = {};
  Object.entries(preferences || {}).forEach(([theme, value]) => {
    scores[theme] = (scores[theme] || 0) + value;
  });
  history.forEach((theme) => {
    scores[theme] = (scores[theme] || 0) + 1;
  });

  let dominant = null;
  let bestScore = -Infinity;
  Object.entries(scores).forEach(([theme, value]) => {
    if (value > bestScore) {
      bestScore = value;
      dominant = theme;
    }
  });
  return dominant;
}

async function updateInsightsForTheme(theme) {
  const normalizedTheme = theme || "general";
  const data = await readUserData();
  const history = Array.isArray(data.last10Themes)
    ? data.last10Themes.slice()
    : [];

  if (history[history.length - 1] !== normalizedTheme) {
    history.push(normalizedTheme);
    while (history.length > 10) history.shift();
  }

  data.last10Themes = history;

  const dominantTheme = computeDominantTheme(data.preferences, history);
  const tone = dominantTheme ? themeToneMapping(dominantTheme) : null;
  const trend = trendFromHistory(history);

  const insights = data.insights || { ...USER_DATA_DEFAULT.insights };
  let patternScore =
    typeof insights.patternScore === "number"
      ? insights.patternScore
      : USER_DATA_DEFAULT.insights.patternScore;

  if (dominantTheme && history.filter((t) => t === dominantTheme).length > 1) {
    patternScore = Math.min(100, patternScore + 1);
  }

  if ((data.avoid?.[normalizedTheme] || 0) > 0) {
    patternScore = Math.max(0, patternScore - 5);
  }

  data.insights = {
    dominantTheme: dominantTheme ?? null,
    emotionalTone: tone,
    trend,
    patternScore,
  };

  await writeUserData(data);
  return data;
}

function clampPreferenceScore(value) {
  if (value < -3) return -3;
  if (value > 10) return 10;
  return value;
}

function ensurePreferenceModel(model = {}) {
  return {
    byTheme: model.byTheme || {},
    byEmotion: model.byEmotion || {},
    byTone: model.byTone || {},
    languages: Array.isArray(model.languages) ? model.languages : [],
    lastLanguage: model.lastLanguage || "en",
  };
}

function adjustPreferenceEntry(map, key, delta) {
  if (!key) return;
  if (!map[key]) map[key] = { score: 0 };
  map[key].score = clampPreferenceScore(map[key].score + delta);
}

function updatePreferenceModel(data, reaction, ctx = {}) {
  const model = ensurePreferenceModel(data.preferencesModel);
  const { theme, primaryEmotion, tone, language } = ctx;

  let delta = 0;
  if (reaction === "love") delta = 2;
  if (reaction === "dislike") delta = -2;

  if (delta !== 0) {
    adjustPreferenceEntry(model.byTheme, theme, delta);
    adjustPreferenceEntry(model.byEmotion, primaryEmotion, delta);
    adjustPreferenceEntry(model.byTone, tone, delta);
  }

  if (language && !model.languages.includes(language)) {
    model.languages.push(language);
  }
  if (language) {
    model.lastLanguage = language;
  }

  data.preferencesModel = model;
}

// ---------------------------------------------------------------------
// MEMORY ENGINE (per-IP session simulation)
// ---------------------------------------------------------------------
const userMemory = {};

function getUserSession(req) {
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  if (!userMemory[ip]) {
    userMemory[ip] = {
      lastTheme: null,
      lastAura: null,
      lastProphecy: null,
      emotionalTone: null,
      patternTag: null,
    };
  }
  return userMemory[ip];
}

// ---------------------------------------------------------------------
// AURA SELECTOR
// ---------------------------------------------------------------------
function inferAuraTheme(text) {
  const t = text.toLowerCase();

  if (t.includes("clarity") || t.includes("decision") || t.includes("clear"))
    return "gold";
  if (t.includes("intuition") || t.includes("sign") || t.includes("whisper"))
    return "purple";
  if (t.includes("peace") || t.includes("calm") || t.includes("stillness"))
    return "blue";
  if (t.includes("heart") || t.includes("feeling") || t.includes("love"))
    return "pink";
  if (t.includes("change") || t.includes("opportunity") || t.includes("shift"))
    return "green";

  return "purple";
}

// Category descriptions for Variety Engine
const CATEGORY_DESCRIPTIONS = {
  clarity: "seeing a situation, decision, or feeling more clearly",
  timing: "when to move, when to wait, and how to change your pace",
  courage: "finding the nerve to act differently even when you feel afraid",
  release: "letting go of something heavy, stuck, or outdated",
  alignment: "living in a way that matches who you really are",
  desire: "admitting what you truly want instead of what you think you should want",
  truth: "being honest with yourself about what is real and what is not",
  self_worth: "believing you deserve a better life and better choices",
  intuition: "trusting the quiet inner knowing that keeps trying to speak up",
  general: "one clear, emotionally honest realization",
};

// ---------------------------------------------------------------------
// MAIN ORACLE ENGINE
// ---------------------------------------------------------------------
async function generateProphecy(requestBody, memory) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return "The connection is faint — missing API key.";

  const openai = new OpenAI({ apiKey });

  const {
    kind,
    tone,
    dayTone,
    languageHint,
    geoHint,
    worldTrend,
    lastCategory,
    targetCategory,
  } = requestBody;

  const focusCategory = targetCategory || lastCategory || "general";
  const focusDescription =
    CATEGORY_DESCRIPTIONS[focusCategory] ||
    CATEGORY_DESCRIPTIONS.general;

  // Anti-repeat
  const antiRepeatParts = [];
  if (memory.lastProphecy) {
    antiRepeatParts.push(
      `Avoid repeating the same idea, structure, or phrases as this previous message: "${memory.lastProphecy}".`
    );
  }
  if (memory.lastTheme && focusCategory !== "general" && focusCategory !== memory.lastTheme) {
    antiRepeatParts.push(
      `This time, focus on a different emotional angle than "${memory.lastTheme}".`
    );
  }
  const antiRepeat = antiRepeatParts.join("\n");

  // Intent shaping
  let intention = "";
  if (kind === "free_first") intention = "gentle, short, slightly mysterious";
  if (kind === "free_repeat") intention = "supportive, soft";
  if (kind === "early_access") intention = "emotional clarity, honest, revealing";
  if (kind === "deeper_access")
    intention = "bold, deeper truth, specific emotional realization";

  // Tone shaping from client engine
  const metaTone = `
In this message, subtly reflect and use simple everyday words:
- the time tone: "${tone}"
- the weekday tone: "${dayTone}"
- a language personality flavor: "${languageHint}"
- a regional emotional nuance: "${geoHint}"
- a collective global trend influencing the world: "${worldTrend}"
- the target emotional lane: "${focusCategory}" (${focusDescription})
- avoid repeating the previous category: "${lastCategory}"
`;

  const basePrompt = `
You are The Oracle of 11Eleven.

Write ONE sentence.
Keep it grounded, warm, human, clean and use simple everyday words.
Avoid mystical, cliché, or generic “spiritual” language.
Avoid repeating phrases about “quiet thoughts”, “nudges”, “sometimes”, or “something”.
Write as if you truly understand the person’s inner conflict or timing.

The sentence should feel like:
- a moment of clarity
- something they quietly sensed but hadn’t named
- encouragement without prediction
- validation without being vague
- insight without mysticism

Focus this sentence on the theme of ${focusDescription}.

${metaTone}
${antiRepeat}

Write with this intention: "${intention}"
Output exactly ONE sentence.
`;

  const deeperPrompt = `
You are The Oracle of 11Eleven.

Write ONE sentence that deepens the previous insight with a gentle but honest emotional truth and use simple everyday words.
Reveal what they’ve been avoiding, wanting, or slowly realizing.
Avoid repetition. Avoid clichés. Avoid mystical language.
Avoid repeating phrases about “quiet thoughts”, “nudges”, “sometimes”, or “something”.
Do NOT repeat the surface-level idea.
Go one layer deeper.

Focus this deeper sentence on the theme of ${focusDescription}.

${metaTone}
${antiRepeat}

Tone: warm, direct, grounded.

ONE powerful sentence only.
`;

  const finalPrompt = kind === "deeper_access" ? deeperPrompt : basePrompt;

  try {
    const completion = await openai.responses.create({
      model: "gpt-5.1",
      input: finalPrompt,
    });

    const text =
      completion.output_text?.trim() ||
      completion.response_text?.trim() ||
      completion?.data?.[0]?.text?.trim() ||
      "The insight almost formed, but slipped away. Try again.";

    // Update session memory
    memory.lastProphecy = text;
    memory.lastTheme = focusCategory;
    memory.lastAura = inferAuraTheme(text);

    return text;
  } catch (err) {
    console.error("❌ OpenAI Error:", err);
    return "The message blurred… try again.";
  }
}

// ---------------------------------------------------------------------
// API ROUTE
// ---------------------------------------------------------------------
app.post("/api/prophecy", async (req, res) => {
  try {
    const memory = getUserSession(req);

    const prophecy = await generateProphecy(req.body, memory);

    return res.json({
      prophecy,
      aura: memory.lastAura,
    });
  } catch (err) {
    console.error("❌ Oracle Error:", err);
    return res.json({
      prophecy:
        "Something is shifting, but the message didn’t come through fully.",
    });
  }
});

app.get("/api/user-feedback", async (_req, res) => {
  try {
    const data = await readUserData();
    return res.json(data);
  } catch (err) {
    console.error("User feedback read error:", err);
    return res.status(500).json(USER_DATA_DEFAULT);
  }
});

app.post("/api/user-feedback", async (req, res) => {
  try {
    const { theme, reaction, primaryEmotion, tone, language } = req.body || {};
    if (!theme) {
      return res.status(400).json({ ok: false, error: "Missing theme" });
    }

    const normalizedTheme = String(theme).trim() || "general";
    const data = await readUserData();

    if (reaction === "love") {
      data.preferences[normalizedTheme] =
        (data.preferences[normalizedTheme] || 0) + 1;
    } else if (reaction === "dislike" || reaction === "avoid") {
      data.avoid[normalizedTheme] =
        (data.avoid[normalizedTheme] || 0) + 1;
    }

    updatePreferenceModel(data, reaction, {
      theme: normalizedTheme,
      primaryEmotion,
      tone,
      language,
    });

    await writeUserData(data);
    await updateInsightsForTheme(normalizedTheme);

    return res.json({ ok: true });
  } catch (err) {
    console.error("User feedback write error:", err);
    return res.status(500).json({ ok: false, error: "Unable to save feedback" });
  }
});

app.post("/api/user-insights", async (req, res) => {
  try {
    const { theme } = req.body || {};
    if (!theme) {
      return res.status(400).json({ ok: false, error: "Missing theme" });
    }
    await updateInsightsForTheme(String(theme).trim());
    return res.json({ ok: true });
  } catch (err) {
    console.error("Insights update error:", err);
    return res.status(500).json({ ok: false, error: "Unable to update insights" });
  }
});

app.post("/api/user-language", async (req, res) => {
  try {
    const { language } = req.body || {};
    if (!language) {
      return res.status(400).json({ ok: false, error: "Missing language" });
    }
    if (!["en", "es", "pt", "fr"].includes(language)) {
      return res.status(400).json({ ok: false, error: "Unsupported language" });
    }

    const data = await readUserData();
    data.language = language;
    await writeUserData(data);

    return res.json({ ok: true });
  } catch (err) {
    console.error("Language update error:", err);
    return res.status(500).json({ ok: false, error: "Unable to set language" });
  }
});

app.post("/api/user-geo", async (req, res) => {
  try {
    const { timeZone, region, source } = req.body || {};
    if (!region) {
      return res.status(400).json({ ok: false, error: "Missing region" });
    }
    const allowedRegions = [
      "americas",
      "europe",
      "asia",
      "africa",
      "oceania",
      "unknown",
    ];
    if (!allowedRegions.includes(region)) {
      return res.status(400).json({ ok: false, error: "Invalid region" });
    }

    const geo = {
      timeZone: typeof timeZone === "string" ? timeZone : null,
      region,
      source: source || "timezone",
    };

    const data = await readUserData();
    data.geo = geo;
    await writeUserData(data);

    return res.json({ ok: true });
  } catch (err) {
    console.error("Geo update error:", err);
    return res.status(500).json({ ok: false, error: "Unable to set geo" });
  }
});

// Serve index.html on the root route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

// Catch-all route for unmatched paths
app.get("*", (req, res) => {
  res.status(404).send("Not Found");
});

// ---------------------------------------------------------------------
// START SERVER
// ---------------------------------------------------------------------
const PORT = process.env.PORT || 8787;
app.listen(PORT, () => {
  console.log(`🔮 11Eleven Oracle running at http://localhost:${PORT}`);
});
