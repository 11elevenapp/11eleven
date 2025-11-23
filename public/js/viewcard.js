document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const base64 = params.get('img');

  if (!base64) {
    console.error("No base64 image detected.");
    return;
  }

  const img = document.getElementById("cardImage");
  img.src = "data:image/png;base64," + base64;

  // Download button
  document.getElementById("downloadBtn").addEventListener("click", () => {
    const a = document.createElement("a");
    a.href = img.src;
    a.download = "prophecy-card.png";
    a.click();
  });
});
