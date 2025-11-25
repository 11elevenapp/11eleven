const generateShareCard = window.generateShareCard;

(function () {
  const API_BASE = "https://one1eleven-backend.onrender.com";

  // 🔥 Ensure modal overlay exists in the DOM
  (function initShareModal() {
    if (!document.getElementById("share-modal-overlay")) {
      const overlay = document.createElement("div");
      overlay.id = "share-modal-overlay";
      overlay.className = "share-modal-overlay hidden";
      document.body.appendChild(overlay);
    }
  })();

  const OVERLAY_ID = "share-modal-overlay";

  function ensureDOM() {
    let overlay = document.getElementById(OVERLAY_ID);

    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = OVERLAY_ID;
      overlay.className = "share-modal-overlay";
      document.body.appendChild(overlay);
    } else {
      overlay.classList.remove("hidden");
      if (!overlay.classList.contains("share-modal-overlay")) {
        overlay.classList.add("share-modal-overlay");
      }
    }

    if (!overlay.querySelector(".share-modal-container")) {
      overlay.innerHTML = `
        <div class="share-modal-container" role="dialog" aria-modal="true">
          <button class="share-modal-close" aria-label="Close Share Modal">&times;</button>
          <div class="share-modal-card-preview">
            <img id="sharePreview" alt="Share preview" />
          </div>
          <textarea class="share-modal-caption" readonly></textarea>
          <div class="share-modal-feedback">
            <button class="share-modal-feedback-btn" data-reaction="love">❤️ Resonates</button>
            <button class="share-modal-feedback-btn" data-reaction="neutral">😐 Neutral</button>
            <button class="share-modal-feedback-btn" data-reaction="dislike">💔 Not for me</button>
          </div>
          <div class="share-modal-actions">
            <button class="share-modal-copy">Copy Caption</button>
          </div>
          <div class="share-modal-main-buttons">
            <button id="saveGalleryBtn" class="share-modal-btn share-modal-save">Save to Gallery</button>
          </div>
          <button class="share-modal-close-btn">Close</button>
        </div>
      `;

      overlay.addEventListener("click", (evt) => {
        if (evt.target === overlay) {
          closeModal();
        }
      });

      overlay.querySelector(".share-modal-close").addEventListener("click", closeModal);
      overlay.querySelector(".share-modal-close-btn").addEventListener("click", closeModal);

      overlay.querySelector(".share-modal-copy").addEventListener("click", async () => {
        const textarea = overlay.querySelector(".share-modal-caption");
        if (!textarea) return;
        const copied = await copyCaptionFromTextarea(textarea);
        if (copied) {
          textarea.classList.add("copied");
          setTimeout(() => textarea.classList.remove("copied"), 800);
        }
      });

      const saveBtn = overlay.querySelector(".share-modal-save");
      if (saveBtn && !saveBtn.dataset.boundSaveHandler) {
        saveBtn.dataset.boundSaveHandler = "true";
        // SAVE TO GALLERY (Native browser image download)
        document.getElementById("saveGalleryBtn").onclick = async () => {
          try {
            const base64 = window.generatedCardBase64;
            if (!base64) {
              alert("Card not generated yet.");
              return;
            }

            const link = document.createElement("a");
            link.href = base64;
            link.download = "prophecy-card.png";
            document.body.appendChild(link);
            link.click();
            link.remove();
          } catch (err) {
            console.error(err);
            alert("Could not save image.");
          }
        };
      }

      overlay.querySelectorAll(".share-modal-feedback-btn").forEach((btn) => {
        btn.addEventListener("click", () =>
          handleFeedbackReaction(overlay, btn)
        );
      });
    }

    return overlay;
  }

  // 🔥 Always generate share card BEFORE preview appears
  async function regenerateSharePreview() {
    try {
      const prophecyText = window.lastProphecyText || window.currentProphecy;
      const cardType = window.lastProphecyType || window.currentCardType || "free";

      // generate card
      const { url: base64 } = await generateShareCard({
        prophecy: prophecyText,
        type: cardType
      });

      if (!base64) {
        console.error("Failed to generate card preview.");
        return;
      }

      // save to session for redirect
      window.generatedCardBase64 = base64;
      const container = document.querySelector(".share-modal-container");
      if (container) container.dataset.cardUrl = base64;

      // update modal preview
      const preview = document.getElementById("sharePreview");
      if (preview) preview.src = base64;

    } catch (err) {
      console.error("Error regenerating preview:", err);
    }
  }

  function closeModal() {
    const overlay = document.getElementById(OVERLAY_ID);
    if (overlay) {
      overlay.classList.remove("visible");
    }
  }

  function populateModal(overlay, { cardDataURL, theme, caption, hashtags, themeKey, primaryEmotion, tone, language, cardType }) {
    const container = overlay.querySelector(".share-modal-container");
    const img = container.querySelector("img");
    const textarea = container.querySelector(".share-modal-caption");

    if (img) {
      img.src = cardDataURL || "";
    }

    const resolvedCaption = typeof caption === "string" ? caption : (window.currentCaption || "");
    const resolvedHashtags = typeof hashtags === "string" ? hashtags : (window.currentHashtags || "");

    const captionText = [resolvedCaption || "", resolvedHashtags || ""]
      .map((part) => part.trim())
      .filter(Boolean)
      .join("\n\n");

    const finalCaption = captionText || window.currentCaption || "";

    textarea.value = finalCaption;

    const resolvedCardType = cardType || theme || "free";

    container.dataset.cardUrl = cardDataURL || "";
    container.dataset.caption = finalCaption || "";
    container.dataset.theme = theme || "default";
    container.dataset.cardType = resolvedCardType === "default" ? "free" : resolvedCardType;
    container.dataset.themeKey = themeKey || "";
    container.dataset.primaryEmotion = primaryEmotion || "";
    container.dataset.toneKey = tone || "";
    container.dataset.lang = language || "en";
  }

  function openModal(options = {}) {
    const overlay = ensureDOM();
    populateModal(overlay, options);
    overlay.classList.add("visible");
    // 🔥 Force preview generation on modal open
    regenerateSharePreview();
  }

  async function copyCaptionFromTextarea(textarea) {
    if (!textarea) return false;
    const text = textarea.value || "";
    if (!text) return false;

    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch {}
    }

    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, text.length);
    return document.execCommand("copy");
  }

  async function handleFeedbackReaction(overlay, button) {
    const reaction = button?.dataset?.reaction;
    const container = overlay.querySelector(".share-modal-container");
    const themeKey = container?.dataset?.themeKey;
    const primaryEmotion = container?.dataset?.primaryEmotion;
    const toneKey = container?.dataset?.toneKey;
    const language = container?.dataset?.lang || "en";
    if (!reaction) {
      alert("Reaction failed: missing reaction type.");
      return;
    }
    if (!themeKey) {
      // Fallback so feedback still sends
      console.warn("⚠ No themeKey found, sending neutral theme.");
    }

    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = "Sending…";

    try {
      const res = await fetch(`${API_BASE}/api/user-feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reaction,
          theme: themeKey,
          primaryEmotion,
          tone: toneKey,
          language,
        }),
      });
      if (!res.ok) throw new Error("Feedback save failed");
      if (window.Engine?.invalidateFeedbackCache) {
        window.Engine.invalidateFeedbackCache();
      }
      button.textContent = "Noted ✓";
    } catch (err) {
      console.error("Feedback error:", err);
      button.textContent = "Try again";
    } finally {
      setTimeout(() => {
        button.disabled = false;
        button.textContent = originalText;
      }, 1200);
    }
  }

  window.ShareModal = window.ShareModal || {};
  window.ShareModal.open = openModal;
  window.ShareModal.close = closeModal;

  window.openShareModal = function (options = {}) {
    const prophecyEl = document.getElementById("prophecyText");
    const renderedProphecy = window.lastProphecyText || (prophecyEl?.textContent
      ? prophecyEl.textContent.trim()
      : "");

    const prophecyFromOptions = typeof options.caption === "string"
      ? options.caption.trim()
      : "";

    const finalProphecy = renderedProphecy || prophecyFromOptions;

    if (finalProphecy) {
      window.currentProphecy = finalProphecy;
    }
    window.currentCardType = options.cardType || window.lastProphecyType || window.currentCardType || "free";

    return window.ShareModal.open(options);
  };

  window.closeShareModal = function () {
    return window.ShareModal.close();
  };
})();
