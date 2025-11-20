import { pingServer } from "./js/ping.js";

// =============================================================
// 11Eleven — UI + Logic Script (Stable Non-Module Version)
// =============================================================

// DOM Elements
const revealBtn = document.getElementById("revealBtn");
const earlyBtn = document.getElementById("earlyBtn");
const deepBtn = document.getElementById("deepBtn");
const shareBtn = document.getElementById("shareBtn");
const closeBtn = document.getElementById("closeBtn");

const countdownEl = document.getElementById("countdown");
const portalStateEl = document.getElementById("portalState");
const modal = document.getElementById("modal");
const prophecyText = document.getElementById("prophecyText");
const auraEl = document.getElementById("aura");

let currentResult = null;
let lastProphecy = "";

// LocalStorage keys
const FREE_USED_KEY = "free_used_once";
const EARLY_UNLOCKED_KEY = "early_access_unlocked";
const EARLY_PROPHECY_KEY = "early_access_prophecy";
const DEEPER_UNLOCKED_KEY = "deeper_access_unlocked";
const DEEPER_PROPHECY_KEY = "deeper_access_prophecy";

const params = new URLSearchParams(window.location.search);

function updateProphecyView(result, auraMode) {
  if (!result) return;
  currentResult = result;
  lastProphecy = result.prophecy;
  prophecyText.textContent = result.prophecy;
  auraEl.style.background = Engine.getAuraGradient(result.aura, auraMode);
}

