(function () {
  const API_BASE = "https://one1eleven-backend.onrender.com";

  const LANGUAGE_HINTS = {
    es: {
      prefix: "✦",
      toneMap: {
        gentle: "suave",
        transformational: "transformadora",
        empowering: "empoderadora",
        awakening: "despertar",
        release: "liberadora",
        direction: "direccional",
        rebuilding: "reconstrucción",
        soothing: "calmante",
        activation: "activación"
      }
    },
    pt: {
      prefix: "✦",
      toneMap: {
        gentle: "suave",
        transformational: "transformadora",
        empowering: "fortalecedora",
        awakening: "despertar",
        release: "libertadora",
        direction: "rumo",
        rebuilding: "reconstrução",
        soothing: "acalmar",
        activation: "ativação"
      }
    },
    fr: {
      prefix: "✦",
      toneMap: {
        gentle: "douce",
        transformational: "transformation",
        empowering: "affirmée",
        awakening: "éveil",
        release: "libération",
        direction: "direction",
        rebuilding: "reconstruction",
        soothing: "apaisante",
        activation: "activation"
      }
    }
  };

  function mockTranslate(text, targetLanguage, context = {}) {
    const hint = LANGUAGE_HINTS[targetLanguage];
    if (!hint) return text;
    const toneWord = context.tone && hint.toneMap[context.tone]
      ? hint.toneMap[context.tone]
      : null;
    const toneSuffix = toneWord ? ` (${toneWord})` : "";
    return `${hint.prefix} ${text}${toneSuffix}`;
  }

  async function translateProphecy(text, targetLanguage, context = {}) {
    if (!text || typeof text !== "string") return "";
    if (!targetLanguage || targetLanguage === "en") return text;

    try {
      const translated = mockTranslate(text, targetLanguage, context);
      if (typeof translated !== "string" || translated.length > 450) {
        return text;
      }
      return translated;
    } catch (err) {
      console.error("translateProphecy fallback:", err);
      return text;
    }
  }

  window.translateProphecy = translateProphecy;
})();
