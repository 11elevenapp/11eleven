// ============================================================
// SHARE CARD MODULE (No imports, browser-friendly)
// Exposes: window.generateShareCard()
// ============================================================

// ---- CONSTANTS ----
const SHARE_CARD_ID           = "shareCard";
const SHARE_CARD_TEXT_ID      = "shareProphecyText";
const SHARE_CARD_LOGO_ID      = "shareLogo";
const SHARE_CARD_BRAND_ID     = "shareBranding";

// ---- TEMPLATE CLASS MAP ----
const TEMPLATE_CLASS = {
    free:        "goldfoil-card",
    early:       "hybrid-card",
    deep:        "aura-card",
    portal_1111: "goldfoil-card"
};

// ---- CLEANER ----
function resetCardClasses(el) {
    el.classList.remove("goldfoil-card", "hybrid-card", "aura-card");
}

// ---- MAIN BUILDER ----
function buildAndExport({ prophecy, type }) {
    return new Promise(async (resolve, reject) => {
        try {
            const card = document.getElementById(SHARE_CARD_ID);
            const text = document.getElementById(SHARE_CARD_TEXT_ID);
            const logo = document.getElementById(SHARE_CARD_LOGO_ID);
            const brand = document.getElementById(SHARE_CARD_BRAND_ID);

            if (!card || !text) {
                return reject("Share card DOM missing");
            }

            // Reset previous classes
            resetCardClasses(card);

            // Sanitize type
            const finalType = TEMPLATE_CLASS[type] ? type : "free";

            // Apply template
            card.classList.add(TEMPLATE_CLASS[finalType]);

            // Inject text
            text.textContent = prophecy;

            // Logo (already handled by CSS)
            logo.style.display = "block";

            // Branding footer
            brand.textContent = "@11ELEVENAPP · 11ELEVEN.APP";

            // Position card offscreen so it's not visible
            card.style.display = "flex";
            card.style.position = "fixed";
            card.style.left = "-9999px";
            card.style.top = "0px";

            // ---- Render to PNG ----
            const canvas = await html2canvas(card, {
                backgroundColor: null,
                scale: 2
            });

            const pngUrl = canvas.toDataURL("image/png");

            // Restore invisibility
            card.style.display = "none";

            resolve(pngUrl);

        } catch (err) {
            console.error("Share card error:", err);
            reject(err);
        }
    });
}

// ---- PUBLIC API ----
window.generateShareCard = async function (payload) {
    try {
        if (!payload || !payload.prophecy) {
            alert("Cannot generate share card: Missing prophecy.");
            return null;
        }

        const type = payload.type || "free";

        const imgURL = await buildAndExport({
            prophecy: payload.prophecy,
            type: type
        });

        // ❌ no auto-download here
        // ✅ return PNG URL so script.js can use it in the modal
        return imgURL;

    } catch (err) {
        console.error("Final card export failed:", err);
        alert("Something went wrong creating your share card.");
        return null;
    }
};

// Expose globally (used by external-action handler)
window.generateAndShareCard = window.generateAndShareCard || window.generateShareCard;