function getSavedProphecy(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function renderSavedProphecy(saved) {
  if (!saved) return;
  modal.classList.remove("hidden");
  updateProphecyView(saved, saved.mode || "base");
}

const storedEarly = localStorage.getItem(EARLY_UNLOCKED_KEY) === "true";
const storedDeep = localStorage.getItem(DEEPER_UNLOCKED_KEY) === "true";
const hasEarlyParam = params.get("access") === "granted";
const hasDeepParam = params.get("deeper") === "granted";

setInterval(pingServer, 60000); // ping every 60s to keep Render warm

if (!hasEarlyParam && !hasDeepParam) {
  if (storedEarly) {
    const saved = getSavedProphecy(EARLY_PROPHECY_KEY);
    if (saved) renderSavedProphecy(saved);
  }

  if (storedDeep) {
    const saved = getSavedProphecy(DEEPER_PROPHECY_KEY);
    if (saved) renderSavedProphecy(saved);
  }
}

// =============================================================
// COUNTDOWN TO 11:11 (AM + PM)
// =============================================================
function nextPortalTime(now = new Date()) {
  const h = now.getHours();
  const m = now.getMinutes();
  const target = new Date(now);

  if (h < 11 || (h === 11 && m < 11)) {
    target.setHours(11, 11, 0, 0);
  } else if (h < 23 || (h === 23 && m < 11)) {
    target.setHours(23, 11, 0, 0);
  } else {
    target.setDate(target.getDate() + 1);
    target.setHours(11, 11, 0, 0);
  }

  return target;
}

function isPortalOpen(now = new Date()) {
  const h = now.getHours();
  const m = now.getMinutes();
  return (
    (h === 11 && m === 11) ||
    (h === 23 && m === 11)
  ) && now.getSeconds() <= 119; // 2 minute window
}

function updateCountdown() {
  const now = new Date();

  if (isPortalOpen(now)) {
    portalStateEl.textContent = "open";
    revealBtn.disabled = false;
    revealBtn.textContent = "✨ Reveal My Aura";
    revealBtn.classList.add("glow");
    countdownEl.textContent = "The gate awaits";
    return;
  }

  portalStateEl.textContent = "closed";
  revealBtn.disabled = true;
  revealBtn.classList.remove("glow");
  revealBtn.textContent = "Wait for the portal";

  const target = nextPortalTime(now);
  const diffSeconds = Math.max(0, Math.floor((target - now) / 1000));
  const h = Math.floor(diffSeconds / 3600);
  const m = Math.floor((diffSeconds % 3600) / 60);
  const s = diffSeconds % 60;

  countdownEl.textContent = [h, m, s].map(n => String(n).padStart(2, "0")).join(":");
}

setInterval(updateCountdown, 1000);
updateCountdown();

// =============================================================
// STRIPE URLS
// =============================================================
const STRIPE_EARLY = "https://buy.stripe.com/28EcN7fE5dvPfKz32a8Ra01";
const STRIPE_DEEP = "https://buy.stripe.com/3cIfZj4Zr77r2XNdGO8Ra00";

// =============================================================
// MAIN FREE READING
// =============================================================
revealBtn.addEventListener("click", () => {
  modal.classList.remove("hidden");
  prophecyText.textContent = "🪬 Tuning to your energy…";

  setTimeout(async () => {
    const used = localStorage.getItem(FREE_USED_KEY) === "true";
    const kind = used ? "free_repeat" : "free_first";

    const result = await Engine.requestProphecy(kind);
    updateProphecyView(result, "base");

    if (!used) localStorage.setItem(FREE_USED_KEY, "true");
  }, 1500);
});

// =============================================================
// EARLY ACCESS
// =============================================================
earlyBtn.addEventListener("click", () => {
  Engine.registerAction("early");
  window.location.href = STRIPE_EARLY;
});

// STRIPE RETURN HANDLER
if (hasEarlyParam) {
  window.history.replaceState({}, document.title, window.location.pathname);

  const alreadyUnlocked = localStorage.getItem(EARLY_UNLOCKED_KEY) === "true";

  if (alreadyUnlocked) {
    const saved = getSavedProphecy(EARLY_PROPHECY_KEY);
    if (saved) {
      renderSavedProphecy(saved);
    } else {
      window.location.href = STRIPE_EARLY;
    }
  } else {
    setTimeout(async () => {
      modal.classList.remove("hidden");
      prophecyText.textContent = "✨ Your portal is open. Tuning to your energy…";

      const res = await Engine.requestProphecy("early_access");
      res.mode = "boosted";
      updateProphecyView(res, "boosted");
      localStorage.setItem(EARLY_UNLOCKED_KEY, "true");
      localStorage.setItem(EARLY_PROPHECY_KEY, JSON.stringify(res));
    }, 1500);
  }
}

// =============================================================
// DEEPER READING
// =============================================================
deepBtn.addEventListener("click", () => {
  Engine.registerAction("deeper");
  window.location.href = STRIPE_DEEP;
});

if (hasDeepParam) {
  window.history.replaceState({}, document.title, window.location.pathname);

  const alreadyUnlocked = localStorage.getItem(DEEPER_UNLOCKED_KEY) === "true";

  if (alreadyUnlocked) {
    const saved = getSavedProphecy(DEEPER_PROPHECY_KEY);
    if (saved) {
      renderSavedProphecy(saved);
    } else {
      window.location.href = STRIPE_DEEP;
    }
  } else {
    setTimeout(async () => {
      modal.classList.remove("hidden");
      prophecyText.textContent = "🌌 The veil parts further… tuning in.";

      const res = await Engine.requestProphecy("deeper_access");
      res.mode = "deep";
      updateProphecyView(res, "deep");
      localStorage.setItem(DEEPER_UNLOCKED_KEY, "true");
      localStorage.setItem(DEEPER_PROPHECY_KEY, JSON.stringify(res));
    }, 1500);
  }
}

// =============================================================
// SHARE BUTTON
// =============================================================
shareBtn.addEventListener("click", async () => {
  try {
    if (!currentResult || !lastProphecy) {
      alert("No prophecy available to share yet.");
      return;
    }

    // 1) Decide the "type" for card + theme
    const type =
      currentResult.portal_1111 ? "portal_1111" :
      currentResult.kind === "early_access" ? "early" :
      currentResult.kind === "deeper_access" ? "deep" :
      "free";

    // 2) Generate the PNG card (no download yet)
    const cardURL = await window.generateShareCard({
      prophecy: lastProphecy,
      type
    });

    if (!cardURL) {
      console.error("No card URL returned from generateShareCard");
      return;
    }

    // 3) Build caption + hashtags
    // theme/depth are up to you; this is a simple mapping:
    const depth =
      type === "portal_1111" ? "1111" :
      type === "deep" ? "deeper" :
      type;

    const theme = "clarity"; // or derive from currentResult.emotion.primary
    const hashtags = window.getShareHashtags
      ? window.getShareHashtags(theme, currentResult.language || "en", depth)
      : "";

    const caption = lastProphecy;

    // 4) Open the Share Modal with everything
    window.openShareModal({
      cardDataURL: cardURL,
      theme: type === "portal_1111"
        ? "portal_1111"
        : type === "early"
        ? "early"
        : type === "deep"
        ? "deeper"
        : "default",
      caption,
      hashtags,
      themeKey: currentResult?.themeKey || "general",
      primaryEmotion: currentResult?.emotion?.primary || "",
      tone: currentResult?.themeTone || "",
      language: currentResult?.language || "en"
    });

  } catch (err) {
    console.error("Share failed:", err);
    alert("Something went wrong creating your share card.");
  }
});


// =============================================================
// CLOSE MODAL
// =============================================================
closeBtn.addEventListener("click", () => {
  modal.classList.add("hidden");
});

window.clearPaid = function () {
  localStorage.removeItem(EARLY_UNLOCKED_KEY);
  localStorage.removeItem(EARLY_PROPHECY_KEY);
  localStorage.removeItem(DEEPER_UNLOCKED_KEY);
  localStorage.removeItem(DEEPER_PROPHECY_KEY);
  console.log("Paid state cleared.");
};
