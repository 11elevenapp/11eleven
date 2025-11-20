const API_BASE = "https://one11eleven-backend.onrender.com";

const DEFAULT_GLOBAL = {
  themes: {},
  emotions: {},
  totalReadings: 0
};

export function loadGlobalStats() {
  try {
    return JSON.parse(localStorage.getItem("global_evolution")) || DEFAULT_GLOBAL;
  } catch (e) {
    return DEFAULT_GLOBAL;
  }
}

export function saveGlobalStats(stats) {
  localStorage.setItem("global_evolution", JSON.stringify(stats));
}

export function recordGlobal(theme, primaryEmotion) {
  const stats = loadGlobalStats();

  stats.themes[theme] = (stats.themes[theme] || 0) + 1;
  stats.emotions[primaryEmotion] = (stats.emotions[primaryEmotion] || 0) + 1;
  stats.totalReadings += 1;

  saveGlobalStats(stats);
}

export function getGlobalTrend() {
  const stats = loadGlobalStats();

  let dominantTheme = "neutral";
  let topThemeScore = 0;
  for (const t in stats.themes) {
    if (stats.themes[t] > topThemeScore) {
      dominantTheme = t;
      topThemeScore = stats.themes[t];
    }
  }

  let dominantEmotion = "neutral";
  let topEmotionScore = 0;
  for (const e in stats.emotions) {
    if (stats.emotions[e] > topEmotionScore) {
      dominantEmotion = e;
      topEmotionScore = stats.emotions[e];
    }
  }

  return {
    dominantTheme,
    dominantEmotion,
    weight: Math.min(stats.totalReadings, 1000) / 1000
  };
}
