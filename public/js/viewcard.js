(function () {
  const params = new URLSearchParams(window.location.search);
  const filename = params.get("img");

  const img = document.getElementById("prophecyImg");

  if (!filename) {
    img.remove();
    document.body.innerHTML = "<h2 style='color:white;text-align:center;margin-top:50px;'>Missing card image.</h2>";
    return;
  }

  img.src = `/generated/${filename}`;

  img.onerror = () => {
    img.remove();
    document.body.innerHTML = "<h2 style='color:white;text-align:center;margin-top:50px;'>Could not load this prophecy card.</h2>";
  };
})();
