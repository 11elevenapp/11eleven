const params = new URLSearchParams(window.location.search);
const img = params.get("img");

const imgEl = document.getElementById("cardImage");

if (!img) {
    imgEl.alt = "Could not load this prophecy card.";
} else {
    imgEl.src = img;
}
