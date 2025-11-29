import OpenAI from "openai";
import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CARDS_DIR = path.join(__dirname, "..", "public", "cards");
if (!fs.existsSync(CARDS_DIR)) {
  fs.mkdirSync(CARDS_DIR, { recursive: true });
}

function promptForKind(kind) {
  if (kind === "deep") {
    return `You are The Oracle of 11Eleven.

Write ONE sentence that feels like a deeper emotional realization.
Be clear, grounded, and human. Avoid mystical language or clichés.
Tone: bold, honest, specific. Output exactly one sentence.`;
  }

  if (kind === "1111") {
    return `You are The Oracle of 11Eleven.

Write ONE sentence as a timely 11:11 insight with a sense of clarity and alignment.
Stay grounded, human, and avoid mystical clichés.
Keep it concise and emotionally honest. One sentence only.`;
  }

  // Default: early access
  return `You are The Oracle of 11Eleven.

Write ONE sentence that gives an early, clear insight.
Be warm, grounded, and avoid mystical clichés.
Keep it concise and human. One sentence only.`;
}

async function generateImage(prompt) {
  // Create a solid parchment background (local only)
  const buffer = await sharp({
    create: {
      width: 1024,
      height: 1024,
      channels: 3,
      background: "#f7f2e9", // lighter warm parchment
    },
  })
    .png()
    .toBuffer();

  return buffer;
}

function wrapText(text, maxChars = 32) {
  const words = text.split(" ");
  const lines = [];
  let current = "";

  for (const word of words) {
    if ((current + " " + word).trim().length > maxChars) {
      lines.push(current.trim());
      current = word;
    } else {
      current += " " + word;
    }
  }
  lines.push(current.trim());
  return lines;
}

async function composeProphecyCard(prophecyText, backgroundBuffer, kind) {
  const cardName = `${kind}-${Date.now()}.png`;
  const filePath = path.join(CARDS_DIR, cardName);

  // Clean + wrap text for square layout
  const safeText = prophecyText.replace(/&/g, "&amp;");
  const lines = wrapText(safeText, 32);

  let tspans = "";
  lines.forEach((line, i) => {
    // 52px line height for nice breathing room
    tspans += `<tspan x="512" dy="${i === 0 ? 0 : 52}">${line}</tspan>`;
  });

  // Calculate true text block height
  const lineHeight = 52;
  const textBlockHeight = lines.length * lineHeight;

  // Compute perfect vertical centering inside inner frame
  const frameTop = 72;
  const frameHeight = 880;
  const textStartY = frameTop + frameHeight / 2 - textBlockHeight / 2 + 80;

  // SVG overlay: inner frame + text (book-page style)
  const svg = `
    <svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">

      <!-- Inner rounded frame -->
      <rect
        x="72" y="72"
        width="880" height="880"
        rx="40" ry="40"
        fill="none"
        stroke="#111111"
        stroke-width="1"
      />

      <!-- Prophecy text block -->
      <text
        x="512"
        y="${textStartY}"
        fill="#111111"
        font-size="40"
        font-family="Merriweather, Georgia, 'Times New Roman', serif"
        text-anchor="middle"
        style="font-weight:400; line-height:1.4;"
      >
        ${tspans}
      </text>
    </svg>
  `;

  const svgBuffer = Buffer.from(svg);

  // Base parchment background (square)
  const base = sharp(
    backgroundBuffer || {
      create: {
        width: 1024,
        height: 1024,
        channels: 3,
        background: "#f7f2e9",
      },
    }
  );

  // Path to logo (black on transparent), to be resized smaller
  const logoPath = path.join(__dirname, "..", "public", "logo-card.png");

  // Resize logo and get actual dimensions for perfect centering
  const resizedLogo = sharp(logoPath)
    .trim()              // REMOVE TRANSPARENT PADDING
    .resize({
      width: 120,
      fit: "inside",
    });

  const { width: logoW } = await resizedLogo.metadata();
  const logoBuffer = await resizedLogo.toBuffer();

  await base
    .composite([
      // Frame + text
      { input: svgBuffer, left: 0, top: 0 },

      // Logo top-center, slightly under top frame
      {
        input: logoBuffer,
        top: 200,
        left: 452,
        blend: "over",
      },
    ])
    .png()
    .toFile(filePath);

  return `/cards/${cardName}`;
}

