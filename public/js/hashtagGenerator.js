(function () {
  const API_BASE = "https://one11eleven-backend.onrender.com";

  const MIN_TOTAL = 8;
  const MAX_TOTAL = 14;

  const BRANDED_TAGS = ["#1111oracle", "#11elevenapp", "#11eleven"];

  const DEPTH_TAGS = {
    free: "#dailyprophecy",
    early: "#earlyaccess",
    deeper: "#deeperinsight",
    "1111": "#portal1111"
  };

  const COMPETITOR_TAGS = [
    "#astrologyvibes",
    "#spiritualjourney",
    "#universemessages",
    "#energyreading",
    "#1111meaning",
    "#awakeningjourney",
    "#selfhealing",
    "#innerwork",
    "#emotionalgrowth"
  ];

  const THEME_POOLS = {
    clarity: [
      "#clarityshift",
      "#innerclarity",
      "#selfinquiry",
      "#mindfulvision",
      "#sacredclarity",
      "#selfreflection",
      "#alignedthoughts",
      "#awakeningclarity"
    ],
    worthiness: [
      "#selfworth",
      "#boundariesintact",
      "#innerdignity",
      "#choosingmyself",
      "#unshakenworth",
      "#standinyourpower",
      "#sovereignsoul",
      "#selfrespect"
    ],
    release: [
      "#letgo",
      "#releaseandrise",
      "#energeticreset",
      "#softrelease",
      "#shedtheold",
      "#clearingseason",
      "#unburden",
      "#gentleunraveling"
    ],
    connection: [
      "#opensoul",
      "#tenderconnection",
      "#heartuncovered",
      "#vulnerableisbrave",
      "#authenticbond",
      "#soulconnection",
      "#shareyourlight",
      "#honestheart"
    ],
    intuition: [
      "#1111guidance",
      "#trustthesigns",
      "#intuitivetruth",
      "#innersignal",
      "#divineprompt",
      "#cosmicnudge",
      "#portalwhispers",
      "#inneroracle"
    ]
  };

  const THEME_ALIASES = {
    clarity: "clarity",
    "self-discovery": "clarity",
    selfdiscovery: "clarity",
    "self worth": "worthiness",
    selfworth: "worthiness",
    worthiness: "worthiness",
    boundaries: "worthiness",
    release: "release",
    "letting go": "release",
    lettinggo: "release",
    connection: "connection",
    vulnerability: "connection",
    vulnerable: "connection",
    intuition: "intuition",
    guidance: "intuition",
    "11:11": "intuition",
    "1111": "intuition"
  };

  const LANGUAGE_TAGS = {
    es: ["#sanacion", "#energia", "#intuicion", "#caminodelalma"]
  };

  const FALLBACK_TAGS = [
    "#energyshift",
    "#soulupdate",
    "#cosmicclarity",
    "#emotionalalchemy"
  ];

  function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function pickRandom(list, count) {
    const pool = [...list];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, Math.min(count, pool.length));
  }

  function normalizeTheme(theme) {
    if (!theme) return "clarity";
    const key = theme.toLowerCase().trim();
    return THEME_ALIASES[key] || "clarity";
  }

  function getLanguageTags(language, remainingSlots) {
    const langKey = (language || "en").toLowerCase();
    if (langKey !== "es") return [];
    const pool = LANGUAGE_TAGS.es;
    const count = Math.max(1, Math.min(pool.length, remainingSlots, 3));
    return pickRandom(pool, count);
  }

  function buildHashtagList({ theme, language = "en", depth = "free" } = {}) {
    const normalizedTheme = normalizeTheme(theme);
    const themePool = THEME_POOLS[normalizedTheme] || THEME_POOLS.clarity;

    const tags = [];
    tags.push(...BRANDED_TAGS);

    const depthTag = DEPTH_TAGS[depth] || DEPTH_TAGS.free;
    if (depthTag) tags.push(depthTag);

    const remainingSlotsForLang = MAX_TOTAL - tags.length - 6; // reserve for theme + competitor
    if (remainingSlotsForLang > 0) {
      tags.push(...getLanguageTags(language, remainingSlotsForLang));
    }

    const themeCount = randomInt(4, 8);
    tags.push(...pickRandom(themePool, themeCount));

    const competitorCount = randomInt(2, 3);
    tags.push(...pickRandom(COMPETITOR_TAGS, competitorCount));

    let unique = [];
    const seen = new Set();
    for (const tag of tags) {
      if (!tag || seen.has(tag)) continue;
      seen.add(tag);
      unique.push(tag);
    }

    if (unique.length > MAX_TOTAL) {
      unique = unique.slice(0, MAX_TOTAL);
    }

    while (unique.length < MIN_TOTAL) {
      const filler = pickRandom(FALLBACK_TAGS, 1)[0];
      if (!seen.has(filler)) {
        unique.push(filler);
        seen.add(filler);
      } else {
        break;
      }
    }

    return unique;
  }

  function generateHashtags(options = {}) {
    const hashtags = buildHashtagList(options);
    return hashtags.join(" ");
  }

  window.HashtagGenerator = window.HashtagGenerator || {};
  window.HashtagGenerator.generateHashtags = generateHashtags;

  // Example usage snippet (for generateShareCard)
  window.getShareHashtags = function (theme, lang, depth) {
    return window.HashtagGenerator.generateHashtags({
      theme,
      language: lang || "en",
      depth: depth || "free"
    });
  };
})();
