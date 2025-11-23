const base64 = sessionStorage.getItem("prophecyCard");

if (!base64) {
  document.getElementById("cardContainer").innerHTML =
    "<p class='error'>Could not load this prophecy card.</p>";
} else {
  const imgEl = document.getElementById("prophecyCard");
  imgEl.src = "data:image/png;base64," + base64;
}

document.getElementById("downloadBtn").onclick = () => {
  if (!base64) return;

  const a = document.createElement("a");
  a.href = "data:image/png;base64," + base64;
  a.download = "prophecy.png";
  a.click();
};