// ------------------------------------------------------
// CAPTION VARIANTS – Hybrid Style (Short, Medium, Long)
// ------------------------------------------------------
function generateCaptionVariants(prophecyText) {
  return {
    short: `At 11:11 — ${prophecyText.split(" ").slice(0, 8).join(" ")}... ✨`,
    medium: `At 11:11, pause for a moment.\n${prophecyText}`,
    long: `At 11:11, something inside you pays attention.\n\n${prophecyText}\n\nTake a breath. Let it land.`,
  };
}

// ------------------------------------------------------
// ROTATING CTA OPTIONS
// ------------------------------------------------------
const CTA_OPTIONS = [
  "🔮 Discover your message → 11Eleven.app (link in bio)",
  "✨ Curious what YOUR aura says? 11Eleven.app",
  "👁 Check your prophecy today → 11Eleven.app",
  "🧬 Free daily messages → 11Eleven.app",
  "🌙 Your alignment starts here → 11Eleven.app",
];

// ------------------------------------------------------
// 10 ROTATING HASHTAG SETS
// ------------------------------------------------------
const HASHTAG_SETS = [
  "#1111 #1111meaning #alignment #synchronicity #guidance #spirituality",
  "#innerwork #healingjourney #selfworth #awakening #1111messages",
  "#manifestation #energyshift #intuitiveliving #dailymotivation",
  "#highvibes #soulpath #1111sign #innerhealing #purpose",
  "#awareness #consciousliving #1111message #raiseyourvibration",
  "#mindsetshift #trustyourpath #spiritualgrowth #universehasyourback",
  "#1111portal #affirmationoftheday #1111energy",
  "#spirituallesson #1111today #newbeginnings",
  "#synchronicities #intuitiondevelopment #prophecy",
  "#1111signs #1111community #1111awakening",
];

// ------------------------------------------------------
// RANDOM PICKERS
// ------------------------------------------------------
function pickRandomCTA() {
  return CTA_OPTIONS[Math.floor(Math.random() * CTA_OPTIONS.length)];
}

function pickRandomHashtags() {
  return HASHTAG_SETS[Math.floor(Math.random() * HASHTAG_SETS.length)];
}

export async function generateProphecyCard(kind = "early") {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      prophecyText: "Missing API key.",
      prophecy: "Missing API key.",
      type: "free",
      imageUrl: null,
      cardUrl: null,
    };
  }

  const openai = new OpenAI({ apiKey });
  const prompt = promptForKind(kind);

  try {
    const completion = await openai.responses.create({
      model: "gpt-5.1",
      input: prompt,
    });

    const prophecyText =
      completion.output_text?.trim() ||
      completion.response_text?.trim() ||
      completion?.data?.[0]?.text?.trim() ||
      "The signal wavered—try again.";

    const backgroundBuffer = await generateImage("11Eleven editorial square background");
    const cardUrl = await composeProphecyCard(prophecyText, backgroundBuffer, kind);
    const finalText = prophecyText;
    const TYPE_MAP = {
      free: "free",
      early_access: "early",
      deep_insight: "deep",
      portal_1111: "portal_1111"
    };
    const type = TYPE_MAP[kind] || "free";

    const captions = generateCaptionVariants(prophecyText);
    const cta = pickRandomCTA();
    const hashtags = pickRandomHashtags();

    return {
      prophecyText: finalText,
      prophecy: finalText,
      type,
      cardUrl,
      captions,   // short, medium, long
      cta,        // random CTA
      hashtags,   // random hashtag set
    };
  } catch (err) {
    console.error("Creator prophecy error:", err);
    return {
      prophecyText: "The message blurred… try again.",
      prophecy: "The message blurred… try again.",
      type: "free",
      imageUrl: null,
      cardUrl: null,
    };
  }
}
