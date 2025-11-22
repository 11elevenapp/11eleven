(function () {
  const API_BASE = "https://one1eleven-backend.onrender.com";

  function redirectToExternal(action) {
    const target = `https://11eleven.app/?do=${action}`;

    if (/Android/i.test(navigator.userAgent)) {
      window.location.href =
        `intent://${target.replace('https://', '')}#Intent;scheme=https;package=com.android.chrome;end`;
    } else {
      window.open(target, '_blank');
    }
  }

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
            <img alt="Share preview" />
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
            <button class="share-modal-btn share-modal-share">Share</button>
            <button class="share-modal-btn share-modal-save">Save to Gallery</button>
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

      const shareBtn = overlay.querySelector(".share-modal-share");
      if (shareBtn) {
        shareBtn.addEventListener("click", () => handleShare(overlay, shareBtn));
      }

      const saveBtn = overlay.querySelector(".share-modal-save");
      if (saveBtn) {
        saveBtn.addEventListener("click", () => handleSave(overlay, saveBtn));
      }

      overlay.querySelectorAll(".share-modal-feedback-btn").forEach((btn) => {
        btn.addEventListener("click", () =>
          handleFeedbackReaction(overlay, btn)
        );
      });
    }

    return overlay;
  }

  function closeModal() {
    const overlay = document.getElementById(OVERLAY_ID);
    if (overlay) {
      overlay.classList.remove("visible");
    }
  }

  function populateModal(overlay, { cardDataURL, theme, caption, hashtags, themeKey, primaryEmotion, tone, language }) {
    const container = overlay.querySelector(".share-modal-container");
    const img = container.querySelector("img");
    const textarea = container.querySelector(".share-modal-caption");

    if (cardDataURL && img) {
      img.src = cardDataURL;
    }

    const captionText = [caption || "", hashtags || ""]
      .map((part) => part.trim())
      .filter(Boolean)
      .join("\n\n");

    textarea.value = captionText;

    container.dataset.cardUrl = cardDataURL || "";
    container.dataset.caption = captionText || "";
    container.dataset.theme = theme || "default";
    container.dataset.themeKey = themeKey || "";
    container.dataset.primaryEmotion = primaryEmotion || "";
    container.dataset.toneKey = tone || "";
    container.dataset.lang = language || "en";
  }

  function openModal(options = {}) {
    const overlay = ensureDOM();
    populateModal(overlay, options);
    overlay.classList.add("visible");
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

  function makeFileName() {
    return `1111-prophecy-${Date.now()}.png`;
  }

  function dataURLToBlob(dataUrl) {
    const [header, data] = dataUrl.split(",");
    const mimeMatch = header.match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : "image/png";
    const binary = atob(data);
    const len = binary.length;
    const buffer = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      buffer[i] = binary.charCodeAt(i);
    }
    return new Blob([buffer], { type: mime });
  }

  function downloadDataUrl(dataUrl, filename) {
    // Attempt standard download first
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Fallback for Instagram / Facebook / TikTok webview
    if (!a.download) {
      window.open(dataUrl, "_blank");
    }
  }

  async function handleFeedbackReaction(overlay, button) {
    const reaction = button?.dataset?.reaction;
    const container = overlay.querySelector(".share-modal-container");
    const themeKey = container?.dataset?.themeKey;
    const primaryEmotion = container?.dataset?.primaryEmotion;
    const toneKey = container?.dataset?.toneKey;
    const language = container?.dataset?.lang || "en";
    if (!reaction || !themeKey) {
      alert("Theme data is still loading. Please try again.");
      return;
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

  async function handleShare(overlay, button) {
    redirectToExternal("share");
    return;

    const container = overlay.querySelector(".share-modal-container");
    const cardUrl = container?.dataset?.cardUrl;
    const caption = container?.dataset?.caption || "";

    if (!cardUrl) {
      alert("Share card is still loading. Try again in a moment.");
      return;
    }

    const filename = makeFileName();
    const originalText = button?.textContent;
    if (button) {
      button.disabled = true;
      button.textContent = "Sharing…";
    }

    try {
      const shared = await tryNativeShare(cardUrl, caption, filename);
      if (!shared) {
        await shareFallback(cardUrl, overlay, filename);
      }
    } catch (err) {
      console.error("Native share failed:", err);
      await shareFallback(cardUrl, overlay, filename);
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = originalText || "Share";
      }
    }
  }

  async function tryNativeShare(cardUrl, caption, filename) {
    if (!navigator.share) return false;

    const blob = dataURLToBlob(cardUrl);
    const file = new File([blob], filename, { type: "image/png" });
    const payload = { files: [file], text: caption };

    if (navigator.canShare && !navigator.canShare({ files: [file] })) {
      return false;
    }

    await navigator.share(payload);
    return true;
  }

  async function shareFallback(cardUrl, overlay, filename) {
    // 1) Copy caption
    const textarea = overlay.querySelector(".share-modal-caption");
    if (textarea) {
      await copyCaptionFromTextarea(textarea);
    }

    // 2) Try to open the image itself
    try {
      // In many in-app browsers, window.open is blocked, so fall back to same-tab
      if (window.open) {
        const win = window.open(cardUrl, "_blank");
        if (!win) {
          window.location.href = cardUrl;
        }
      } else {
        window.location.href = cardUrl;
      }
    } catch (e) {
      // As a last resort, just try same-tab navigation
      window.location.href = cardUrl;
    }

    // 3) Let the user know what happened
    alert(
      "Caption copied. If the image doesn’t appear or download in this app, take a screenshot of the card."
    );
  }

  function handleSave(overlay, button) {
    redirectToExternal("save");
    return;

    const container = overlay.querySelector(".share-modal-container");
    const cardUrl = container?.dataset?.cardUrl;
    if (!cardUrl) {
      alert("Share card is still loading. Try again in a moment.");
      return;
    }
    const filename = makeFileName();
    const originalText = button?.textContent;
    if (button) {
      button.disabled = true;
      button.textContent = "Saving…";
    }
    downloadDataUrl(cardUrl, filename);
    // Helpful hint for environments that block downloads (e.g. Instagram webview)
    alert(
      "If this app doesn’t let the image download automatically, take a screenshot of the card. The caption button still works."
    );
    if (button) {
      setTimeout(() => {
        button.disabled = false;
        button.textContent = originalText || "Save to Gallery";
      }, 350);
    }
  }

  window.ShareModal = window.ShareModal || {};
  window.ShareModal.open = openModal;
  window.ShareModal.close = closeModal;

  window.openShareModal = function (options) {
    return window.ShareModal.open(options);
  };

  window.closeShareModal = function () {
    return window.ShareModal.close();
  };
})();

// Expose raw downloader for external redirect page
window.downloadCard = window.downloadCard || downloadDataUrl;

// (Share generator already exposed in shareCard.js)
