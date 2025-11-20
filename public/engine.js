import { resolveGeoContext } from "./js/geoContext.js";
import { recordGlobal, getGlobalTrend } from "./js/globalEvolution.js";

// =============================================================
// 11ELEVEN — Autonomous Oracle Engine v5.2-SL (Super-Light Cinematic Edition)
// =============================================================

window.Engine = window.Engine || {};

(function () {

    // =============================================================
    // LIGHTWEIGHT MEMORY / PREFS
    // =============================================================
    const STORAGE_KEYS = {
        profile: "oracle_profile_v5",
        streak: "oracle_streak_v1"
    };

    const defaultProfile = {
        dominantPersona: "Wanderer",
        courage: 0.5,
        tenderness: 0.5,
        release: 0.5,
        clarity: 0.5,
        totalReads: 0,
        lastUpdated: null
    };

    const defaultStreak = {
        count: 0,
        lastDate: null
    };

    function safeLoad(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            if (!raw) return { ...fallback };
            return { ...fallback, ...JSON.parse(raw) };
        } catch {
            return { ...fallback };
        }
    }

    function safeSave(key, val) {
        try {
            localStorage.setItem(key, JSON.stringify(val));
        } catch {}
    }

    function todayKey() {
        try {
            return new Date().toISOString().slice(0, 10);
        } catch {
            return null;
        }
    }

    const supportedLanguages = {
        en: "English",
        es: "Spanish",
        pt: "Portuguese",
        fr: "French"
    };

    const state = {
        profile: safeLoad(STORAGE_KEYS.profile, defaultProfile),
        streak: safeLoad(STORAGE_KEYS.streak, defaultStreak),
        lastEmotion: null,
        lastDifficulty: "soft",
        lastKind: null,
        lastWas1111: false
    };

    // =============================================================
    // Evolution Engine (localStorage-backed soft memory)
    // =============================================================
    const EVOLUTION_KEY = "11e_evolution_v1";

    function loadEvolutionState() {
        try {
            const raw = localStorage.getItem(EVOLUTION_KEY);
            if (!raw) {
                return {
                    lastPrimary: null,
                    lastTone: null,
                    recentThemes: [],
                    lastReset: Date.now(),
                };
            }
            const parsed = JSON.parse(raw);
            return {
                lastPrimary: parsed.lastPrimary ?? null,
                lastTone: parsed.lastTone ?? null,
                recentThemes: Array.isArray(parsed.recentThemes) ? parsed.recentThemes : [],
                lastReset: parsed.lastReset ?? Date.now(),
            };
        } catch (e) {
            return {
                lastPrimary: null,
                lastTone: null,
                recentThemes: [],
                lastReset: Date.now(),
            };
        }
    }

    function saveEvolutionState(stateObj) {
        try {
            localStorage.setItem(EVOLUTION_KEY, JSON.stringify(stateObj));
        } catch (e) {
            // fail silently
        }
    }

    function normalizeEvolutionState() {
        const stateObj = loadEvolutionState();
        const THIRTY_SIX_HOURS = 36 * 60 * 60 * 1000;
        if (Date.now() - stateObj.lastReset > THIRTY_SIX_HOURS) {
            stateObj.recentThemes = [];
            stateObj.lastReset = Date.now();
            saveEvolutionState(stateObj);
        }
        return stateObj;
    }

    // =============================================================
    // User Feedback cache (preferences / avoid)
    // =============================================================
    const DEFAULT_FEEDBACK_STATE = {
        preferences: {},
        avoid: {},
        last10Themes: [],
        insights: {
            dominantTheme: null,
            trend: null,
            emotionalTone: null,
            patternScore: 0
        },
        language: "en",
        geo: {
            timeZone: null,
            region: "unknown",
            source: "none"
        },
        preferencesModel: {
            byTheme: {},
            byEmotion: {},
            byTone: {},
            languages: [],
            lastLanguage: "en"
        }
    };

    let feedbackStateCache = null;
    let feedbackStatePromise = null;
    let autoLanguageChecked = false;
    let geoSynced = false;

    async function maybeAutoDetectLanguage(stateObj) {
        if (autoLanguageChecked) return stateObj;
        autoLanguageChecked = true;
        try {
            const browserLang = navigator.language
                ? navigator.language.split("-")[0]
                : null;
            if (
                browserLang &&
                supportedLanguages[browserLang] &&
                (stateObj.language === "en" || !stateObj.language)
            ) {
                await setLanguage(browserLang, { skipCacheReset: true });
                stateObj.language = browserLang;
            }
        } catch (err) {
            console.warn("Language auto-detect failed:", err);
        }
        return stateObj;
    }

    async function getFeedbackState() {
        if (feedbackStateCache) return feedbackStateCache;
        if (!feedbackStatePromise) {
            feedbackStatePromise = fetch("/api/user-feedback", {
                cache: "no-store"
            })
                .then((res) => {
                    if (!res.ok) throw new Error("feedback fetch failed");
                    return res.json();
                })
                .catch(() => ({ ...DEFAULT_FEEDBACK_STATE }))
                .then(async (data) => {
                    let merged = {
                        ...DEFAULT_FEEDBACK_STATE,
                        ...data,
                        insights: {
                            ...DEFAULT_FEEDBACK_STATE.insights,
                            ...(data?.insights || {})
                        }
                    };
                    merged.preferencesModel = {
                        ...DEFAULT_FEEDBACK_STATE.preferencesModel,
                        ...(data?.preferencesModel || {})
                    };
                    merged.preferencesModel.languages = Array.isArray(
                        merged.preferencesModel.languages
                    )
                        ? [...merged.preferencesModel.languages]
                        : [];
                    merged = await maybeAutoDetectLanguage(merged);
                    merged = await ensureGeoContext(merged);
                    feedbackStateCache = merged;
                    feedbackStatePromise = null;
                    return merged;
                });
        }
        return feedbackStatePromise;
    }

    async function ensureGeoContext(stateObj) {
        if (!stateObj) return stateObj;
        const previous = stateObj.geo || {
            timeZone: null,
            region: "unknown",
            source: "none"
        };
        const resolved = resolveGeoContext(previous);
        stateObj.geo = resolved;

        if (
            !geoSynced &&
            (previous.region !== resolved.region ||
                previous.timeZone !== resolved.timeZone ||
                previous.source !== resolved.source)
        ) {
            geoSynced = true;
            try {
                await fetch("/api/user-geo", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(resolved)
                });
            } catch (err) {
                console.warn("Geo sync failed:", err);
            }
        }

        return stateObj;
    }

    function invalidateFeedbackCache() {
        feedbackStateCache = null;
        feedbackStatePromise = null;
    }

    async function setLanguage(langCode, options = {}) {
        if (!supportedLanguages[langCode]) return false;
        try {
            const res = await fetch("/api/user-language", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ language: langCode })
            });
            if (!res.ok) throw new Error("Language update failed");
            if (feedbackStateCache) {
                feedbackStateCache.language = langCode;
            }
            if (!options.skipCacheReset) {
                invalidateFeedbackCache();
            }
            return true;
        } catch (err) {
            console.error("setLanguage error:", err);
            return false;
        }
    }

    // =============================================================
    // STREAKS
    // =============================================================
    function bumpStreak() {
        const today = todayKey();
        if (!today) return;

        if (state.streak.lastDate === today) return;

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yk = yesterday.toISOString().slice(0, 10);

        if (state.streak.lastDate === yk) {
            state.streak.count += 1;
        } else {
            state.streak.count = 1;
        }

        state.streak.lastDate = today;
        safeSave(STORAGE_KEYS.streak, state.streak);
    }

    // =============================================================
    // EMOTIONAL SCORING
    // =============================================================
    function analyzeEmotion(text) {
        const t = (text || "").toLowerCase();
        const scoring = { release: 0, courage: 0, tenderness: 0, clarity: 0 };

        function bump(words, field, weight = 1) {
            words.forEach(w => { if (t.includes(w)) scoring[field] += weight; });
        }

        bump(["let go", "no longer", "tired of"], "release");
        bump(["step forward", "risk", "brave"], "courage");
        bump(["gentle", "soft", "kind"], "tenderness");
        bump(["realize", "clarity", "understand", "see"], "clarity");

        const totalWords = t.split(" ").length;
        scoring.clarity += Math.min(totalWords / 24, 1) * 0.5;

        const max = Math.max(1, ...Object.values(scoring));
        const normalized = {};
        let primary = "release", best = 0;

        for (const k in scoring) {
            normalized[k] = +(scoring[k] / max).toFixed(3);
            if (normalized[k] > best) {
                best = normalized[k];
                primary = k;
            }
        }

        return { ...normalized, primary };
    }

    // =============================================================
    // PERSONA SHAPING
    // =============================================================
    function updatePersona(emotion) {
        if (!emotion) return;

        const p = state.profile;
        const blend = (a, b) => a * 0.7 + b * 0.3;

        p.release = blend(p.release, emotion.release);
        p.courage = blend(p.courage, emotion.courage);
        p.tenderness = blend(p.tenderness, emotion.tenderness);
        p.clarity = blend(p.clarity, emotion.clarity);

        let persona = "Wanderer";
        if (p.clarity >= p.courage && p.clarity >= p.tenderness && p.clarity >= p.release)
            persona = "Seer";
        else if (p.courage >= p.clarity && p.courage >= p.tenderness && p.courage >= p.release)
            persona = "Pathbreaker";
        else if (p.tenderness >= p.clarity && p.tenderness >= p.courage && p.tenderness >= p.release)
            persona = "Heartkeeper";
        else
            persona = "Alchemist";

        p.dominantPersona = persona;
        p.totalReads++;
        p.lastUpdated = new Date().toISOString();

        state.profile = p;
        safeSave(STORAGE_KEYS.profile, p);
    }

    // =============================================================
    // 11:11 CHECK
    // =============================================================
    function is11PortalNow() {
        const n = new Date();
        return n.getHours() === 11 && n.getMinutes() === 11;
    }

    // =============================================================
    // DYNAMIC DIFFICULTY
    // =============================================================
    function computeDifficulty(kind) {
        let lvl = "soft";
        const paid = kind === "early_access" || kind === "deeper_access";

        if (paid) lvl = "deep";
        if (state.streak.count >= 3 && paid) lvl = "intense";
        if (state.streak.count >= 5) lvl = "journey";

        state.lastDifficulty = lvl;
        return lvl;
    }

    // =============================================================
    // THEME PACKS v1 + NEW THEMES ADDED
    // =============================================================
    window.Engine.themePacks = {
        decision: { warm: [], direct: [] }, // kept for future
        release: { warm: [], direct: [] },

        // NEW THEMES (EQUAL PROBABILITY)
        worthiness: [
            "You’ve realized that ignoring your own needs only deepens your sense of disconnection, and honoring them could finally pave the way to feeling more like yourself.",
            "You've begun to see that the fear of failure has held you back more than the actual risk, and embracing your true desires could lead to a life that feels genuinely yours.",
            "You’ve come to see that it's okay to trust your feelings without needing every answer laid out in front of you.",
            "You’ve realized that it's okay to let go of the idea that you have to have everything figured out to take one small step forward.",
            "You’re starting to understand that your deepest longing for connection has often been hidden behind the fear of being truly seen.",
            "You’re slowly uncovering that the weight of pretending has made you forget what joy really feels like."
        ],

        boundaries: [
            "You've realized that the weight you carry isn’t yours to bear, and it’s okay to let go of what doesn’t belong to you.",
            "You’ve begun to feel that the need for approval from others has kept you from embracing your own voice and desires.",
            "You’re beginning to understand that your happiness has been sidelined by the expectations of others, and now you feel an urgent need to reclaim your own path."
        ],

        selfDiscovery: [
            "You’re beginning to see that the life you’ve built is not entirely yours, and deep down, you’re ready to chase what truly brings you joy.",
            "You’ve been pushing aside a longing for connection, knowing deep down that letting others in could bring you the support you crave.",
            "Trust that it's okay to feel uncertain; sometimes just allowing yourself to be in that space is where clarity begins to take shape."
        ]
    };

    // ALL THEMES FOR RANDOM PICK (Equal weighting)
    const ALL_THEME_KEYS = Object.keys(window.Engine.themePacks);
    const THEME_TONE_GROUPS = {
        warm: ["decision", "release", "worthiness", "selfDiscovery"],
        direct: ["release", "boundaries"]
    };
    const THEME_CATEGORY_MAP = {
        decision: "clarity",
        release: "release",
        worthiness: "self_worth",
        boundaries: "alignment",
        selfDiscovery: "intuition"
    };
    const TIME_WINDOW_BIAS = {
        morning: { tone: "warm", boostChance: 0.22 },
        afternoon: null,
        night: { tone: "direct", boostChance: 0.22 }
    };
    const DAY_VIBE_BIAS = {
        0: { themePool: ["worthiness", "decision"], boostChance: 0.2 }, // Sun
        1: { themePool: ["worthiness", "decision"], boostChance: 0.2 }, // Mon
        2: { tone: "direct", boostChance: 0.2 }, // Tue
        3: { tone: "warm", boostChance: 0.2 }, // Wed
        4: { themePool: ["selfDiscovery"], boostChance: 0.2 }, // Thu
        5: { themePool: ["release"], boostChance: 0.2 }, // Fri
        6: { themePool: ["boundaries", "release"], boostChance: 0.2 } // Sat
    };

    function pickTheme() {
        return ALL_THEME_KEYS[Math.floor(Math.random() * ALL_THEME_KEYS.length)];
    }

    function themeHasContent(key) {
        const pack = window.Engine.themePacks[key];
        if (!pack) return false;
        if (Array.isArray(pack)) {
            return pack.length > 0;
        }
        return Object.keys(pack).length > 0;
    }

    function applyTimeFrameBias(themeKey, windowLabel) {
        // Soft bias: nudge toward warm/direct pools without forcing the outcome.
        const cfg = TIME_WINDOW_BIAS[windowLabel];
        if (!cfg?.tone) return themeKey;

        const pool = (THEME_TONE_GROUPS[cfg.tone] || []).filter(themeHasContent);
        if (!pool.length || pool.includes(themeKey)) {
            return themeKey;
        }

        if (Math.random() < cfg.boostChance) {
            return pool[Math.floor(Math.random() * pool.length)] || themeKey;
        }

        return themeKey;
    }

    function applyDayVibeBias(themeKey, day) {
        // Day-of-week vibe: gentle 20% preference to aligned tone/theme.
        const cfg = DAY_VIBE_BIAS[day];
        if (!cfg) return themeKey;

        let pool = [];
        if (cfg.tone) {
            pool = (THEME_TONE_GROUPS[cfg.tone] || []).filter(themeHasContent);
        } else if (cfg.themePool) {
            pool = cfg.themePool.filter(themeHasContent);
        }

        if (!pool.length || pool.includes(themeKey)) {
            return themeKey;
        }

        if (Math.random() < (cfg.boostChance ?? 0.2)) {
            return pool[Math.floor(Math.random() * pool.length)] || themeKey;
        }

        return themeKey;
    }

    function mapThemeToCategory(themeKey) {
        return THEME_CATEGORY_MAP[themeKey] || "general";
    }

    function getToneMemberships(themeKey) {
        const tones = [];
        if (THEME_TONE_GROUPS.warm.includes(themeKey)) tones.push("warm");
        if (THEME_TONE_GROUPS.direct.includes(themeKey)) tones.push("direct");
        if (!tones.length) tones.push("neutral");
        return tones;
    }

    function detectToneForTheme(themeKey) {
        return getToneMemberships(themeKey)[0] || "neutral";
    }

    const THEME_EMOTION_PREF_MAP = {
        decision: "clarity",
        release: "release",
        worthiness: "tenderness",
        boundaries: "courage",
        selfDiscovery: "clarity"
    };

    function getPreferenceEmotionForTheme(themeKey) {
        return THEME_EMOTION_PREF_MAP[themeKey] || "clarity";
    }

    const TONE_THEME_MAP = {
        gentle: ["worthiness", "decision"],
        transformational: ["selfDiscovery", "decision"],
        empowering: ["boundaries"],
        awakening: ["decision"],
        release: ["release"],
        direction: ["decision", "release"],
        rebuilding: ["worthiness"],
        soothing: ["worthiness"],
        activation: ["boundaries", "direct"]
    };

    const TREND_THEME_MAP = {
        lifting: ["worthiness", "decision", "selfDiscovery"],
        descending: ["release", "boundaries"],
        balancing: ALL_THEME_KEYS
    };

    function geoFlavorForRegion(region) {
        switch (region) {
            case "americas":
                return "direct";
            case "europe":
                return "reflective";
            case "asia":
                return "gentle";
            case "africa":
                return "grounded";
            case "oceania":
                return "uplifting";
            default:
                return "neutral";
        }
    }

    const GEO_FLAVOR_THEME_MAP = {
        direct: ["boundaries", "release"],
        reflective: ["selfDiscovery", "decision"],
        gentle: ["worthiness", "selfDiscovery"],
        grounded: ["release", "decision"],
        uplifting: ["worthiness", "decision"],
        neutral: []
    };

    function computeFeedbackWeight(themeKey, feedbackState) {
        if (!feedbackState) return 1;
        const pref = feedbackState.preferences?.[themeKey] || 0;
        const avoid = feedbackState.avoid?.[themeKey] || 0;
        const prefBoost = Math.min(pref, 3) * 0.4;
        const avoidPenalty = Math.min(avoid, 3) * 0.6;
        const recents = feedbackState.last10Themes || [];
        const recentPenalty = recents.includes(themeKey) ? 0.2 : 0;
        let weight = 1 + prefBoost - avoidPenalty - recentPenalty;

        const tone = feedbackState.insights?.emotionalTone;
        if (tone && TONE_THEME_MAP[tone]?.includes(themeKey)) {
            weight += 0.3;
        }

        const trend = feedbackState.insights?.trend;
        if (trend) {
            const trendThemes = TREND_THEME_MAP[trend] || [];
            if (trendThemes.includes(themeKey)) {
                weight += 0.2;
            } else if (trend === "lifting" && trendThemes.length) {
                weight -= 0.1;
            } else if (trend === "descending" && trendThemes.length) {
                weight -= 0.1;
            }
        }

        if (
            feedbackState.insights?.patternScore > 50 &&
            feedbackState.insights?.dominantTheme === themeKey
        ) {
            weight -= 0.3;
        }

        const regionFlavor = geoFlavorForRegion(
            feedbackState.geo?.region || "unknown"
        );
        if (regionFlavor && GEO_FLAVOR_THEME_MAP[regionFlavor]) {
            if (GEO_FLAVOR_THEME_MAP[regionFlavor].includes(themeKey)) {
                weight += 0.15;
            }
        }

        return Math.max(0.3, weight);
    }

    function buildThemeCandidates(preferredKeys = [], feedbackState = null) {
        const allKeys = ALL_THEME_KEYS.filter(themeHasContent);
        const candidates = [];
        allKeys.forEach((primary) => {
            const tones = getToneMemberships(primary);
            const weightMultiplier = computeFeedbackWeight(primary, feedbackState);
            tones.forEach((tone) => {
                const baseEntry = {
                    primary,
                    tone,
                    primaryEmotion: getPreferenceEmotionForTheme(primary)
                };
                let duplicates = Math.max(1, Math.round(weightMultiplier));
                if (preferredKeys.includes(primary)) {
                    // Duplicate preferred entries to keep existing bias behavior.
                    duplicates += 1;
                }
                for (let i = 0; i < duplicates; i++) {
                    candidates.push({ ...baseEntry });
                }
            });
        });
        return candidates;
    }

    function scoreCandidateWithPreferences(candidate, model = {}) {
        if (!model) return 0;
        const themeScore = model.byTheme?.[candidate.primary]?.score || 0;
        const emotionScore =
            (model.byEmotion?.[candidate.primaryEmotion]?.score || 0) * 0.75;
        const toneScore =
            (model.byTone?.[candidate.tone]?.score || 0) * 0.5;
        return themeScore + emotionScore + toneScore;
    }

    /**
     * candidates: array of { primary: "decision" | "release" | ..., tone: "warm" | "direct" }
     * Returns one chosen candidate with gentle bias away from recently used themes.
     */
    function pickEvolvedTheme(candidates) {
        if (!Array.isArray(candidates) || !candidates.length) {
            return null;
        }

        const stateObj = normalizeEvolutionState();
        const recentSet = new Set(stateObj.recentThemes || []);
        const cooledDown = candidates.filter(
            (c) => !recentSet.has(`${c.primary}|${c.tone}`)
        );

        let chosen;
        if (cooledDown.length > 0) {
            // prefer non-recent options (slightly evolved)
            chosen = cooledDown[Math.floor(Math.random() * cooledDown.length)];
        } else {
            // if everything is "recent", fall back to normal randomness
            chosen = candidates[Math.floor(Math.random() * candidates.length)];
        }

        const key = `${chosen.primary}|${chosen.tone}`;
        const next = loadEvolutionState();
        next.lastPrimary = chosen.primary;
        next.lastTone = chosen.tone;
        const buffer = Array.isArray(next.recentThemes) ? next.recentThemes.slice() : [];
        buffer.push(key);
        while (buffer.length > 5) buffer.shift();
        next.recentThemes = buffer;
        if (!next.lastReset) next.lastReset = Date.now();
        saveEvolutionState(next);

        return chosen;
    }

    function getTimeWindowLabel(hour) {
        if (hour >= 5 && hour <= 11) return "morning";
        if (hour >= 12 && hour <= 17) return "afternoon";
        return "night";
    }

    function getRandomLocalInsight() {
        const theme = pickTheme();
        const lines = window.Engine.themePacks[theme];
        return lines[Math.floor(Math.random() * lines.length)];
    }

    // =============================================================
    // SUPER-LIGHT CINEMATIC SUFFIX (OPTION 2)
    // =============================================================
    const CINEMATIC_SUFFIXES = [
        "And something within you already sensed this all along.",
        "Though this is only the beginning.",
        "There’s a quiet shift happening beneath the surface.",
        "The next step is closer than you realize.",
        "This is where things start to change.",
        "A deeper truth is waiting just beyond this moment.",
        "There’s more unfolding than you can see right now."
    ];

    function maybeAddCinematicSuffix(text) {
        if (Math.random() < 0.06) {
            const s = CINEMATIC_SUFFIXES[Math.floor(Math.random() * CINEMATIC_SUFFIXES.length)];
            return text + " " + s;
        }
        return text;
    }

    function applyGlobalInfluence(text, global) {
        if (!global || global.weight <= 0.1) return text;
        const softenerMap = {
            fear: "There’s a collective heaviness in the air, and you might be feeling some of it.",
            clarity: "The world is shifting toward clarity — you’re aligning with that movement.",
            hope: "There’s a quiet rise of hope everywhere, and you’re part of that wave.",
            pressure: "A lot of people feel pressed lately — be gentle with yourself in this moment.",
            longing: "There’s a shared longing in many hearts right now, including yours.",
            release: "A global release is happening, slowly but noticeably.",
        };
        const softener = softenerMap[global.dominantEmotion] || "";
        if (!softener) return text;
        return `${softener} ${text}`;
    }

    // =============================================================
    // SUPER-LIGHT TIME-OF-DAY FLAVOR (SUFFIX SELECTION ONLY)
    // =============================================================
    function getTimeSuffixFlavor() {
        const h = new Date().getHours();

        if (h < 6) {
            return [
                "There’s a quiet stillness guiding you beneath the surface.",
                "Something gently stirs in the quiet of the night."
            ];
        }
        if (h < 12) {
            return [
                "A small clarity is beginning to take shape.",
                "You may notice subtle guidance emerging with the morning light."
            ];
        }
        if (h < 17) {
            return [
                "Your energy is aligning with movement and direction.",
                "Momentum is gathering beneath the choices you’re making."
            ];
        }
        return [
            "The evening brings softer truths you’re ready to acknowledge.",
            "Something within you is settling into understanding."
        ];
    }

    function maybeAddTimeFlavor(text) {
        if (Math.random() < 0.04) {
            const list = getTimeSuffixFlavor();
            return text + " " + list[Math.floor(Math.random() * list.length)];
        }
        return text;
    }

    // =============================================================
    // SERVER REQUEST HANDLER (the core logic)
    // =============================================================
    window.Engine.requestProphecy = async function (kind = "free") {

        bumpStreak();
        const difficulty = computeDifficulty(kind);
        const portal11 = is11PortalNow();

        state.lastKind = kind;
        state.lastWas1111 = portal11;
        // Evolution Engine hook + existing personalization layers
        const currentHour = new Date().getHours();
        const timeWindow = getTimeWindowLabel(currentHour);
        const baseTheme = pickTheme();
        const timeBiasedTheme = applyTimeFrameBias(baseTheme, timeWindow);
        // Day-of-week vibe layer
        const currentDay = new Date().getDay();
        const vibeTheme = applyDayVibeBias(timeBiasedTheme, currentDay);
        const feedbackState =
            (await getFeedbackState().catch(() => null)) ||
            { ...DEFAULT_FEEDBACK_STATE };
        const targetLanguage = feedbackState.language || "en";
        const geoContext = {
            timeZone: feedbackState.geo?.timeZone || null,
            region: feedbackState.geo?.region || "unknown",
            source: feedbackState.geo?.source || "none"
        };
        const insightsContext = {
            timeFrame: timeWindow,
            dayOfWeekVibe: currentDay,
            evolutionTag: feedbackState.insights?.dominantTheme || null,
            feedbackSignal: feedbackState.insights?.trend || "balancing",
            language: targetLanguage,
            geo: geoContext,
            global: getGlobalTrend()
        };
        const preferenceKeys = [timeBiasedTheme, vibeTheme].filter(Boolean);
        const candidates = buildThemeCandidates(preferenceKeys, feedbackState);
        const preferenceModel = feedbackState.preferencesModel || {};
        let bestCandidates = [];
        let bestPrefScore = -Infinity;
        candidates.forEach((cand) => {
            const score = scoreCandidateWithPreferences(cand, preferenceModel);
            if (score > bestPrefScore) {
                bestPrefScore = score;
                bestCandidates = [cand];
            } else if (score === bestPrefScore) {
                bestCandidates.push(cand);
            }
        });
        const candidatePool = bestCandidates.length ? bestCandidates : candidates;
        const evolvedChoice =
            pickEvolvedTheme(candidatePool) ||
            {
                primary: vibeTheme || timeBiasedTheme || baseTheme,
                tone: detectToneForTheme(vibeTheme || timeBiasedTheme || baseTheme),
                primaryEmotion: getPreferenceEmotionForTheme(
                    vibeTheme || timeBiasedTheme || baseTheme
                )
            };
        const finalThemeKey = evolvedChoice.primary;
        const targetCategory = mapThemeToCategory(finalThemeKey);

        // Call your backend
        let response;
        try {
            response = await fetch("http://localhost:8787/api/prophecy", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    kind,
                    difficulty,
                    streak: state.streak.count,
                    persona: state.profile.dominantPersona,
                    portal_1111: portal11,
                    targetCategory,
                    geoHint: geoContext.region,
                    geoContext,
                    language: targetLanguage,
                    insights: insightsContext
                })
            });
        } catch (err) {
            console.error("Engine.requestProphecy: network error", err);
            throw err;
        }

        const data = await response.json();
        const baseText = data?.prophecy || "";

        const emotion = analyzeEmotion(baseText);
        state.lastEmotion = emotion;
        updatePersona(emotion);

        try {
            await fetch("/api/user-insights", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ theme: finalThemeKey })
            });
            invalidateFeedbackCache();
        } catch {}
        recordGlobal(finalThemeKey, emotion?.primary || "neutral");

        // 11:11 polish (keep your existing format)
        let finalText = baseText;
        if (portal11) {
            finalText = `✨ 11:11 ✨ ${finalText}`;
        }

        // Cinematic suffix (VERY LIGHT)
        finalText = maybeAddCinematicSuffix(finalText);

        // Time-of-day suffix (VERY LIGHT)
        finalText = maybeAddTimeFlavor(finalText);
        finalText = applyGlobalInfluence(finalText, insightsContext.global);

        const translator =
            (typeof window !== "undefined" && window.translateProphecy) ||
            (async (text) => text);
        try {
            const translated = await translator(finalText, targetLanguage, {
                theme: finalThemeKey,
                tone:
                    feedbackState?.insights?.emotionalTone ||
                    emotion?.primary ||
                    null,
                trend: feedbackState?.insights?.trend || "balancing",
            });
            if (
                typeof translated === "string" &&
                translated.trim() &&
                translated.length <= 450
            ) {
                finalText = translated;
            }
        } catch (err) {
            console.warn("Translation fallback:", err);
        }

        return {
            ...data,
            prophecy: finalText,
            emotion,
            difficulty,
            streak: state.streak.count,
            persona: state.profile.dominantPersona,
            portal_1111: portal11,
            kind,
            themeKey: finalThemeKey,
            themeTone: evolvedChoice.tone,
            language: targetLanguage
        };
    };

    // =============================================================
    // LOG ACTIONS
    // =============================================================
    window.Engine.registerAction = function (type) {
        try {
            const payload = {
                type,
                at: new Date().toISOString(),
                streak: state.streak.count,
                persona: state.profile.dominantPersona
            };
            localStorage.setItem("last_action", JSON.stringify(payload));
        } catch {}
    };

    // =============================================================
    // AURA COLOR ENGINE (CSS-driven)
    // =============================================================
    window.Engine.getAuraGradient = function () {
        return "";
    };

    window.Engine.invalidateFeedbackCache = invalidateFeedbackCache;
    window.Engine.setLanguage = setLanguage;
    window.Engine.supportedLanguages = supportedLanguages;
    getFeedbackState().catch(() => {});

})();
